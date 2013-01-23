"use strict";

/* Copyright (c) 2012 Yahoo! Inc.  All rights reserved.
 *
 * The copyrights embodied in the content of this file are licensed by
 * Yahoo! Inc. under the BSD (revised) open source license.
 */

var Y,

	mod_fs   = require('fs'),
	mod_path = require('path'),
	mod_url  = require('url'),
	mod_qs   = require('querystring'),

	browse_util  = require('./browse-util.js'),
	content_type = require('./content-type.js'),

	trail_root =
	{
		url:  '/browse',
		text: 'Browse'
	};

function compareVersions(a,b)		// descending
{
	var count = Math.min(a.vers.length, b.vers.length);
	for (var i=0; i<count; i++)
	{
		var r = Y.Sort.compareAsStringNoCase(b.vers[i], a.vers[i]);
		if (r !== 0)
		{
			return r;
		}
	}

	return b.vers.length - a.vers.length;
}

function browseRoot(res, argv)
{
	browse_util.scandir(argv.path, function(err, stats_map)
	{
		var trail = [];
		if (err)
		{
			browse_util.browseError(res, argv, trail, trail_root.text, err);
			return;
		}

		var ns = [], bundle = [], tasks = new Y.Parallel();
		Y.each(stats_map, function(stats, dir)
		{
			if (!stats.isDirectory())
			{
				return;
			}

			var f = argv.path + '/' + dir + '/info.json';
			mod_fs.readFile(f, 'utf8', tasks.add(function(err, data)
			{
				data = Y.JSON.parse(data);
				(data.type == 'bundle' ? bundle : ns).push(
				{
					name: dir,
					desc: data.short
				});
			}));
		});

		tasks.done(function()
		{
			res.render('browse-root.hbs',
			{
				title:  argv.title,
				trail:  trail,
				curr:   trail_root.text,
				ns:     ns.length ? ns : null,
				bundle: bundle.length? bundle : null,
				layout: true
			});
		});
	});
}

function browseNamespace(res, argv, query)
{
	var path = argv.path + '/' + query.ns;
	browse_util.scandir(path, function(err, stats_map)
	{
		var trail = [ trail_root ];
		if (err)
		{
			browse_util.browseError(res, argv, trail, query.ns, err);
			return;
		}

		var modules = [], desc, tasks = new Y.Parallel();
		Y.each(stats_map, function(stats, module)
		{
			if (!stats.isDirectory())
			{
				return;
			}

			browse_util.scandir(path + '/' + module, tasks.add(function(err, v_stats_map)
			{
				var versions = [];
				Y.each(v_stats_map, function(v_stats, vers)
				{
					if (v_stats.isDirectory())
					{
						versions.push(
						{
							vers: vers.split('.'),
							date: v_stats.ctime
						});
					}
				});

				if (versions.length > 0)
				{
					versions.sort(compareVersions);

					modules.push(
					{
						name:  module,
						vers:  versions[0].vers.join('.'),
						date:  Y.DataType.Date.format(versions[0].date, { format: '%F %R' })
					});
				}
			}));
		});

		mod_fs.readFile(path + '/info.json', 'utf8', tasks.add(function(err, data)
		{
			desc = Y.JSON.parse(data);
		}));

		tasks.done(function()
		{
			modules.sort(Y.bind(Y.Sort.compareKey, null, Y.Sort.compareAsStringNoCase, 'name'));

			res.render('browse-namespace.hbs',
			{
				title:   argv.title,
				trail:   trail,
				curr:    query.ns,
				ns:      query.ns,
				desc:    desc.long,
				group:   desc.group,
				modules: modules,
				layout:  query.layout ? 'layouts/browse' : ''
			});
		});
	});
}

function browseModule(res, argv, query)
{
	var path = argv.path + '/' + query.ns + '/' + query.m;
	browse_util.scandir(path, function(err, stats_map)
	{
		var trail =
		[
			trail_root,
			{ query: browse_util.breadcrumbQuery(query, ['m']), text: query.ns }
		];

		if (err)
		{
			browse_util.browseError(res, argv, trail, query.m, err);
			return;
		}

		var versions = [], desc, tasks = new Y.Parallel();
		Y.each(stats_map, function(stats, dir)
		{
			if (stats.isDirectory())
			{
				versions.push(
				{
					name:  dir,
					date:  Y.DataType.Date.format(stats.ctime, { format: '%F %R' }),
					vers:  dir.split('.')
				});
			}
		});

		mod_fs.readFile(path + '/info.json', 'utf8', tasks.add(function(err, data)
		{
			desc = (data && Y.JSON.parse(data)) || {};
		}));

		tasks.done(function()
		{
			versions.sort(compareVersions);

			res.render('browse-module.hbs',
			{
				title:    argv.title,
				trail:    trail,
				curr:     query.m,
				ns:       query.ns,
				name:     query.m,
				desc:     desc.long,
				versions: versions,
				vers:     versions.length ? versions[0].name : '',
				layout:   query.layout ? 'layouts/browse' : ''
			});
		});
	});
}

