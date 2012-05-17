var Y,

	mod_crypto = require('crypto'),

	argv;

exports.init = function(y, _argv)
{
	Y    = y;
	argv = _argv;
};

exports.appendMailServer = function(user)
{
	return argv.mailserver ? user + '@' + argv.mailserver : user;
};

exports.generateToken = function()
{
	var md5 = mod_crypto.createHash('md5');
	md5.update(Math.random().toString());
	md5.update(Date.now().toString());
	return md5.digest('hex');
};
