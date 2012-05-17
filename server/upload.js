"use strict";

var Y,

	mod_fs     = require('fs'),
	mod_path   = require('path'),
	mod_form   = require('formidable'),
	mod_crypto = require('crypto'),

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
		var md5 = mod_crypto.createHash('md5');
		md5.update(Math.random().toString());
		md5.update(Date.now().toString());
		var token = md5.digest('hex');
	}
		while (token_cache[token]);

	return token;
}

function preAuth(fields, argv, mod_auth, res)
{
	if (fields.ns && fields.module && fields.version)
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
			token:    token,
			usersrc:  mod_auth.use_whoami ? 'whoami' : 'arg',
			usertype: argv.mailserver ? 'name' : 'email',
			password: mod_auth.need_password
		});
	});
}

function auth(fields, data, argv, mod_auth, res)
{
	if (!fields.user)
	{
		error('missing user name', res);
		return;
	}
	else if (mod_auth.need_password && !fields.password)
	{
		error('missing password', res);
		return;
	}

	data.auth = mod_auth.checkPassword(fields.user, fields.password);

	if (data.auth)
	{
		data.user = fields.user;
		if (argv.mailserver)
		{
			data.user += '@' + argv.mailserver;
		}
	}

	res.json(
	{
		success: data.auth ? 1 : 0
	});
}

exports.configure = function(y, app, mod_auth, argv)
{
	Y = y;

	app.post('/upload', function(req, res)
	{
		var form = new mod_form.IncomingForm();
		form.parse(req, function(err, fields, files)
		{
			if (!fields.token)
			{
				preAuth(fields, argv, mod_auth, res);
				return;
			}

			var data = token_cache[ fields.token ];
			if (!data)
			{
				error('invalid token', res);
				return;
			}

			if (!data.auth)
			{
				auth(fields, data, argv, mod_auth, res);
				return;
			}
/*
			res.end(require('util').inspect({fields: fields, files: files}));

			Y.each(files, function(file)
			{
				mod_fs.unlink(file.path);
			});
*/
		});
	});
};