function browseModuleVersion(res, argv, query)
{
	var partial = query.ns + '/' + query.m + '/' + query.v;
	var path    = argv.path + '/' + partial;

	var desc, notes, file_tree = '', tasks = new Y.Parallel();

	mod_fs.readFile(path + '/info.json', 'utf8', tasks.add(function(err, data)
	{
		notes = (data && Y.JSON.parse(data)) || {};
	}));

	mod_fs.readFile(path + '/../info.json', 'utf8', tasks.add(function(err, data)
	{
		desc = (data && Y.JSON.parse(data)) || {};
	}));

	browse_util.buildDirectoryTree(argv.path, partial, tasks.add(function(children)
	{
		file_tree = browse_util.renderDirectoryTree(children, query);
	}));

	tasks.done(function()
	{
		var trail =
		[
			trail_root,
			{ query: browse_util.breadcrumbQuery(query, ['m','v']), text: query.ns },
			{ query: browse_util.breadcrumbQuery(query, ['v']), text: query.m }
		];

		res.render('browse-module-version.hbs',
		{
			title:     argv.title,
			trail:     trail,
			curr:      query.v,
			ns:        query.ns,
			name:      query.m,
			vers:      query.v,
			desc:      desc.long,
			author:    notes.author,
			notes:     notes.notes,
			file_tree: file_tree,
			layout:    query.layout ? 'layouts/browse' : ''
		});
	});
}

function browseBundle(res, argv, query)
{
	var path = argv.path + '/' + query.b;
	browse_util.scandir(path, function(err, stats_map)
	{
		var trail = [ trail_root ];
		if (err)
		{
			browse_util.browseError(res, argv, trail, query.b, err);
			return;
		}

		var versions = [], desc, tasks = new Y.Parallel();
		Y.each(stats_map, function(stats, dir)
		{
			if (stats.isDirectory())
			{
				versions.push(
				{
					name:  dir,
					date:  Y.DataType.Date.format(stats.ctime, { format: '%F %R' }),
					vers:  dir.split('.')
				});
			}
		});

		mod_fs.readFile(path + '/info.json', 'utf8', tasks.add(function(err, data)
		{
			desc = (data && Y.JSON.parse(data)) || {};
		}));

		tasks.done(function()
		{
			var code = '';
			if (versions.length > 0)
			{
				versions.sort(compareVersions);
			}

			res.render('browse-bundle.hbs',
			{
				title:     argv.title,
				trail:     trail,
				curr:      query.b,
				bundle:    query.b,
				desc:      desc.long,
				group:     desc.group,
				versions:  versions,
				code_vers: versions.length > 0 ? versions[0].name : '',
				layout:    query.layout ? 'layouts/browse' : ''
			});
		});
	});
}

function browseBundleVersion(res, argv, query)
{
	var path = argv.path + '/' + query.b + '/' + query.v;
	browse_util.scandir(path, function(err, stats_map)
	{
		var trail =
		[
			trail_root,
			{ query: browse_util.breadcrumbQuery(query, ['v']), text: query.b }
		];

		if (err)
		{
			browse_util.browseError(res, argv, trail, query.v, err);
			return;
		}

		var modules = [], desc, notes, tasks = new Y.Parallel();
		Y.each(stats_map, function(stats, dir)
		{
			if (stats.isDirectory())
			{
				modules.push(dir);
			}
		});

		mod_fs.readFile(path + '/info.json', 'utf8', tasks.add(function(err, data)
		{
			notes = (data && Y.JSON.parse(data)) || {};
		}));

		mod_fs.readFile(path + '/../info.json', 'utf8', tasks.add(function(err, data)
		{
			desc = (data && Y.JSON.parse(data)) || {};
		}));

		tasks.done(function()
		{
			modules.sort(Y.Sort.compareAsStringNoCase);

			res.render('browse-bundle-version.hbs',
			{
				title:     argv.title,
				trail:     trail,
				curr:      query.v,
				bundle:    query.b,
				desc:      desc.long,
				vers:      query.v,
				author:    notes.author,
				notes:     notes.notes,
				modules:   modules,
				code_vers: query.v,
				layout:    query.layout ? 'layouts/browse' : ''
			});
		});
	});
}

