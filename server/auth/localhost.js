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

exports.need_password = false;

// for completeness; should never be called

exports.checkPassword = function(user, pass)
{
	return true;
};
