"use strict";

/* Copyright (c) 2012 Yahoo! Inc.  All rights reserved.
 *
 * The copyrights embodied in the content of this file are licensed by
 * Yahoo! Inc. under the BSD (revised) open source license.
 */

exports.installFilter = function(Y, levels, filter)
{
	var orig_log = Y.config.logFn;
	Y.config.logFn = function(msg, cat, src)
	{
		if (levels && Y.Array.indexOf(levels, cat) == -1)
		{
			return;
		}

		if (filter && !filter.call(this, msg, cat, src))
		{
			return;
		}

		orig_log.apply(this, arguments);
	};
};
