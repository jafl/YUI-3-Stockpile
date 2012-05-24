#!/usr/bin/env node

/* Copyright (c) 2012 Yahoo! Inc.  All rights reserved.
 *
 * The copyrights embodied in the content of this file are licensed by
 * Yahoo! Inc. under the BSD (revised) open source license.
 */

var YUI = require('yui').YUI;
YUI({
	gallery: 'gallery-2012.04.26-15-49'
}).use(
	'json', 'parallel',
	'gallery-funcprog',
function(Y) {
"use strict";

var mod_fs      = require('fs'),
	mod_path    = require('path'),
	mod_url     = require('url'),
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

var debug = argv.debug || config.debug;
if (debug)
{
	require('long-stack-traces');
}

var app = mod_express.createServer();

function moduleName(s)
{
	var m = /([^\/]+?)(?:-(?:min|debug))?(\.(?:js|css))$/.exec(s);
	return (m && m.length && (m[1]+m[2]));
}

app.get('/combo', function(req, res)
{
	var query = mod_url.parse(req.url).query;
	if (!query)
	{
		res.end();
		return;
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
			file = mod_path.resolve(config.root || '', config.image[ file ])
			if (mod_path.existsSync(file))
			{
				mod_fs.createReadStream(file).pipe(res);
				return;
			}
		}

		mod_http.get(mod_url.parse(config.combo + query), function (r)
		{
			r.pipe(res);
		});
		return;
	}

	res.setHeader('Content-Type', query_info.type);
	res.setHeader('Cache-Control', 'no-cache');
	res.setHeader('Expires', 'Wed, 31 Dec 1969 16:00:00 GMT');

	var module = Y.partition(query.split('&'), function(m)
	{
		var name = moduleName(m);
		return (name && config.code[ name ]);
	});

	var module_list = module.rejects.join('&');

	var file_list = Y.reduce(module.matches, [], function(list, m)
	{
		Y.each(Y.Array(config.code[ moduleName(m) ]), function(f)
		{
			list.push(mod_path.resolve(config.root || '', f));
		});

		return list;
	});

	var tasks = new Y.Parallel();

	if (module_list)
	{
		var relay_url = config.combo + module_list;
		Y.log('relay: ' + relay_url, 'debug', 'combo-dev');

		mod_request(relay_url, tasks.add(function(error, response, body)
		{
			if (error || response.statusCode != 200)
			{
				Y.log(error.message + ' from ' + relay_url, 'warn', 'combo-dev');
			}
			else
			{
				res.write(body, 'utf8');
			}
		}));
	}

	if (file_list.length > 0)
	{
		Y.log('files: ' + file_list, 'debug', 'combo-dev');

		Y.each(file_list, function(f)
		{
			mod_fs.readFile(f, 'utf8', tasks.add(function(err, data)
			{
				if (err)
				{
					Y.log(err.message, 'warn', 'combo-dev');
				}
				else
				{
					res.write(data, 'utf8');
				}
			}));
		});
	}

	tasks.done(function()
	{
		res.end();
	});
});

Y.log('listening on port ' + config.port, 'debug', 'combo-dev');
app.listen(config.port);

if (argv.test)
{
	mod_fs.writeFileSync(argv.test, 'ready', 'utf8');
}

});
