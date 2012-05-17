"use strict";

var Y,

	mod_fs      = require('fs'),
	mod_path    = require('path'),

	group_file,
	groups,
	mod_auth;

function updateGroupsFile()
{
	// sync since updates may arrive in rapid succession

	mod_fs.writeFileSync(group_file, Y.JSON.stringify(groups), 'utf-8');
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

	group_file = argv.path + '/groups.json';
	groups     = Y.JSON.parse(mod_fs.readFileSync(group_file), 'utf-8');
};

exports.userExists = function(user)
{
	return Y.some(groups, function(group)
	{
		return Y.Array.indexOf(group, user) >= 0;
	});
};

exports.groupExists = function(group)
{
	return groups.hasOwnProperty(group);
};

exports.userInGroup = function(user, group)
{
	group = groups[group];
	return group && Y.Array.indexOf(group, user) >= 0;
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
