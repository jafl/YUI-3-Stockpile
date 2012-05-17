"use strict";

var Y,

	mod_fs   = require('fs'),
	mod_path = require('path'),

	mod_mgr_util = require('./manager-util.js'),

	admins,
	group_file,
	groups,
	mod_auth;

function updateGroupsFile()
{
	// sync since updates may arrive in rapid succession

	mod_fs.writeFileSync(group_file, Y.JSON.stringify(groups), 'utf8');
}

exports.init = function(y, argv)
{
	Y = y;

	var auth_path = mod_path.resolve(__dirname, 'auth/' + argv.auth + '.js');
	if (mod_path.existsSync(auth_path))
	{
		mod_auth = require(auth_path);
	}
	else
	{
		mod_auth = require(argv.auth);
	}
	mod_auth.init(argv);

	if (mod_auth.use_whoami && !argv.mailserver)
	{
		console.error('auth=' + argv.auth + ' requires mailserver configuration');
		process.exit(1);
	}

	Y.mix(exports, mod_auth);

	admins     = argv.admins;
	group_file = argv.path + '/groups.json';
	groups     = Y.JSON.parse(mod_fs.readFileSync(group_file), 'utf8');

	if (argv.mailserver)
	{
		admins = Y.map(admins, mod_mgr_util.appendMailServer);

		groups = Y.map(groups, function(users, group)
		{
			return Y.map(users, mod_mgr_util.appendMailServer);
		});
	}
};

exports.userExists = function(user)
{
	return Y.some(groups, function(users)
	{
		return Y.Array.indexOf(users, user) >= 0;
	});
};

exports.groupExists = function(group)
{
	return groups.hasOwnProperty(group);
};

exports.userInGroup = function(user, group)
{
	var users = groups[group];
	return Y.Array.indexOf(admins, user) >= 0 || (users && Y.Array.indexOf(users, user) >= 0);
};

exports.getUserGroups = function(user)
{
	if (Y.Array.indexOf(admins, user) >= 0)
	{
		var map = groups;
	}
	else
	{
		var map = Y.filter(groups, function(users)
		{
			return Y.Array.indexOf(users, user) >= 0;
		});
	}

	return Y.Object.keys(map);
};

exports.createGroup = function(group, user)
{
	if (!groups[group])
	{
		groups[group] = [ user ];
		updateGroupsFile();
		return true;
	}
	else
	{
		return false;
	}
};
