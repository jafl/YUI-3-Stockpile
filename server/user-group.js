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

	app.get('/check-user', function(req, res)
	{
		var query = mod_url.parse(req.url, true).query;
		res.json(
		{
			exists: query.name && mod_auth.userExists(query.name) ? 1 : 0
		});
	});

	app.get('/check-group', function(req, res)
	{
		var query = mod_url.parse(req.url, true).query;
		res.json(
		{
			exists: query.name && mod_auth.groupExists(query.name) ? 1 : 0
		});
	});

	app.get('/create-group', function(req, res)
	{
		var query = mod_url.parse(req.url, true).query;
		res.json(
		{
			success: query.name && query.user && mod_auth.createGroup(query.name, query.user) ? 1 : 0
		});
	});
};
