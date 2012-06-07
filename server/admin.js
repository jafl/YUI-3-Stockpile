"use strict";

/* Copyright (c) 2012 Yahoo! Inc.  All rights reserved.
 *
 * The copyrights embodied in the content of this file are licensed by
 * Yahoo! Inc. under the BSD (revised) open source license.
 */

var Y,
	app,

	mod_fs      = require('fs'),
	mod_path    = require('path');

exports.init = function(y, mod_express, argv)
{
	Y = y;

	if (mod_path.existsSync(argv.key) && mod_path.existsSync(argv.cert))
	{
		app = mod_express.createServer(
		{
			key:  mod_fs.readFileSync(argv.key, 'utf8'),
			cert: mod_fs.readFileSync(argv.cert, 'utf8')
		});
		var type = 'https';
	}
	else
	{
		app      = mod_express.createServer();
		var type = 'http';
	}

	// Authentication

	var mod_auth = require('./auth.js');
	mod_auth.init(Y, argv);

	// modules

	require('./upload.js').configure(Y, app, argv);
	require('./user-group.js').configure(Y, app, argv);

	return { app: app, type: type, port: argv.adminport };
};
