#!/usr/bin/env node

/* Copyright (c) 2012 Yahoo! Inc.  All rights reserved.
 *
 * The copyrights embodied in the content of this file are licensed by
 * Yahoo! Inc. under the BSD (revised) open source license.
 */

var YUI = require('yui').YUI;
YUI({
	gallery: 'gallery-2012.08.15-20-00'
}).use(
	'json', 'parallel',
	'gallery-funcprog',
	'gallery-log-filter',
function(Y) {
"use strict";

var mod_fs      = require('fs'),
	mod_path    = require('path'),
	mod_url     = require('url'),
	mod_qs      = require('querystring'),
	mod_http    = require('http'),
	mod_express = require('express'),
	mod_request = require('request'),

	content_type = require('./server/content-type.js');

// options

var argv = require('optimist')
	.usage('usage: $0')
	.option('config',
	{
		demand:   true,
		describe: 'Path to configuration file'
	})
	.option('port',
	{
		describe: 'Port to listen on'
	})
	.option('debug',
	{
		boolean:  true,
		describe: 'Turn on debugging (causes leaks)'
	})
	.option('test',
	{
		describe: 'Name of file to create when initialization is finished'
	})
	.argv;

var config  = Y.JSON.parse(mod_fs.readFileSync(argv.config, 'utf8'));
config.port = argv.port || config.port || 8080;

var log_levels = ['info', 'warn', 'error'];
var debug      = argv.debug || config.debug;
if (debug)
{
	require('long-stack-traces');
	log_levels.push('debug');
}
Y.LogFilter.addLevelFilter(log_levels);

var app = mod_express();

function moduleName(s)
{
	var m = /([^\/]+?)(?:-(?:min|debug))?(\.(?:js|css))$/.exec(s);
	return (m && m.length && (m[1]+m[2]));
}

function combo(req, res, query)
{
	if (query.substr(0, 6) == 'combo~')
	{
		query   = query.substr(6);
		var cdn = true;
	}

	var query_info = content_type.analyze(Y, query);
	if (!query_info)
	{
		Y.log('unsupported request type: ' + query, 'debug', 'combo');
		res.end();
		return;
	}
	else if (query_info.binary)
	{
		var file = mod_path.basename(query);
		if (file && config.image[ file ])
		{
			file = mod_path.resolve(config.root || '', config.image[ file ]);
			if (mod_fs.existsSync(file))
			{
				Y.log('file: ' + file, 'debug', 'combo-dev');
				mod_fs.createReadStream(file).pipe(res);
				return;
			}
		}

		var url = config.combo + query;
		Y.log('relay: ' + url, 'debug', 'combo-dev');
		mod_http.get(mod_url.parse(url), function (r)
		{
			r.pipe(res);
		});
		return;
	}

	query = query.split(cdn ? '~' : '&');

	var module = Y.partition(query, function(m)
	{
		var name = moduleName(m);
		return (name && config.code[ name ]);
	});

	var file_list = Y.reduce(module.matches, [], function(list, m)
	{
		Y.each(Y.Array(config.code[ moduleName(m) ]), function(f, i)
		{
			list.push(
			{
				m: m,
				i: i,
				f: mod_path.resolve(config.root || '', f)
			});
		});

		return list;
	});

	var tasks   = new Y.Parallel(),
		results = {},
		code    = 200;

	Y.each(module.rejects, function(m)
	{
		var relay_url = config.combo + m;
		Y.log('relay: ' + relay_url, 'debug', 'combo-dev');

		mod_request(relay_url, {pool:false}, tasks.add(function(error, response, body)
		{
			if (error || response.statusCode != 200)
			{
				Y.log(((error && error.message) || response.statusCode) + ' from ' + relay_url, 'warn', 'combo-dev');
				code = 404;
			}
			else
			{
				results[m] = [body];
			}
		}));
	});

	Y.each(file_list, function(info)
	{
		Y.log('file: ' + info.f, 'debug', 'combo-dev');

		results[info.m] = [];
		mod_fs.readFile(info.f, 'utf8', tasks.add(function(err, data)
		{
			if (err)
			{
				Y.log(err.message, 'warn', 'combo-dev');
				code                    = 404;
				results[info.m][info.i] = '';
			}
			else
			{
				results[info.m][info.i] = data;
			}
		}));
	});

	tasks.done(function()
	{
		if (code != 200)
		{
			res.send(code);
			return;
		}

		res.setHeader('Content-Type', query_info.type);
		res.setHeader('Cache-Control', 'no-cache');
		res.setHeader('Expires', 'Wed, 31 Dec 1969 16:00:00 GMT');

		res.send(Y.reduce(query, '', function(s, q)
		{
			var r = results[q];
			if (r)
			{
				s += r.join('');
			}
			return s;
		}));
	});
}

app.get('/combo', function(req, res)
{
	var query = mod_url.parse(req.url).query;
	if (!query)
	{
		res.end();
		return;
	}

	combo(req, res, mod_qs.unescape(query));
});

app.get('/*', function(req, res)
{
	combo(req, res, req.params[0]);
});

Y.log('listening on http port ' + config.port, 'info', 'combo-dev');
app.listen(config.port);

if (argv.test)
{
	mod_fs.writeFileSync(argv.test, 'ready', 'utf8');
}

});
