"use strict";

/* Copyright (c) 2012 Yahoo! Inc.  All rights reserved.
 *
 * The copyrights embodied in the content of this file are licensed by
 * Yahoo! Inc. under the BSD (revised) open source license.
 */

var Y,

	mod_fs     = require('fs'),
	mod_path   = require('path'),
	mod_form   = require('formidable'),
	mod_mkdirp = require('mkdirp'),

	mod_auth         = require('./auth.js'),
	mod_mgr_util     = require('./manager-util.js'),
	mod_path_util    = require('./path-util.js'),
	mod_content_type = require('./content-type.js'),

	dir_perm = 493,	// 0755

	token_cache  = {},
	token_expire = 5 * 60 * 1000;	// 5 minutes (ms)

function error(msg, res)
{
	res.json({ error: msg });
}

function cullTokens()
{
	var dead = [],
		now  = Date.now();
	Y.each(token_cache, function(data, token)
	{
		if (now - data.ts > token_expire)
		{
			dead.push(token);
		}
	});

	Y.each(dead, function(token)
	{
		Y.log('culled token ' + token, 'debug', 'admin:upload');
		delete token_cache[token];
	});
}

function generateToken()
{
	cullTokens();

	do
	{
		var token = mod_mgr_util.generateToken();
	}
		while (token_cache[token]);

	Y.log('starting conversation: ' + token, 'debug', 'admin:upload');
	return token;
}

function preAuth(fields, argv, res)
{
	if (fields.ns && fields.bundle)
	{
		error('cannot specify both ns and bundle', res);
		return;
	}
	else if (fields.ns && fields.module && fields.version)
	{
		var path = fields.ns + '/' + fields.module + '/' + fields.version;
	}
	else if (fields.bundle && fields.version)
	{
		var path = fields.bundle + '/' + fields.version;
	}
	else
	{
		error('must specify either ns/module/version or bundle/version', res);
		return;
	}

	mod_path.exists(argv.path + '/' + path, function(exists)
	{
		if (exists)
		{
			error(path + ' already exists', res);
			return;
		}

		var token = generateToken();

		token_cache[token] =
		{
			ns:      fields.ns,
			module:  fields.module,
			bundle:  fields.bundle,
			version: fields.version,
			ts:      Date.now()
		};

		// requesting whoami is not secure, but it makes the cli interface nicer to use

		res.json(
		{
			token:         token,
			usersrc:       mod_auth.use_whoami ? 'whoami' : 'arg',
			usertype:      argv.mailserver ? 'name' : 'email',
			needsPassword: mod_auth.needs_password
		});
	});
}

function auth(fields, data, argv, res)
{
	if (!fields.user)
	{
		error('missing user name', res);
		return;
	}
	else if (mod_auth.needs_password && !fields.password)
	{
		error('missing password', res);
		return;
	}

	var user = mod_mgr_util.appendMailServer(fields.user);
	if (!/@/.test(user))
	{
		error('user name must resolve to an email address', res);
		return;
	}

	mod_auth.checkPassword(user, fields.password, function(auth)
	{
		data.auth = auth;

		var tasks = new Y.Parallel(), respond = true, new_ns_b = false, new_module = false;
		if (data.auth)
		{
			data.user = user;

			var path = argv.path + '/' + (data.ns || data.bundle);
			mod_fs.readFile(path + '/info.json', 'utf8', tasks.add(function(err, contents)
			{
				if (err)
				{
					new_ns_b = true;
				}
				else
				{
					var info = Y.JSON.parse(contents);
					if (!mod_auth.userInGroup(data.user, info.group))
					{
						data.auth = false;
						error('You do not have permissions to modify ' + (data.ns || data.bundle), res);
						respond = false;
					}
				}
			}));

			if (data.ns)
			{
				mod_path.exists(path + '/' + data.module, tasks.add(function(exists)
				{
					new_module = !exists;
				}));
			}
		}

		tasks.done(function()
		{
			if (respond)
			{
				res.json(
				{
					success:       data.auth ? 1 : 0,
					groups:        mod_auth.getUserGroups(data.user),
					newNsOrBundle: new_ns_b,
					newModule:     new_module
				});
			}
		});
	});
}

