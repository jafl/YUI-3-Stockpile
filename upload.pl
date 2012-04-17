#!/usr/bin/perl

use strict;
use LWP::UserAgent;

if (scalar(@ARGV) < 2)
{
	print "usage: $0 path_to_module stockpile_manager_url\n";
	exit 1;
}

my $path = shift;
my $url  = shift;

my $ua = LWP::UserAgent->new();

my $res = $ua->post(
	$url,
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
