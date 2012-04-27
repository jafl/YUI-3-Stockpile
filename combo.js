#!/usr/bin/env node

/* Copyright (c) 2012 Yahoo! Inc.  All rights reserved.
 *
 * The copyrights embodied in the content of this file are licensed by
 * Yahoo! Inc. under the BSD (revised) open source license.
 */

var YUI = require('yui').YUI;
YUI({
	gallery: 'gallery-2012.04.26-15-49'
}).use('json', 'parallel', 'gallery-mru-cache', 'datatype-date', function(Y) {
"use strict";

var mod_fs       = require('fs'),
	mod_path     = require('path'),
	mod_url      = require('url'),
	mod_qs       = require('querystring'),
	mod_compress = require('gzip'),
	mod_express  = require('express'),

	content_type = require('./server/content-type.js');

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
	var defaults = Y.JSON.parse(mod_fs.readFileSync(argv.config));
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
	var response_cache    = require('./server/cache.js').init(argv);
	var cache_key_pending = {};
}

var app = mod_express.createServer();

var debug_re = /-debug\.js$/;

app.get('/combo', function(req, res)
{
	var query = mod_url.parse(req.url).query;
	if (!query)
	{
		res.end();
		return;
	}

	query = mod_qs.unescape(query);
	if (/[\0\s;]|\.\./.test(query))
	{
		Y.log('Blocked attempt to break sandbox: ' + query, 'debug', 'combo');
		res.end();
		return;
	}

	var query_info = content_type.analyze(query);
	if (!query_info)
	{
		Y.log('unknown request type: ' + query, 'debug', 'combo');
		res.end();
		return;
	}
	else if (query_info.binary)
	{
		headers(res);
		mod_fs.createReadStream(argv.path + '/' + query).pipe(res);		// security: don't use path.resolve
		return;
	}

	var module_list = query.split('&');

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

	var tasks = new Y.Parallel();
	Y.each(module_list, function(f)
	{
		if (mod_path.extname(mod_path.basename(f)))	// require a file suffix, so we ignore notes
		{
			loadFile(f, tasks.add(function(data)
			{
				return data;
			}));
		}
	});

	function loadFile(f, callback)
	{
		// security: don't use mod_path.resolve

		mod_fs.readFile(argv.path + '/' + f, 'utf-8', function(err, data)
		{
			if (err && debug_re.test(f))
			{
				Y.log(err.message + '; trying raw', 'debug', 'combo');
				loadFile(f.replace(debug_re, '.js'), callback);
			}
			else if (err && /\.js$/.test(f) && !/-min\.js$/.test(f))
			{
				Y.log(err.message + '; trying min', 'debug', 'combo');
				loadFile(f.replace('.js', '-min.js'), callback);
			}
			else if (err)
			{
				Y.log(err.message, 'warn', 'combo');
				callback('');
			}
			else
			{
				callback(data);
			}
		});
	}

	tasks.done(function(file_data)
	{
		var response_data = file_data.join('');
		mod_compress(response_data, function(err, result)
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
	});

	function headers(res)
	{
		res.setHeader('Content-Type', query_info.type);
		res.setHeader('Cache-Control', 'public,max-age=31536000');
		res.setHeader('Expires',
			Y.DataType.Date.format(new Date(new Date().getTime() + 365*24*3600000),
			{
				format: '%a, %d %b %Y %H:%M:%S GMT'
			}));
	}

	function send(req, res, data)
	{
		headers(res);

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
