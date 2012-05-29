"use strict";

/* Copyright (c) 2012 Yahoo! Inc.  All rights reserved.
 *
 * The copyrights embodied in the content of this file are licensed by
 * Yahoo! Inc. under the BSD (revised) open source license.
 */

var Y,

	mod_form = require('formidable'),
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

	app.post('/create-group', function(req, res)
	{
		var form = new mod_form.IncomingForm();
		form.parse(req, function(err, fields, files)
		{
			var success = 0;

			if (!fields.name)
			{
				res.json({ error: 'missing group name' });
			}
			else if (!fields.user)
			{
				res.json({ error: 'missing user name' });
			}
			else if (!mod_auth.checkPassword(fields.user, fields.pass))
			{
				res.json({ error: 'invalid password' });
			}
			else if (mod_auth.groupExists(fields.name))
			{
				res.json({ error: 'group already exists' });
			}
			else
			{
				mod_auth.addUserToGroup(fields.name, fields.user);
				res.json({ success: 1 });
			}
		});
	});

	app.post('/add-user-to-group', function(req, res)
	{
		var form = new mod_form.IncomingForm();
		form.parse(req, function(err, fields, files)
		{
			var success = 0;

			if (!fields.name)
			{
				res.json({ error: 'missing group name' });
			}
			else if (!fields.orig_user)
			{
				res.json({ error: 'missing initiating user name' });
			}
			else if (!fields.new_user)
			{
				res.json({ error: 'missing target user name' });
			}
			else if (!mod_auth.checkPassword(fields.orig_user, fields.pass))
			{
				res.json({ error: 'invalid password' });
			}
			else if (!mod_auth.groupExists(fields.name))
			{
				res.json({ error: 'group does not exist' });
			}
			else if (!mod_auth.userInGroup(fields.orig_user, fields.name))
			{
				res.json({ error: 'initiating user is not in group' });
			}
			else
			{
				mod_auth.addUserToGroup(fields.name, fields.new_user);
				res.json({ success: 1 });
			}
		});
	});
};