function browseBundleModule(res, argv, query)
{
	var partial = query.b + '/' + query.v + '/' + query.m;
	var path    = argv.path + '/' + partial;

	var desc, notes, file_tree = '', tasks = new Y.Parallel();

	mod_fs.readFile(path + '/../info.json', 'utf8', tasks.add(function(err, data)
	{
		notes = (data && Y.JSON.parse(data)) || {};
	}));

	mod_fs.readFile(path + '/../../info.json', 'utf8', tasks.add(function(err, data)
	{
		desc = (data && Y.JSON.parse(data)) || {};
	}));

	browse_util.buildDirectoryTree(argv.path, partial, tasks.add(function(children)
	{
		file_tree = browse_util.renderDirectoryTree(children, query);
	}));

	tasks.done(function()
	{
		var trail =
		[
			trail_root,
			{ query: browse_util.breadcrumbQuery(query, ['v','m']), text: query.b },
			{ query: browse_util.breadcrumbQuery(query, ['m']), text: query.v }
		];

		res.render('browse-bundle-module.hbs',
		{
			title:     argv.title,
			trail:     trail,
			curr:      query.m,
			name:      query.m,
			vers:      query.v,
			desc:      desc.long,
			author:    notes.author,
			notes:     notes.notes,
			file_tree: file_tree,
			layout:    query.layout ? 'layouts/browse' : ''
		});
	});
}

function showFile(res, argv, query)
{
	// security: don't use path.resolve

	var file = argv.path + '/' + query.file;
	var info = content_type.analyze(Y, file);
	if (info.binary)
	{
		res.setHeader('Content-Type', info.type);
		mod_fs.createReadStream(file).pipe(res);
	}
	else
	{
		mod_fs.readFile(file, 'utf8', function(err, data)
		{
			var trail = [ trail_root ];

			var t = mod_qs.parse(query.trail);
			if (t.ns)
			{
				trail.push({ query: browse_util.breadcrumbQuery(t, ['m','v']), text: t.ns });
				trail.push({ query: browse_util.breadcrumbQuery(t, ['v']), text: t.m });
				trail.push({ query: browse_util.breadcrumbQuery(t, []), text: t.v });
			}
			else if (t.b)
			{
				trail.push({ query: browse_util.breadcrumbQuery(t, ['v','m']), text: t.b });
				trail.push({ query: browse_util.breadcrumbQuery(t, ['m']), text: t.v });
				trail.push({ query: browse_util.breadcrumbQuery(t, []), text: t.m });
			}

			var curr = mod_path.basename(query.file);

			if (err)
			{
				browse_util.browseError(res, argv, trail, curr, err);
			}
			else if (query.raw == 'true')
			{
				res.send(data, { 'Content-Type': 'text/plain' });
			}
			else
			{
				res.render('browse-file.hbs',
				{
					title:   argv.title,
					trail:   trail,
					curr:    curr,
					toolbar: [ { url: argv.combo + query.file, text: 'View raw code' } ],
					type:    mod_path.extname(query.file).substr(1),
					content: data,
					layout:  query.layout ? 'layouts/browse' : ''
				});
			}
		});
	}
}

exports.configure = function(
	/* object */	y,
	/* express */	app,
	/* map */		argv)
{
	Y = y;

	app.get('/browse', function(req, res)
	{
		var query    = mod_qs.parse(mod_url.parse(req.url).query || '');
		query.layout = !(query && query.layout == 'false');

		res.setHeader('Content-Type', 'text/html');

		if (query && query.ns && query.m && query.v)
		{
			browseModuleVersion(res, argv, query);
		}
		else if (query && query.ns && query.m)
		{
			browseModule(res, argv, query);
		}
		else if (query && query.ns)
		{
			browseNamespace(res, argv, query);
		}

		else if (query && query.b && query.v && query.m)
		{
			browseBundleModule(res, argv, query);
		}
		else if (query && query.b && query.v)
		{
			browseBundleVersion(res, argv, query);
		}
		else if (query && query.b)
		{
			browseBundle(res, argv, query);
		}

		else if (query && query.file)
		{
			showFile(res, argv, query);
		}

		else
		{
			browseRoot(res, argv);
		}
	});
};
