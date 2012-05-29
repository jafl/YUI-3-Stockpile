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

# main

my %opt;
getopt('u', \%opt);

my $debug = $opt{d};

if (scalar(@ARGV) < 2)
{
	print "usage: $0 [-d] [-u user] stockpile_manager_url group\n";
	exit 1;
}

my $url   = shift;
my $group = shift;
my $user  = $opt{u};

my $ua = LWP::UserAgent->new();
if ($ua->can('ssl_opts'))
{
	$ua->ssl_opts( verify_hostnames => 0 );
}

$res = $ua->get($url.'/auth-info');
decode_response();

if ($res->{usersrc} eq 'whoami')
{
	print "ignoring -u option\n" if $user;

	chomp($user = `whoami`);
}
elsif ($res->{usertype} eq 'email' && $user !~ /.+\@.+\..+/)
{
	print "Your username must be an email address.\n";
	exit 1;
}

my $password;
if ($res->{needsPassword})
{
	print "Enter your password: ";
	ReadMode('noecho');
	chomp($password = <STDIN>);
	ReadMode('restore');
	print "\n";
}

$res = $ua->get($url.'/create-group?name='.$group.'&user='.$user.'&pass='.$password);
decode_response();
