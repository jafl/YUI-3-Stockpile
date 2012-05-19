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

sub get_string($$)
{
	my ($desc, $name) = @_;

	my $s = '';
	until ($s)
	{
		print "Enter $desc for $name: ";
		chomp($s = <STDIN>);
	}

	return $s;
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

my $user;
if ($res->{usersrc} eq 'whoami')
{
	chomp($user = `whoami`);
}
else
{
	$user = $opt{u};

	until ($user)
	{
		print "Enter your username: ";
		chomp($user = <STDIN>);

		if ($res->{usertype} eq 'email' && $user !~ /.+\@.+\..+/)
		{
			print "Your username must be an email address.\n";
			$user = '';
		}
	}
}

my $auth = 0;
until ($auth)
{
	my $password = '';
	if ($res->{needPassword})
	{
		until ($password)
		{
			print "Enter your password: ";
			ReadMode('noecho');
			chomp($password = <STDIN>);
			ReadMode('restore');
			print "\n";
		}
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

my ($group, $ns_b_short_desc, $ns_b_long_desc);
my $new_module = $res->{newModule};
if (scalar(@{$res->{groups}}) == 0)
{
	do
	{
		do
		{
			print "You are a new user.\nEnter the name of your new user group: ";
			chomp($group = <STDIN>);
		}
			until ($group);

		$res = ua->get($url.'/create-group', name => $group, user => $user);
		decode_response();
	}
		until ($res->{success});
}
elsif ($res->{newNsOrBundle})
{
	my $index = 0;
	if (scalar(@{$res->{groups}}) > 1)
	{
		print "\n";

		my $i = 0;
		foreach my $g (@{$res->{groups}})
		{
			$i++;
			printf('%5s', $i);
			print ') ',$g,"\n";
		}

		do
		{
			print "Select the group that should own ",($ns || $bundle),": ";
			chomp($index = <STDIN>);
			$index--;
		}
			until ($index >= 0 && $res->{groups}->[$index]);
	}
	$group = $res->{groups}->[$index];

	$ns_b_short_desc = get_string("a short description", $ns || $bundle);
	$ns_b_long_desc  = get_string("a long description ",  $ns || $bundle);
}

my ($module_short_desc, $module_long_desc);
if ($new_module && $module)
{
	$module_short_desc = get_string("a short description", $module);
	$module_long_desc  = get_string("a long description ",  $module);
}

my $notes = get_string("notes", "version $vers");

$res = $ua->post
(
	$url.'/upload',
	Content_Type => 'form-data',
	Content =>
	[
		token => $token,
		notes => $notes,
		group => $group,

		nsOrBundleShortDesc => $ns_b_short_desc,
		nsOrBundleLongDesc  => $ns_b_long_desc,

		moduleShortDesc => $module_short_desc,
		moduleLongDesc  => $module_long_desc
	]
);
decode_response();

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

$res = $ua->post
(
	$url.'/upload',
	Content_Type => 'form-data',
	Content =>
	[
		token => $token
	]
);
decode_response();