#!/usr/bin/env node

/* Copyright (c) 2012 Yahoo! Inc.  All rights reserved.
 *
 * The copyrights embodied in the content of this file are licensed by
 * Yahoo! Inc. under the BSD (revised) open source license.
 */

var module_version =
{
	'sp-ns-foo':  '1.0.f',
	'sp-ns-blah': '2.0.b'
};

YUI_config = require('./test-config.js').buildConfig('http://localhost:8666/combo?', module_version, '2.0.z');

YUI = require('yui').YUI;

YUI().use('sp-ns-blah', 'bundle-baz', function(Y) {
"use strict";

	if (Y.sp_ns_foo  != '1.0' ||
		Y.sp_ns_blah != '2.0' ||
		Y.bundle_baz != '2.0')
	{
		console.log('FAIL combo: foo %s; blah %s; baz %s',
					Y.sp_ns_foo, Y.sp_ns_blah, Y.bundle_baz);
		process.exit(1);
	}

});
