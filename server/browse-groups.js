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
	browse_util = require('./browse-util.js');

function showGroupMembers(res, argv, query)
{
	res.render('browse-group-members.hbs',
	{
		title:  argv.title,
		group:  query.name,
		users:  mod_auth.getUsersInGroup(query.name).sort(),
		layout: query.layout
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
			res.redirect('/browse');
		}
	});
};
