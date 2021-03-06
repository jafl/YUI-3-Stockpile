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

	mod_fs.exists(argv.path + '/' + path, function(exists)
	{
		if (exists)
		{
			error(path + ' already exists', res);
			return;
		}

		mod_fs.readFile(argv.path + '/' + (fields.ns || fields.bundle) + '/info.json', 'utf8', function(err, contents)
		{
			if (!err)
			{
				var info = Y.JSON.parse(contents);
				if (info.type == 'namespace' && !fields.ns)
				{
					error('You cannot upload a bundle to a namespace.', res);
					return;
				}
				else if (info.type == 'bundle' && !fields.bundle)
				{
					error('You cannot upload a namespace to a bundle.', res);
					return;
				}
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
				mod_fs.exists(path + '/' + data.module, tasks.add(function(exists)
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
	if (!mod_fs.existsSync(path))
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
		if (mod_fs.existsSync(path + '/' + data.module + '/' + data.version))
		{
			error('Somebody beat you to it!  Please try again with a different version.', res);
			return;
		}

		if (!createNsOrBundle(fields, path, 'namespace', res))
		{
			return;
		}

		path += '/' + data.module;
		if (!mod_fs.existsSync(path))
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
		if (mod_fs.existsSync(path + '/' + data.version))
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

function upload(argv, fields, files, res)
{
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
			mod_fs.unlink(file.path, function(err)
			{
				if (err)
				{
					console.log(err);
				}
			});
			return;
		}

		// copy, because
		// (1) rename doesn't work across filesystems
		// (2) we need to modify css image paths
		// (3) we need to extract dependencies from the js

		mod_fs.readFile(file.path, tasks.add(function(err, contents)
		{
			var p = data.path + '/' + path,
				d = mod_path.dirname(p);
			mod_mkdirp.sync(d, dir_perm);

			var info = mod_content_type.analyze(Y, path);
			if (info && info.type == 'text/javascript' && data.bundle)
			{
				var js = contents.toString(),
					m  = /requires\s*:\s*(\[[^\]]+\])/.exec(js);
				if (m && m.length)
				{
					var req = m[1],
						m   = /YUI\s*\.\s*add\s*\(\s*(['"][^'"]+['"])/.exec(js);
					if (m && m.length)
					{
						var mod       = m[1],
							info_file = data.path + '/info.json';
						mod_fs.readFile(info_file, 'utf8', tasks.add(function(err, contents)
						{
							var info = Y.JSON.parse(contents);
							if (!info.deps)
							{
								info.deps = {};
							}

							try
							{
								mod = Y.JSON.parse(mod.replace(/'/g, '"'));
								req = Y.JSON.parse(req.replace(/'/g, '"'));

								req = Y.filter(req, function(item)
								{
									return item.substr(0, data.bundle.length+1) == data.bundle + '-';
								});

								if (req.length > 0)
								{
									info.deps[ mod ] = req;
									mod_fs.writeFile(info_file, Y.JSON.stringify(info), 'utf8', tasks.add());
								}
							}
							catch (e)
							{
								// ignore it
							}
						}));
					}
				}
			}
			else if (info && info.type == 'text/css')
			{
				// use only relative path, to support both http and https

				var d1   = d.replace(argv.path, '').replace(/^\/+/, '');
				contents = contents.toString().replace(/url\s*\(\s*(['"]?)([^\)\/])/g, 'url($1' + d1 + '/$2');
			}

			if (argv.company && info && /text\/(javascript|css)/.test(info.type))
			{
				var copyright = Y.Lang.sub(argv.copyright,
				{
					company: argv.company,
					year:    new Date().getFullYear()
				});
				contents = copyright + '\n' + contents.toString();
			}

			mod_fs.writeFile(p, contents, tasks.add(function(err)
			{
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
			}
			else
			{
				upload(argv, fields, files, res);
			}

			Y.each(files, function(file, path)
			{
				mod_fs.unlink(file.path, function(err)
				{
					if (err)
					{
						console.log(err);
					}
				});
			});
		});
	});
};
