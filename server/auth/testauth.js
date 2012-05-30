"use strict";

/* Copyright (c) 2012 Yahoo! Inc.  All rights reserved.
 *
 * The copyrights embodied in the content of this file are licensed by
 * Yahoo! Inc. under the BSD (revised) open source license.
 */

// Only allows two users: foo/bar, baz/spaz
// Manager listens only on localhost (127.0.0.1).

exports.init = function(argv)
{
	if (argv.address != 'localhost' && argv.address != '127.0.0.1')
	{
		console.error('auth=testing requires manager address to be localhost (127.0.0.1)');
		process.exit(1);
	}
};

exports.use_whoami     = false;
exports.needs_password = true;

exports.checkPassword = function(user, pass, callback)
{
	callback.call(this,
		(/^foo@/.test(user) && pass == 'bar') ||
		(/^baz@/.test(user) && pass == 'spaz'));
};
