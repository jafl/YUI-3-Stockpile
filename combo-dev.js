#!/usr/bin/env node

/* Copyright (c) 2012 Yahoo! Inc.  All rights reserved.
 *
 * The copyrights embodied in the content of this file are licensed by
 * Yahoo! Inc. under the BSD (revised) open source license.
 */

var YUI = require('yui').YUI;
YUI({
	gallery: 'gallery-2012.03.23-18-00'
}).use('json', 'gallery-funcprog', 'oop', function(Y)
{

var fs      = require('fs'),
	path    = require('path'),
	url     = require('url'),
	util    = require('util'),
	http    = require('http'),
	express = require('express'),

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
	.argv;

var config  = Y.JSON.parse(fs.readFileSync(argv.config));
config.port = argv.port || config.port;

var debug = argv.debug || config.debug;
if (debug)
{
	require('long-stack-traces');
}

var app = express.createServer();

function moduleName(s)
{
	var m = /([^\/]+?)(?:-(?:min|debug))?(\.(?:js|css))$/.exec(s);
	return (m && m.length && (m[1]+m[2]));
}

app.get('/combo', function(req, res)
{
	var query = url.parse(req.url).query;
	if (!query)
	{
		res.end();
		return;
	}

	var query_info = content_type.analyze(query);
	if (!query_info)
	{
		Y.log('unsupported request type: ' + query, 'debug', 'combo');
		res.end();
		return;
	}
	else if (query_info.binary)
	{
		var file = path.basename(query);
		if (file && config.image[ file ])
		{
			file = path.resolve(config.root || '', config.image[ file ])
			if (path.existsSync(file))
			{
				util.pump(fs.createReadStream(file), res);
				return;
			}
		}

		http.get(url.parse(config.combo + query), function (r)
		{
			util.pump(r, res);
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

	var file_list = Y.map(module.matches, function(m)
	{
		return path.resolve(config.root || '', config.code[ moduleName(m) ]);
	});

	var file_index  = 0,
		files_done  = true,
		relay_done  = true;

	if (module_list)
	{
		relay_done     = false;
		var relay_url  = config.combo + module_list,
			relay_data = [];

		Y.log('relay: ' + relay_url, 'debug', 'combo-dev');

		http.get(url.parse(relay_url), function (r)
		{
			r.on('data', function(data)
			{
				relay_data.push(data);
			});

			r.on('end', function()
			{
				res.write(relay_data.join(''), 'utf-8');

				relay_done = true;
				checkFinished();
			});
		})
		.on('error', function(err)
		{
			Y.log(err.message + ' from ' + relay_url, 'warn', 'combo-dev');
			relay_done = true;
			checkFinished();
		});
	}

	if (file_list.length > 0)
	{
		Y.log('files: ' + file_list, 'debug', 'combo-dev');

		files_done = false;
		sendFile(file_list[0]);
	}

	checkFinished();

	function sendFile(f)
	{
		fs.readFile(f, 'utf-8', function(err, data)
		{
			if (err)
			{
				Y.log(err.message, 'warn', 'combo-dev');
			}
			else
			{
				res.write(data, 'utf-8');
			}

			file_index++;
			if (file_index >= file_list.length)
			{
				files_done = true;
				checkFinished();
			}
			else
			{
				sendFile(file_list[file_index]);
			}
		});
	}

	function checkFinished()
	{
		if (files_done && relay_done)
		{
			res.end();
		}
	}
});

Y.log('listening on port ' + config.port, 'debug', 'combo-dev');
app.listen(config.port);

});
