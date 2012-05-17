// Only allow two users.
// Manager listens only on localhost (127.0.0.1).

exports.init = function(argv)
{
	if (argv.address != 'localhost' && argv.address != '127.0.0.1')
	{
		console.error('auth=testing requires manager address to be localhost (127.0.0.1)');
		process.exit(1);
	}
};

exports.use_whoami    = false;
exports.need_password = true;

exports.checkPassword = function(user, pass)
{
	return (user == 'foo' && pass == 'bar') ||
		   (user == 'baz' && pass == 'spaz');
};
