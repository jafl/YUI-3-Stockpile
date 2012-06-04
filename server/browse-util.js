"use strict";

/* Copyright (c) 2012 Yahoo! Inc.  All rights reserved.
 *
 * The copyrights embodied in the content of this file are licensed by
 * Yahoo! Inc. under the BSD (revised) open source license.
 */

var Y,

	mod_fs = require('fs'),
	mod_qs = require('querystring');

exports.scandir = function(path, callback)
{
	mod_fs.readdir(path, function(err, names)
	{
		var stats_map = {};
		if (err)
		{
			callback(err, stats_map);
			return;
		}
		else if (names.length === 0)
		{
			callback(null, stats_map);
			return;
		}

		var tasks = new Y.Parallel();
		Y.each(names, function(name)
		{
			var p = path + '/' + name;
			mod_fs.stat(p, tasks.add(function(err, stats)
			{
				if (!err)
				{
					stats_map[ name ] = stats;
				}
			}));
		});

		tasks.done(function()
		{
			callback(null, stats_map);
		});
	});
};

exports.buildDirectoryTree = function(root, path, callback)
{
	exports.scandir(root + '/' + path, function(err, stats_map)
	{
		if (err)
		{
			callback(
			[{
				error: Y.Escape.html(err.message)
			}]);
			return;
		}

		var children = [],
			tasks    = new Y.Parallel();
		Y.each(stats_map, function(stats, name)
		{
			var node =
			{
				name: name,
				path: path
			};

			if (stats.isDirectory())
			{
				children.push(node);

				exports.buildDirectoryTree(root, path + '/' + name, tasks.add(function(c)
				{
					node.children = c;
				}));
			}
			else if (stats.isFile() && name != 'info.json')
			{
				children.push(node);
			}
		});

		tasks.done(function()
		{
			callback(children);
		});
	});
};

exports.renderDirectoryTree = function(nodes, back)
{
	function renderNode(markup, node)
	{
		var name =
			node.error    ? node.error :
			node.children ? node.name :
			Y.Lang.sub('<a href="/browse?file={path}/{name}&amp;back={back}">{name}</a>',
			{
				path: node.path,
				name: node.name,
				back: mod_qs.escape(back)
			});

		return markup + Y.Lang.sub('<li class="{c}">{name}{children}</li>',
		{
			name:     name,
			c:        node.error ? 'error' : node.children ? 'directory' : 'file',
			children: node.children && node.children.length ? Y.reduce(node.children, '<ul>', renderNode) + '</ul>' : ''
		});
	}

	var markup = Y.reduce(nodes, '', renderNode);
	if (markup)
	{
		markup = '<ul>' + markup + '</ul>';
	}
	return markup;
};

exports.breadcrumbQuery = function(query, exclude)
{
	return mod_qs.stringify(Y.clone(query, true, function(value, key)
	{
		return (Y.Array.indexOf(exclude, key) == -1 && key != 'layout');
	}));
};

exports.browseError = function(res, argv, trail, curr, err)
{
	res.render('browse-error.hbs',
	{
		title:    argv.title,
		trail:    trail,
		curr:     curr,
		err:      err.message.replace(argv.path, '').replace(/'\/+/, '\''),
		layout:   true
	});
};

exports.init = function(
	/* object */ y)
{
	Y = y;
};
