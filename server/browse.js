var YUI = require('yui').YUI;
YUI({
	useSync: true,
	gallery: 'gallery-2012.04.10-14-57'
}).use('gallery-funcprog', 'datatype-date', 'querystring-parse', 'json', 'escape', function(Y) {
"use strict";

var mod_fs   = require('fs'),
	mod_url  = require('url'),
	mod_util = require('util'),
	mod_hbs  = require('handlebars'),

	content_type = require('./content-type.js');

var bundle_code_tmpl = mod_hbs.compile(mod_fs.readFileSync('./views/code-bundle.hbs', 'utf-8'));

function compareStrings(a,b)
{
	a = a.toLowerCase();
	b = b.toLowerCase();
	return (a < b ? -1 : a > b ? +1 : 0);
}

function compareVersions(a,b)		// descending
{
	var count = Math.min(a.vers.length, b.vers.length);
	for (var i=0; i<count; i++)
	{
		var r = compareStrings(b.vers[i], a.vers[i]);
		if (r !== 0)
		{
			return r;
		}
	}

	return 0;
}

function scandir(path, callback)
{
	var job_count = 0, stats_map = {};

	function checkFinished()
	{
		if (job_count <= 0)
		{
			callback(null, stats_map);
		}
	}

	mod_fs.readdir(path, function(err, names)
	{
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

		Y.each(names, function(name)
		{
			var p = path + '/' + name;
			job_count++;
			mod_fs.stat(p, function(err, stats)
			{
				stats_map[ name ] = stats || {};
				job_count--;
				checkFinished();
			});
		});
	});
}

function buildDirectoryTree(root, path, callback)
{
	var job_count = 0, children = [];

	function checkFinished()
	{
		if (job_count <= 0)
		{
			callback(children);
		}
	}

	scandir(root + '/' + path, function(err, stats_map)
	{
		if (err)
		{
			callback(
			[{
				error: Y.Escape.html(err.message)
			}]);
			return;
		}

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

				job_count++;
				buildDirectoryTree(root, path + '/' + name, function(c)
				{
					node.children = c;
					job_count--;
					checkFinished();
				});
			}
			else if (stats.isFile() && name != 'notes')
			{
				children.push(node);
			}
		});

		checkFinished();
	});
}

