#!/usr/bin/env node

/* Copyright (c) 2012 Yahoo! Inc.  All rights reserved.
 *
 * The copyrights embodied in the content of this file are licensed by
 * Yahoo! Inc. under the BSD (revised) open source license.
 */

var YUI = require('yui').YUI;
YUI({
	gallery: 'gallery-2012.03.23-18-00'
}).use('json', 'gallery-mru-cache', 'datatype-date', function(Y)
{

var fs          = require('fs'),
	path        = require('path'),
	url         = require('url'),
	querystring = require('querystring'),
	compress    = require('gzip'),
	express     = require('express');

// options

var optimist = require('optimist');

var argv = optimist
	.option('config',
	{
		default:  '/usr/share/yui3-stockpile/combo.json',
		describe: 'Path to configuration file'
	})
	.argv;

try
{
	var defaults = Y.JSON.parse(fs.readFileSync(argv.config));
}
catch (e)
{
	defaults = {};
}

var argv = optimist
	.usage('usage: $0')
	.option('path',
	{
		default:  defaults.path || '/var/yui3-stockpile',
		describe: 'Path to repository'
	})
	.option('port',
	{
		default:  defaults.port || 80,
		describe: 'Port to listen on'
	})
	.option('cache',
	{
		default:  defaults.cache,
		describe: 'Cache size in MB (default 500)'
	})
	.option('cache-log',
	{
		default:  defaults['cache-log'] || '/var/log/yui3-stockpile',
		describe: 'Cache size in MB (default 500)'
	})
	.option('cache-log-interval',
	{
		default:  defaults['cache-log-interval'] || 1,
		describe: 'Cache size in MB (default 500)'
	})
	.option('debug',
	{
		boolean:  true,
		default:  defaults.debug,
		describe: 'Turn on debugging (crashes when receive request from combo-dev.js)'
	})
	.argv;

var debug = argv.debug;
if (debug)
{
	require('long-stack-traces');
}

if (argv.cache)
{
	var size = parseInt(argv.cache, 10) || 500;
	Y.log('cache size: ' + size + 'MB', 'debug', 'combo');

	function cache_metric(value)
	{
		return value.raw.length + value.gzip.length;
	}

	var response_cache = new Y.MRUCache(
	{
		metric: cache_metric,
		limit: size * Math.pow(2, 20),
		stats: function(key, value, stats)
		{
			stats.size = cache_metric(value);
		}
	});

	function scheduleCacheLogDump()
	{
		var now  = new Date().getTime();
		var next = new Date(now + cache_log_dump_interval*3600000);
		if (cache_log_dump_interval > 1)
		{
			next.setMinutes(0);
			next.setSeconds(0);
		}

		Y.later(next.getTime() - now, null, function()
		{
			scheduleCacheLogDump();

			fs.writeFile(
				cache_log_dump_prefix +
					Y.DataType.Date.format(next, { format: cache_log_dump_format }),
				Y.JSON.stringify(response_cache.dumpStats(), null, 2));
		});
	}

	if (argv['cache-log'])
	{
		Y.log('dumping cache stats every ' + argv['cache-log-interval'] + ' hours', 'debug', 'combo');

		var cache_log_dump_prefix = argv['cache-log'] + '/dump-';

		var cache_log_dump_interval = parseFloat(argv['cache-log-interval']);
		var cache_log_dump_format   = '%Y-%m-%d-%H-%M';
		if (cache_log_dump_interval >= 1)
		{
			cache_log_dump_interval = Math.round(cache_log_dump_interval);
			cache_log_dump_format   = '%Y-%m-%d-%H';
		}

		scheduleCacheLogDump();
	}

	var cache_key_pending = {};
}

var app = express.createServer();

var debug_re = /-debug\.js$/;

app.get('/combo', function(req, res)
{
	var query = querystring.unescape(url.parse(req.url).query);
	if (!query)
	{
		res.end();
		return;
	}
	else if (/[\0\s;]|\.\./.test(query))
	{
		Y.log('Blocked attempt to break sandbox: ' + query, 'debug', 'combo');
		res.end();
		return;
	}

	var module_list = query.split('&'), module_index = 0;

	var key       = module_list.slice(0).sort().join('&');	// sort to generate cache key
	var use_cache = response_cache && /-min\.js/.test(query);
	if (use_cache && cache_key_pending[key])
	{
		var h = Y.on('mru-cache-key-ready', function(e)
		{
			if (e.cacheKey == key)
			{
				h.detach();
				send(req, res, response_cache.get(key));
			}
		});
		return;
	}
	else if (use_cache)
	{
		var cached_data = response_cache.get(key);
		if (cached_data)
		{
			send(req, res, cached_data);
			return;
		}

		cache_key_pending[key] = true;
	}

	var response_data = [];
	loadFile(module_list[0]);

	function loadFile(f)
	{
		if (!path.extname(path.basename(f)))	// require a file suffix, so we ignore notes
		{
			module_index++;
			checkFinished();
			return;
		}

		fs.readFile(argv.path + '/' + f, 'utf-8', function(err, data)
		{
			if (err && debug_re.test(f))
			{
				Y.log(err.message + '; trying raw', 'debug', 'combo');
				loadFile(f.replace(debug_re, '.js'));
				return;
			}
			else if (err && /\.js$/.test(f) && !/-min\.js$/.test(f))
			{
				Y.log(err.message + '; trying min', 'debug', 'combo');
				loadFile(f.replace('.js', '-min.js'));
				return;
			}
			else if (err)
			{
				Y.log(err.message, 'warn', 'combo');
			}
			else
			{
				response_data.push(data);
			}

			module_index++;
			checkFinished();
		});
	}

	function checkFinished()
	{
		if (module_index >= module_list.length)
		{
			response_data = response_data.join('');
			compress(response_data, function(err, result)
			{
				var cache_data =
				{
					raw:  response_data,
					gzip: result
				};

				if (use_cache)
				{
					response_cache.put(key, cache_data);

					delete cache_key_pending[key];
					Y.fire('mru-cache-key-ready',
					{
						cacheKey: key
					});
				}

				send(req, res, cache_data);
			});
		}
		else
		{
			loadFile(module_list[module_index]);
		}
	}

	function send(req, res, data)
	{
		res.setHeader('Content-Type', /\.css/.test(query) ? 'text/css' : 'text/javascript');
		res.setHeader('Cache-Control', 'max-age=315360000');
		res.setHeader('Expires',
			Y.DataType.Date.format(new Date(new Date().getTime() + 10*365*24*3600000),
			{
				format: '%a, %d %b %Y %H:%M:%S GMT'
			}));

		var accept_encoding = req.headers['accept-encoding'];
		var send_compressed = (accept_encoding && accept_encoding.indexOf('gzip') >= 0);
		if (send_compressed)
		{
			res.setHeader('Content-Encoding', 'gzip');
		}
		res.send(send_compressed ? data.gzip : data.raw);
	}
});

Y.log('listening on port ' + argv.port, 'debug', 'combo');
app.listen(argv.port);

});
