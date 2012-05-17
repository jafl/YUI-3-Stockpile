"use strict";

var Y,

	mod_url = require('url');

exports.configure = function(y, app, mod_auth, argv)
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
