"use strict";

/* Copyright (c) 2012 Yahoo! Inc.  All rights reserved.
 *
 * The copyrights embodied in the content of this file are licensed by
 * Yahoo! Inc. under the BSD (revised) open source license.
 */

var Y,

	mod_url = require('url'),
	mod_qs  = require('querystring'),

	mod_auth    = require('./auth.js'),
	browse_util = require('./browse-util.js'),

	trail_root =
	{
		url:  '/group',
		text: 'Groups'
	};

function showGroups(res, argv)
{
	var groups = mod_auth.getGroups();

	res.render('browse-groups.hbs',
	{
		title:  argv.title,
		trail:  [],
		curr:   trail_root.text,
		groups: groups.sort(Y.Sort.compareAsStringNoCase),
		layout: true
	});
}

function showGroupMembers(res, argv, query)
{
	var trail = [ trail_root ];

	var users = mod_auth.getUsersInGroup(query.name);
	if (!users)
	{
		browse_util.browseError(res, argv, trail, query.name, { message: query.name + ' does not exist.' });
		return;
	}

	res.render('browse-group-members.hbs',
	{
		title:  argv.title,
		trail:  trail,
		curr:   query.name,
		group:  query.name,
		any:    Y.Array.indexOf(users, mod_auth.getWildcardUser()) >= 0,
		users:  users.sort(Y.Sort.compareAsStringNoCase),
		layout: query.layout ? 'layouts/browse' : ''
	});
}

exports.configure = function(
	/* object */	y,
	/* express */	app,
	/* map */		argv)
{
	Y = y;

	app.get('/group', function(req, res)
	{
		var query    = mod_qs.parse(mod_url.parse(req.url).query || '');
		query.layout = !(query && query.layout == 'false');

		res.setHeader('Content-Type', 'text/html');

		if (query && query.name)
		{
			showGroupMembers(res, argv, query);
		}

		else
		{
			showGroups(res, argv);
		}
	});
};
