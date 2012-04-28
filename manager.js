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
	'json', 'escape', 'parallel', 'datatype-date',
	'gallery-funcprog', 'gallery-sort-extras',
function(Y) {
"use strict";

var mod_fs      = require('fs'),
	mod_express = require('express'),
	mod_form    = require('formidable');

// options

var optimist = require('optimist');

var argv = optimist
	.option('config',
	{
		default:  '/usr/share/yui3-stockpile/manager.json',
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
	.option('combo',
	{
		demand:   true,
		default:  defaults.combo,
		describe: 'URL of combo handler'
	})
	.option('auth',
	{
		default:  defaults.auth || 'localhost',
		describe: 'Authentication method for uploading'
	})
	.option('address',
	{
		default:  defaults.address,
		describe: 'Network address to listen on (default: all)'
	})
	.option('port',
	{
		default:  defaults.port || 8080,
		describe: 'Port to listen on'
	})
	.option('title',
	{
		default:  defaults.title || 'YUI 3 Stockpile Manager',
		describe: 'Server name'
	})
	.option('debug',
	{
		boolean:  true,
		default:  defaults.debug,
		describe: 'Turn on debugging'
	})
	.argv;

var debug = argv.debug;
if (debug)
{
	require('long-stack-traces');
}

var mod_auth = require('./server/auth/' + argv.auth + '.js');
mod_auth.init(argv);

var app = mod_express.createServer();
app.use(mod_express.static(__dirname + '/client'));

require('./server/browse.js').configure(Y, app, argv);

app.post('/upload', function(req, res)
{
	var form = new mod_form.IncomingForm();
	form.parse(req, function(err, fields, files)
	{
		res.writeHead(200, {'content-type': 'text/plain'});
		res.write('received upload:\n\n');
		res.end(require('util').inspect({fields: fields, files: files}));

		Y.each(files, function(file)
		{
			mod_fs.unlink(file.path);
		});
	});
});

Y.log('listening on' + (argv.address ? ' address ' + argv.address + ',' : '') + ' port ' + argv.port, 'debug', 'manager');
app.listen(argv.port, argv.address);

});
