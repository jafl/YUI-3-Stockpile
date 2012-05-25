"use strict";

/* Copyright (c) 2012 Yahoo! Inc.  All rights reserved.
 *
 * The copyrights embodied in the content of this file are licensed by
 * Yahoo! Inc. under the BSD (revised) open source license.
 */

var module_version;

function insertVersion(m)
{
	var s  = /^sp-([^-]+)-([^\/]+)/.exec(m.path);
	if (s && s.length)
	{
		m.path = m.path.replace(s[0],
						s[1] + '/' + s[2] + '/' + module_version[s[0]]);
	}
}

exports.buildConfig = function(combo, module_vers, bundle_vers)
{
	module_version = module_vers;

	var config =
	{
		skin:
		{
			defaultSkin: 'ace'
		},
		groups:
		{
			bundle:
			{
				ext:       true,
				combine:   true,
				comboBase: combo,
				root:      'bundle/' + bundle_vers + '/',
				patterns:
				{
					'bundle-':      { },
					'lang/bundle-': { },
					'bundlecss-':   { type: 'css' }
				}
			},
			stockpile:
			{
				ext:       true,
				combine:   true,
				comboBase: combo,
				root:      '',
				patterns:
				{
					'sp-':      { configFn: insertVersion },
					'lang/sp-': { configFn: insertVersion },
					'spcss-':   { configFn: insertVersion, type: 'css' }
				}
			}
		}
	};
	return config;
};
