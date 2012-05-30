"use strict";

/* Copyright (c) 2012 Yahoo! Inc.  All rights reserved.
 *
 * The copyrights embodied in the content of this file are licensed by
 * Yahoo! Inc. under the BSD (revised) open source license.
 */

var Y,

	mod_form = require('formidable'),
	mod_auth = require('./auth.js'),

	mod_mgr_util = require('./manager-util.js');

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
				return;
			}
			else if (!fields.user)
			{
				res.json({ error: 'missing user name' });
				return;
			}

			var user = mod_mgr_util.appendMailServer(fields.user);
			mod_auth.checkPassword(user, fields.pass, function(auth)
			{
				if (!auth)
				{
					res.json({ error: 'invalid password' });
				}
				else if (mod_auth.groupExists(fields.name))		// don't tell just anybody
				{
					res.json({ error: 'group already exists' });
				}
				else
				{
					mod_auth.addUserToGroup(fields.name, user);
					res.json({ success: 1 });
				}
			});
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
				return;
			}
			else if (!fields.orig_user)
			{
				res.json({ error: 'missing initiating user name' });
				return;
			}
			else if (!fields.new_user)
			{
				res.json({ error: 'missing target user name' });
				return;
			}

			var orig_user = mod_mgr_util.appendMailServer(fields.orig_user);
			var new_user  = mod_mgr_util.appendMailServer(fields.new_user);
			mod_auth.checkPassword(orig_user, fields.pass, function(auth)
			{
				if (!auth)
				{
					res.json({ error: 'invalid password' });
				}
				else if (!mod_auth.groupExists(fields.name))			// don't tell just anybody
				{
					res.json({ error: 'group does not exist' });
				}
				else if (!mod_auth.userInGroup(orig_user, fields.name))	// don't tell just anybody
				{
					res.json({ error: 'initiating user is not in group' });
				}
				else
				{
					mod_auth.addUserToGroup(fields.name, new_user);
					res.json({ success: 1 });
				}
			});
		});
	});

	app.post('/remove-user-from-group', function(req, res)
	{
		var form = new mod_form.IncomingForm();
		form.parse(req, function(err, fields, files)
		{
			var success = 0;

			if (!fields.name)
			{
				res.json({ error: 'missing group name' });
				return;
			}
			else if (!fields.orig_user)
			{
				res.json({ error: 'missing initiating user name' });
				return;
			}
			else if (!fields.del_user)
			{
				res.json({ error: 'missing target user name' });
				return;
			}

			var orig_user = mod_mgr_util.appendMailServer(fields.orig_user);
			var del_user  = mod_mgr_util.appendMailServer(fields.del_user);
			mod_auth.checkPassword(orig_user, fields.pass, function(auth)
			{
				if (!auth)
				{
					res.json({ error: 'invalid password' });
				}
				else if (!mod_auth.groupExists(fields.name))			// don't tell just anybody
				{
					res.json({ error: 'group does not exist' });
				}
				else if (!mod_auth.userInGroup(orig_user, fields.name))	// don't tell just anybody
				{
					res.json({ error: 'initiating user is not in group' });
				}
				else
				{
					var done = mod_auth.removeUserFromGroup(fields.name, del_user);
					res.json({ success: done ? 1 : 0 });
				}
			});
		});
	});
};
