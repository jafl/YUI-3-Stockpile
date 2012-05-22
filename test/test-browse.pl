#!/usr/bin/perl

use strict;
use LWP::UserAgent;

print "$0\n";

sub decode_response($)
{
	my ($res) = @_;

	die $res->as_string unless $res->is_success();
	return $res->decoded_content;
}

my $ua = LWP::UserAgent->new();

# home

my $res  = $ua->get('http://127.0.0.1:8668/browse');
my $html = decode_response($res);

die "missing link to ns, stopped" unless $html =~ m|<a href="/browse\?ns=ns">ns</a>|;
die "missing link to bundle, stopped" unless $html =~ m|<a href="/browse\?b=bundle">bundle</a>|;
