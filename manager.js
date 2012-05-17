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

var mod_os      = require('os'),
	mod_fs      = require('fs'),
	mod_path    = require('path'),
	mod_express = require('express');

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
	var defaults = Y.JSON.parse(mod_fs.readFileSync(argv.config, 'utf-8'));
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
	.option('key',
	{
		default:  defaults.key || '/usr/share/yui3-stockpile/manager.key',
		describe: 'Private key for https'
	})
	.option('cert',
	{
		default:  defaults.cert || '/usr/share/yui3-stockpile/manager.crt',
		describe: 'Certificate for https'
	})
	.option('address',
	{
		default:  defaults.address,
		describe: 'Network address to listen on (default: all)'
	})
	.option('port',
	{
		default:  defaults.port || 80,
		describe: 'Port to listen on for public UI'
	})
	.option('adminport',
	{
		default:  defaults.adminport || 443,
		describe: 'Port to listen on for admin functions'
	})
	.option('admins',
	{
		demand:   true,
		default:  defaults.admins,
		describe: 'Comma-separated list of admin usernames (config file can use array)'
	})
	.option('mailserver',
	{
		default:  defaults.mailserver,
		describe: 'mail server for all users'
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

if (Y.Lang.isString(argv.admins))
{
	argv.admins = Y.Lang.trim(argv.admins).split(/\s*,\s*/);
}

var log_addr = argv.address || os.hostname();

var app = mod_express.createServer();
app.use(mod_express.static(__dirname + '/client'));

require('./server/browse.js').configure(Y, app, argv);

Y.log('browse on http://' + log_addr + ':' + argv.port + '/browse', 'debug', 'manager');
app.listen(argv.port, argv.address);

var admin = require('./server/admin.js').init(Y, mod_express, argv);

Y.log('admin on ' + admin.type + '://' + log_addr + ':' + admin.port, 'debug', 'manager');
admin.app.listen(admin.port, argv.address);

});
