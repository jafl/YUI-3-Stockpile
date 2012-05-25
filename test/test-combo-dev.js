#!/usr/bin/env node

/* Copyright (c) 2012 Yahoo! Inc.  All rights reserved.
 *
 * The copyrights embodied in the content of this file are licensed by
 * Yahoo! Inc. under the BSD (revised) open source license.
 */

console.log('test-combo-dev.js');

var module_version =
{
	'sp-ns-foo':  '1.0.f',
	'sp-ns-blah': '1.0.b'
};

YUI_config = require('./test-config.js').buildConfig('http://localhost:8667/combo?', module_version, '1.0.z');

YUI = require('yui').YUI;

YUI().use('sp-ns-blah', 'bundle-bar', 'bundle-baz', function(Y) {
"use strict";

	if (Y.sp_ns_foo  != '1.0' ||
		Y.sp_ns_blah != '2.1' ||
		Y.bundle_bar != '1.1' ||
		Y.bundle_baz != '1.0')
	{
		console.log('FAIL combo-dev: foo %s; blah %s; bar %s; baz %s',
					Y.sp_ns_foo, Y.sp_ns_blah, Y.bundle_bar, Y.bundle_baz);
		process.exit(1);
	}

});
