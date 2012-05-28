"use strict";

/* Copyright (c) 2012 Yahoo! Inc.  All rights reserved.
 *
 * The copyrights embodied in the content of this file are licensed by
 * Yahoo! Inc. under the BSD (revised) open source license.
 */

var Y,

	mod_url  = require('url'),
	mod_auth = require('./auth.js');

exports.configure = function(y, app, argv)
{
	Y = y;

	app.get('/auth-info', function(req, res)
	{
		res.json(
		{
			usersrc:       mod_auth.use_whoami ? 'whoami' : 'arg',
			usertype:      argv.mailserver ? 'name' : 'email',
			needsPassword: mod_auth.needs_password
		});
	});

	app.get('/create-group', function(req, res)
	{
		var query   = mod_url.parse(req.url, true).query,
			success = 0;

		if (query.name && query.user &&
			mod_auth.checkPassword(query.user, query.pass))
		{
			mod_auth.addUserToGroup(query.name, query.user);
			success = 1;
		}

		res.json(
		{
			success: success
		});
	});
};
