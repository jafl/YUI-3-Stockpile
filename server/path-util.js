"use strict";

exports.invalidPath = function(s)
{
	return /[\0\s;]|\.\./.test(s);
};
