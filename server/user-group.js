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

		if (!query.name)
		{
			res.json({ error: 'missing group name' });
		}
		else if (!query.user)
		{
			res.json({ error: 'missing user name' });
		}
		else if (!mod_auth.checkPassword(query.user, query.pass))
		{
			res.json({ error: 'invalid password' });
		}
		else if (mod_auth.groupExists(query.name))
		{
			res.json({ error: 'group already exists' });
		}
		else
		{
			mod_auth.addUserToGroup(query.name, query.user);
			res.json({ success: 1 });
		}
	});
};
