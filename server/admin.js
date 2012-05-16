"use strict";

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
			key:  mod_fs.readFileSync(argv.key),
			cert: mod_fs.readFileSync(argv.cert)
		});
		var type = 'https';
	}
	else
	{
		app      = mod_express.createServer();
		var type = 'http';
	}

	// Authentication

	var auth_path = mod_path.resolve(__dirname, 'auth/' + argv.auth + '.js');
	if (mod_path.existsSync(auth_path))
	{
		var mod_auth = require(auth_path);
	}
	else
	{
		var mod_auth = require(argv.auth);
	}
	mod_auth.init(argv);

	// modules

	require('./upload.js').configure(Y, app, mod_auth, argv);

	return { app: app, type: type, port: argv.adminport, auth: mod_auth };
};
