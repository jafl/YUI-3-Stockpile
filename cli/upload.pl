#!/usr/bin/perl

use strict;
use Getopt::Std;
use Term::ReadKey;
use LWP::UserAgent;
use JSON;

my $res;
sub decode_response()
{
	if (!$res->is_success())
	{
		die $res->as_string;
	}

	$res = decode_json($res->decoded_content);

	if ($res->{error})
	{
		print $res->{error},"\n";
		exit 1;
	}
}

my %opt;
getopt('u', \%opt);

my $debug = $opt{d};

my $url = shift;

my $ns = '', my $module = '', my $bundle = '';
if (scalar(@ARGV) == 4)
{
	$ns     = shift;
	$module = shift;

	if ($ns =~ /-/)
	{
		print "namespace cannot contain hyphens\n";
		exit 1;
	}
}
elsif (scalar(@ARGV) == 3)
{
	$bundle = shift;
}
else
{
	print "usage: $0 [-d] [-u user] ",
			"stockpile_manager_url\n",
			"\t(namespace module | bundle) version build_directory",
			"\n";
	exit 1;
}

my $vers = shift;
my $path = shift;

if (! -d $path)
{
	print "build_directory must be a directory\n";
	exit 1;
}
elsif ($ns)
{
	my $root = $path.'/sp-'.$ns.'-'.$module;
	if (! -e $root.'.js' && ! -e $root.'-min.js')
	{
		print "build_directory must contain $root.js or $root-min.js\n";
		exit 1;
	}
}

my $ua = LWP::UserAgent->new();
if ($ua->can('ssl_opts'))
{
	$ua->ssl_opts( verify_hostnames => 0 );
}

if ($debug)
{
	$ua->add_handler('request_send',  sub { shift->dump; return });
	$ua->add_handler('response_done', sub { shift->dump; return });
}

$res = $ua->post
(
	$url.'/upload',
	Content_Type => 'form-data',
	Content =>
	[
		ns      => $ns,
		module  => $module,
		bundle  => $bundle,
		version => $vers
	]
);
decode_response();

my $token = $res->{token};

my $user, my $group;
if ($res->{usersrc} eq 'whoami')
{
	chomp($user = `whoami`);
}
else
{
	$user = $opt{u};

	while (!$user)
	{
		print "Enter your username: ";
		chomp($user = <STDIN>);

		if ($res->{usertype} eq 'email' && $user !~ /.+\@.+\..+/)
		{
			print "Your username must be an email address.\n";
			$user = '';
		}
	}

	$res = ua->get($url.'/check-user', name => $user);
	decode_response();
	if (!$res->{exists})
	{
		print "Since you are a new user, please confirm your username: ";
		chomp(my $confirm = <STDIN>);
		if ($confirm ne $user)
		{
			print "did not match\n";
			exit 1;
		}

		do
		{
			do
			{
				print "Enter the name of your new user group: ";
				chomp($group = <STDIN>);
			}
				while (!$group);

			$res = ua->get($url.'/create-group', name => $group, user => $user);
			decode_response();
		}
			while (!$res->{success});
	}
}

my $auth = 0;
do
{
	my $password = '';
	if ($res->{password})
	{
		do
		{
			print "Enter your password: ";
			ReadMode('noecho');
			chomp($password = <STDIN>);
			ReadMode('restore');
			print "\n";
		}
			until ($password);
	}

	$res = $ua->post
	(
		$url.'/upload',
		Content_Type => 'form-data',
		Content =>
		[
			token    => $token,
			user     => $user,
			password => $password
		]
	);
	decode_response();

	$auth = $res->{success};
}
	until ($auth);

=pod

my $res = $ua->post
(
	$url.'/upload',
	Content_Type => 'form-data',
	Content =>
	[
		var  => 'abc',
		file1 => [$path],
		file2 => [$path]
	]
);

if ($res->is_success())
{
	warn $res->content;
}
else
{
	warn $res->error_as_HTML;
}

=cut
