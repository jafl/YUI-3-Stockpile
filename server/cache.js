"use strict";

exports.init = function(Y, argv)
{
	var size = parseInt(argv.cache, 10) || 500;
	Y.log('cache size: ' + size + 'MB', 'debug', 'combo');

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
		var now  = new Date().getTime();
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

	if (argv['cache-log'])
	{
		Y.log('dumping cache stats every ' + argv['cache-log-interval'] + ' hours', 'debug', 'combo');

		var cache_log_dump_prefix = argv['cache-log'] + '/dump-';

		var cache_log_dump_interval = parseFloat(argv['cache-log-interval']);
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
