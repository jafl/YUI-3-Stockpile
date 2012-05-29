#!/usr/bin/perl

# Copyright (c) 2012 Yahoo! Inc.  All rights reserved.
#
# The copyrights embodied in the content of this file are licensed by
# Yahoo! Inc. under the BSD (revised) open source license.

use lib "./pm";		# during testing

use strict;
use Getopt::Std;
use Term::ReadKey;
use LWP::UserAgent;
use JSON;

# subroutines

my $res;
sub decode_response()
{
	die $res->as_string unless $res->is_success();

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

my ($ua, $url);
sub send_module($$$;$)
{
	my ($token, $path, $prefix, $files) = @_;

	my $send = 0;
	if (!$files)
	{
		$files = [ token => $token ];
		$send  = 1;
	}

	opendir(my $h, $path);
	for my $item (readdir($h))
	{
		next if $item =~ /^\./;

		my $p = $path.'/'.$item;
		my $k = $prefix.'/'.$item;
		if (-d $p)
		{
			send_module($token, $p, $k, $files);
		}
		else
		{
			push(@{$files}, $k, [$p]);
		}
	}

	if ($send)
	{
		$res = $ua->post
		(
			$url.'/upload',
			Content_Type => 'form-data',
			Content => $files
		);
		decode_response();
	}
}

# main

my %opt;
getopt('u', \%opt);

my $debug = $opt{d};

$url = shift;

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

# create HTTP object

$ua = LWP::UserAgent->new();
if ($ua->can('ssl_opts'))
{
	$ua->ssl_opts( verify_hostnames => 0 );
}

if ($debug)
{
	$ua->add_handler('request_send',  sub { shift->dump; return });
	$ua->add_handler('response_done', sub { shift->dump; return });
}

# pre-auth

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

# user

my $user;
if ($res->{usersrc} eq 'whoami')
{
	print "ignoring -u option\n" if $opt{u};

	chomp($user = `whoami`);
}
else
{
	$user = $opt{u};
	if ($user && $res->{usertype} eq 'email' && $user !~ /.+\@.+\..+/)
	{
		print "Your username must be an email address.\n";
		$user = '';
	}

	my $count = 0;
	until ($user)
	{
		$count++;
		die "patience exceeded, stopped" if $count > 5;

		print "Enter your username: ";
		chomp($user = <STDIN>);

		if ($res->{usertype} eq 'email' && $user !~ /.+\@.+\..+/)
		{
			print "Your username must be an email address.\n";
			$user = '';
		}
	}
}

# auth

my $auth = 0, my $need_pw = $res->{needsPassword}, my $pw_count = 0;
my $password = '';
until ($auth)
{
	$pw_count++;
	die "patience exceeded, stopped" if $pw_count > 5;

	$password = '';
	if ($need_pw)
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

# namespace/bundle info

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

		$res = $ua->post
		(
			$url.'/create-group',
			Content =>
			[
				name => $group,
				user => $user,
				pass => $password
			]
		);
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

# module info

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

# upload

if ($bundle)
{
	opendir(my $h, $path);
	for my $d (readdir($h))
	{
		next if $d =~ /^\./;
		send_module($token, $path.'/'.$d, $d);
	}
	closedir($h);
}
else	# namespace
{
	send_module($token, $path, '');
}

# done

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
