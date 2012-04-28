"use strict";

// All the requested items must have the same type, so we take the first
// suffix that matches.

var type_map =
{
	'.js':   { type: 'text/javascript', binary: false },
	'.css':  { type: 'text/css',        binary: false },
	'.png':  { type: 'image/png',       binary: true  },
	'.jpeg': { type: 'image/jpeg',      binary: true  },
	'.jpg':  { type: 'image/jpeg',      binary: true  },
	'.gif':  { type: 'image/gif',       binary: true  }
};

exports.analyze = function(Y, query)
{
	return Y.find(type_map, function(value, key)
	{
		return (query.indexOf(key) >= 0);
	});
};
