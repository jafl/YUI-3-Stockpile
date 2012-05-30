"use strict";

/* Copyright (c) 2012 Yahoo! Inc.  All rights reserved.
 *
 * The copyrights embodied in the content of this file are licensed by
 * Yahoo! Inc. under the BSD (revised) open source license.
 */

// If you can log in, then you can upload.
// Manager listens only on localhost (127.0.0.1).
// Username must come from `whoami`, so disallow all web access
// 
// ssh tunneling can be used to provide access from other machines

exports.init = function(argv)
{
	if (argv.address != 'localhost' && argv.address != '127.0.0.1')
	{
		console.error('auth=localhost requires manager address to be localhost (127.0.0.1)');
		process.exit(1);
	}
};

exports.use_whoami     = true;
exports.needs_password = false;

exports.checkPassword = function(user, pass, callback)
{
	callback.call(this, true);
};