function renderDirectoryTree(nodes)
{
	function renderNode(markup, node)
	{
		var name =
			node.error    ? node.error :
			node.children ? node.name :
			Y.Lang.sub('<a href="/browse?file={path}/{name}">{name}</a>',
			{
				path: node.path,
				name: node.name
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
}

function browseError(res, argv, query, err)
{
	res.render('browse-error.hbs',
	{
		title:    argv.title,
		err:      err.message.replace(argv.path, '').replace(/'\/+/, '\''),
		layout:   true
	});
}

function browseRoot(res, argv)
{
	var job_count = 0, ns = [], bundle = [];

	function checkFinished()
	{
		if (job_count <= 0)
		{
			res.render('browse-top.hbs',
			{
				title:  argv.title,
				ns:     ns.length ? ns : null,
				bundle: bundle.length? bundle : null,
				layout: true
			});
		}
	}

	mod_fs.readdir(argv.path, function(err, dirs)
	{
		if (err)
		{
			browseError(res, argv, query, err);
			return;
		}

		Y.each(dirs, function(dir)
		{
			var f = argv.path + '/' + dir + '/description';
			job_count++;
			mod_fs.readFile(f, 'utf-8', function(err, data)
			{
				data = Y.JSON.parse(data);
				(data.type == 'bundle' ? bundle : ns).push(
				{
					name: dir,
					desc: data.short
				});
				job_count--;
				checkFinished();
			});
		});
	});
}

function browseNamespace(res, argv, query)
{
	var path = argv.path + '/' + query.ns;
	var job_count = 0, modules = [], desc;

	function checkFinished()
	{
		if (job_count <= 0)
		{
			modules.sort(function(a,b)
			{
				return compareStrings(a.name, b.name);
			});

			res.render('browse-namespace.hbs',
			{
				title:   argv.title,
				ns:      query.ns,
				desc:    desc.long,
				modules: modules,
				layout:  query.layout
			});
		}
	}

	scandir(path, function(err, stats_map)
	{
		if (err)
		{
			browseError(res, argv, query, err);
			return;
		}

		Y.each(stats_map, function(stats, module)
		{
			if (!stats.isDirectory())
			{
				return;
			}

			job_count++;
			scandir(path + '/' + module, function(err, v_stats_map)
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

				versions.sort(compareVersions);

				modules.push(
				{
					name:  module,
					vers:  versions[0].vers.join('.'),
					date:  Y.DataType.Date.format(versions[0].date, { format: '%F %R' })
				});
				job_count--;
				checkFinished();
			});
		});

		job_count++;
		mod_fs.readFile(path + '/description', 'utf-8', function(err, data)
		{
			desc = Y.JSON.parse(data);
			job_count--;
			checkFinished();
		});
	});
}

function browseModule(res, argv, query)
{
	var path = argv.path + '/' + query.ns + '/' + query.m;
	var versions = [], desc;

	function finished()
	{
		versions.sort(compareVersions);

		res.render('browse-module.hbs',
		{
			title:    argv.title,
			ns:       query.ns,
			name:     query.m,
			desc:     desc.long,
			versions: versions,
			vers:     versions[0].name,
			layout:   query.layout
		});
	}

	scandir(path, function(err, stats_map)
	{
		if (err)
		{
			browseError(res, argv, query, err);
			return;
		}

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

		mod_fs.readFile(path + '/description', 'utf-8', function(err, data)
		{
			desc = (data && Y.JSON.parse(data)) || {};
			finished();
		});
	});
}

function browseModuleVersion(res, argv, query)
{
	var partial = query.ns + '/' + query.m + '/' + query.v;
	var path    = argv.path + '/' + partial;
	var job_count = 0, desc, notes, file_tree = '';

	function checkFinished()
	{
		if (job_count <= 0)
		{
			res.render('browse-module-version.hbs',
			{
				title:     argv.title,
				ns:        query.ns,
				name:      query.m,
				vers:      query.v,
				desc:      desc.long,
				author:    notes.author,
				notes:     notes.text,
				file_tree: file_tree,
				layout:    query.layout
			});
		}
	}

	job_count++;
	mod_fs.readFile(path + '/notes', 'utf-8', function(err, data)
	{
		notes = (data && Y.JSON.parse(data)) || {};
		job_count--;
		checkFinished();
	});

	job_count++;
	mod_fs.readFile(path + '/../description', 'utf-8', function(err, data)
	{
		desc = (data && Y.JSON.parse(data)) || {};
		job_count--;
		checkFinished();
	});

	job_count++;
	buildDirectoryTree(argv.path, partial, function(children)
	{
		file_tree = renderDirectoryTree(children);
		job_count--;
		checkFinished();
	});
}

function browseBundle(res, argv, query)
{
	var path = argv.path + '/' + query.b;
	var versions = [], desc;

	function finished()
	{
		versions.sort(compareVersions);

		var code = bundle_code_tmpl(
		{
			bundle:  query.b,
			version: versions[0].name
		});

		res.render('browse-bundle.hbs',
		{
			title:    argv.title,
			bundle:   query.b,
			desc:     desc.long,
			versions: versions,
			code:     code,
			layout:   query.layout
		});
	}

	scandir(path, function(err, stats_map)
	{
		if (err)
		{
			browseError(res, argv, query, err);
			return;
		}

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

		mod_fs.readFile(path + '/description', 'utf-8', function(err, data)
		{
			desc = (data && Y.JSON.parse(data)) || {};
			finished();
		});
	});
}

function browseBundleVersion(res, argv, query)
{
	var path = argv.path + '/' + query.b + '/' + query.v;
	var job_count = 0, modules = [], desc, notes;

	function checkFinished()
	{
		if (job_count <= 0)
		{
			modules.sort(compareStrings);

			var code = bundle_code_tmpl(
			{
				bundle:  query.b,
				version: query.v
			});

			res.render('browse-bundle-version.hbs',
			{
				title:   argv.title,
				bundle:  query.b,
				desc:    desc.long,
				vers:    query.v,
				author:  notes.author,
				notes:   notes.text,
				modules: modules,
				code:    code,
				layout:  query.layout
			});
		}
	}

	scandir(path, function(err, stats_map)
	{
		if (err)
		{
			browseError(res, argv, query, err);
			return;
		}

		Y.each(stats_map, function(stats, dir)
		{
			if (stats.isDirectory())
			{
				modules.push(dir);
			}
		});

		job_count++;
		mod_fs.readFile(path + '/notes', 'utf-8', function(err, data)
		{
			notes = (data && Y.JSON.parse(data)) || {};
			job_count--;
			checkFinished();
		});

		job_count++;
		mod_fs.readFile(path + '/../description', 'utf-8', function(err, data)
		{
			desc = (data && Y.JSON.parse(data)) || {};
			job_count--;
			checkFinished();
		});
	});
}

function browseBundleModule(res, argv, query)
{
	var partial = query.b + '/' + query.v + '/' + query.m;
	var path    = argv.path + '/' + partial;
	var job_count = 0, desc, notes, file_tree = '';

	function checkFinished()
	{
		if (job_count <= 0)
		{
			res.render('browse-bundle-module.hbs',
			{
				title:     argv.title,
				name:      query.m,
				vers:      query.v,
				desc:      desc.long,
				author:    notes.author,
				notes:     notes.text,
				file_tree: file_tree,
				layout:    query.layout
			});
		}
	}

	job_count++;
	mod_fs.readFile(path + '/../notes', 'utf-8', function(err, data)
	{
		notes = (data && Y.JSON.parse(data)) || {};
		job_count--;
		checkFinished();
	});

	job_count++;
	mod_fs.readFile(path + '/../../description', 'utf-8', function(err, data)
	{
		desc = (data && Y.JSON.parse(data)) || {};
		job_count--;
		checkFinished();
	});

	job_count++;
	buildDirectoryTree(argv.path, partial, function(children)
	{
		file_tree = renderDirectoryTree(children);
		job_count--;
		checkFinished();
	});
}

function showFile(res, argv, query)
{
	// security: don't use path.resolve

	var file = argv.path + '/' + query.file;
	var info = content_type.analyze(file);
	if (info.binary)
	{
		res.setHeader('Content-Type', info.type);
		mod_util.pump(mod_fs.createReadStream(file), res);
	}
	else
	{
		mod_fs.readFile(file, 'utf-8', function(err, data)
		{
			if (err)
			{
				browseError(res, argv, query, err);
			}
			else
			{
				res.send(data, { 'Content-Type': 'text/plain' });
			}
		});
	}
}

exports.configure = function(
	/* express */	app,
	/* map */		argv)
{
	app.get('/browse', function(req, res)
	{
		var query    = Y.QueryString.parse(mod_url.parse(req.url).query || '');
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

});
