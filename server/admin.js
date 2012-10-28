"use strict";

/* Copyright (c) 2012 Yahoo! Inc.  All rights reserved.
 *
 * The copyrights embodied in the content of this file are licensed by
 * Yahoo! Inc. under the BSD (revised) open source license.
 */

var Y,
	app,

	mod_fs = require('fs');

exports.init = function(y, mod_express, argv, log_addr)
{
	Y = y;

	app = mod_express();

	if (mod_fs.existsSync(argv.key) && mod_fs.existsSync(argv.cert))
	{
		var options =
		{
			key:  mod_fs.readFileSync(argv.key, 'utf8'),
			cert: mod_fs.readFileSync(argv.cert, 'utf8')
		};

		var type = 'https';
		require('https').createServer(options, app).listen(argv.adminport, argv.address);
	}
	else
	{
		var type = 'http';
		require('http').createServer(app).listen(argv.adminport, argv.address);
	}

	Y.log('admin on ' + type + '://' + log_addr + ':' + argv.adminport, 'info', 'manager');

	// Authentication

	var mod_auth = require('./auth.js');
	mod_auth.init(Y, argv);

	// modules

	require('./upload.js').configure(Y, app, argv);
	require('./user-group.js').configure(Y, app, argv);

	return { app: app, type: type, port: argv.adminport };
};
