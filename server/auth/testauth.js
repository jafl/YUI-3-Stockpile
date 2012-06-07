"use strict";

/* Copyright (c) 2012 Yahoo! Inc.  All rights reserved.
 *
 * The copyrights embodied in the content of this file are licensed by
 * Yahoo! Inc. under the BSD (revised) open source license.
 */

// Only allows two users: foo/bar, baz/spaz
// Manager listens only on localhost (127.0.0.1).

var exec = require('child_process').exec;

exports.init = function(argv)
{
};

exports.use_whoami     = false;
exports.needs_password = true;

exports.checkPassword = function(user, pass, callback)
{
	var self = this;
	exec('perl ./test/testauth-pw.pl ' + user + ' ' + pass,	// ought to quote the user-provided arguments
	{
		timeout: 10000	// ms
	},
	function(error, stdout, stderr)
	{
		callback.call(self, stdout.toString() == 'yes');
	});
};