function createNsOrBundle(fields, path, type, res)
{
	if (!mod_path.existsSync(path))
	{
		if (!fields.group)
		{
			error('missing group', res);
			return false;
		}

		mod_fs.mkdirSync(path, dir_perm);
		mod_fs.writeFileSync(path + '/info.json', Y.JSON.stringify(
		{
			type:  type,
			short: fields.nsOrBundleShortDesc || '',
			long:  fields.nsOrBundleLongDesc  || '',
			group: fields.group
		}),
		'utf8');
	}

	return true;
}

function create(fields, data, argv, res)
{
	if (!fields.notes)
	{
		error('missing version notes', res);
		return;
	}
	else if (fields.group && !mod_auth.userInGroup(data.user, fields.group))
	{
		error('You are not a member of group ' + fields.group, res);
		return;
	}

	// sync to avoid race conditions

	if (data.ns)
	{
		var path = argv.path + '/' + data.ns;
		if (mod_path.existsSync(path + '/' + data.module + '/' + data.version))
		{
			error('Somebody beat you to it!  Please try again with a different version.', res);
			return;
		}

		if (!createNsOrBundle(fields, path, 'namespace', res))
		{
			return;
		}

		path += '/' + data.module;
		if (!mod_path.existsSync(path))
		{
			mod_fs.mkdirSync(path, dir_perm);
			mod_fs.writeFileSync(path + '/info.json', Y.JSON.stringify(
			{
				short: fields.moduleShortDesc || '',
				long:  fields.moduleLongDesc  || ''
			}),
			'utf8');
		}
	}
	else	// data.bundle
	{
		var path = argv.path + '/' + data.bundle;
		if (mod_path.existsSync(path + '/' + data.version))
		{
			error('Somebody beat you to it!  Please try again with a different version.', res);
			return;
		}

		if (!createNsOrBundle(fields, path, 'bundle', res))
		{
			return;
		}
	}

	path += '/' + data.version;
	mod_fs.mkdirSync(path, dir_perm);
	mod_fs.writeFileSync(path + '/info.json', Y.JSON.stringify(
	{
		notes:  fields.notes,
		author: data.user
	}),
	'utf8');

	data.path = path;

	res.json(
	{
		success: 1
	});
}

exports.configure = function(y, app, argv)
{
	Y = y;

	app.post('/upload', function(req, res)
	{
		var form = new mod_form.IncomingForm();
		form.parse(req, function(err, fields, files)
		{
			if (err)
			{
				error(err.message, res);
				return;
			}

			if (!fields.token)
			{
				preAuth(fields, argv, res);
				return;
			}

			var data = token_cache[ fields.token ];
			if (!data)
			{
				error('invalid or timed-out token', res);
				return;
			}
			data.ts = Date.now();

			if (!data.auth)
			{
				auth(fields, data, argv, res);
				return;
			}

			if (!data.path)
			{
				create(fields, data, argv, res);
				return;
			}

			if (argv.debug)
			{
				console.log(require('util').inspect({fields: fields, files: files}));
			}

			var tasks = new Y.Parallel(),
				count = 0;
			Y.each(files, function(file, path)
			{
				path = path.replace(/^\/+/, '');
				if (mod_path_util.invalidPath(path) || path == 'info.json')
				{
					Y.log('Blocked attempt to break sandbox: ' + path, 'debug', 'admin:upload');
					return;
				}

				// copy, because rename doesn't work across filesystems

				mod_fs.readFile(file.path, tasks.add(function(err, contents)
				{
					var p = data.path + '/' + path;
					mod_mkdirp.sync(mod_path.dirname(p), dir_perm);

					mod_fs.writeFile(p, contents, tasks.add(function(err)
					{
						mod_fs.unlink(file.path);
						count++;
					}));
				}));
			});

			tasks.done(function()
			{
				if (count === 0)
				{
					Y.log('finished conversation: ' + fields.token, 'debug', 'admin:upload');
					delete token_cache[ fields.token ];
					res.json({ done: 1 });
				}
				else
				{
					res.json({ success: 1 });
				}
			});
		});
	});
};
