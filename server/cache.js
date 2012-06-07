"use strict";

/* Copyright (c) 2012 Yahoo! Inc.  All rights reserved.
 *
 * The copyrights embodied in the content of this file are licensed by
 * Yahoo! Inc. under the BSD (revised) open source license.
 */

var mod_fs = require('fs');

exports.create = function(Y, size, path, interval)
{
	var size = parseInt(size, 10) || 500;
	Y.log('cache size: ' + size + 'MB', 'info', 'combo');

	function cacheMetric(value)
	{
		return value.raw.length + value.gzip.length;
	}

	var response_cache = new Y.MRUCache(
	{
		metric: cacheMetric,
		limit:  size * Math.pow(2, 20),
		stats:  function(key, value, stats)
		{
			stats.size = cacheMetric(value);
		}
	});

	function scheduleCacheLogDump()
	{
		var now  = Date.now();
		var next = new Date(now + cache_log_dump_interval*3600000);
		if (cache_log_dump_interval > 1)
		{
			next.setMinutes(0);
			next.setSeconds(0);
		}

		Y.later(next.getTime() - now, null, function()
		{
			scheduleCacheLogDump();

			mod_fs.writeFile(
				cache_log_dump_prefix +
					Y.DataType.Date.format(next, { format: cache_log_dump_format }),
				Y.JSON.stringify(response_cache.dumpStats(), null, 2));
		});
	}

	if (path)
	{
		Y.log('dumping cache stats every ' + interval + ' hours', 'info', 'combo');

		var cache_log_dump_prefix = path + '/dump-';

		var cache_log_dump_interval = parseFloat(interval);
		var cache_log_dump_format   = '%Y-%m-%d-%H-%M';
		if (cache_log_dump_interval >= 1)
		{
			cache_log_dump_interval = Math.round(cache_log_dump_interval);
			cache_log_dump_format   = '%Y-%m-%d-%H';
		}

		scheduleCacheLogDump();
	}

	return response_cache;
};
