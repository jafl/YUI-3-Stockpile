#!/usr/bin/perl

# Copyright (c) 2012 Yahoo! Inc.  All rights reserved.
#
# The copyrights embodied in the content of this file are licensed by
# Yahoo! Inc. under the BSD (revised) open source license.

use strict;
use LWP::UserAgent;
use threads;

do './util.pl';

print "$0\n";

sub test()
{
	my $ua = LWP::UserAgent->new();

	# ns

	my $res  = $ua->get('http://127.0.0.1:8666/combo?ns/blah/2.0.b/sp-ns-blah-min.js');
	my $code = decode_response($res);
	die $code,"\nwrong data" unless
		$code eq slurp('./upload/blah2/sp-ns-blah-min.js');

	my $res  = $ua->get('http://127.0.0.1:8666/combo~ns/blah/2.0.b/sp-ns-blah-min.js');
	my $code = decode_response($res);
	die $code,"\nwrong data" unless
		$code eq slurp('./upload/blah2/sp-ns-blah-min.js');

	# bundle

	my $res  = $ua->get('http://127.0.0.1:8666/combo?bundle/1.0.z/bundle-baz/bundle-baz-min.js');
	my $code = decode_response($res);
	die $code,"\nwrong data" unless
		$code eq slurp('./upload/bundle1/bundle-baz/bundle-baz-min.js');

	my $res  = $ua->get('http://127.0.0.1:8666/combo~bundle/1.0.z/bundle-baz/bundle-baz-min.js');
	my $code = decode_response($res);
	die $code,"\nwrong data" unless
		$code eq slurp('./upload/bundle1/bundle-baz/bundle-baz-min.js');

	# combo

	my $res  = $ua->get('http://127.0.0.1:8666/combo?ns/foo/1.0.f/sp-ns-foo-min.js&bundle/2.0.z/bundle-baz/bundle-baz-min.js');
	my $code = decode_response($res);
	die $code,"\nwrong data" unless
		$code eq slurp('./upload/foo/sp-ns-foo-min.js')
				.slurp('./upload/bundle2/bundle-baz/bundle-baz-min.js');

	my $res  = $ua->get('http://127.0.0.1:8666/combo~ns/foo/1.0.f/sp-ns-foo-min.js~bundle/2.0.z/bundle-baz/bundle-baz-min.js');
	my $code = decode_response($res);
	die $code,"\nwrong data" unless
		$code eq slurp('./upload/foo/sp-ns-foo-min.js')
				.slurp('./upload/bundle2/bundle-baz/bundle-baz-min.js');

	# intra-bundle dependencies

	my $res  = $ua->get('http://127.0.0.1:8666/combo?bundle/3.0.z/bundle-bar/bundle-bar-min.js');
	my $code = decode_response($res);
	die $code,"\nwrong data" unless
		$code eq slurp('./upload/bundle3/bundle-bar/bundle-bar-min.js')
				.slurp('./upload/bundle3/bundle-baz/bundle-baz-min.js');

	# css

	my $res  = $ua->get('http://127.0.0.1:8666/combo?bundle/1.0.z/bundle-bar/assets/skins/sam/bundle-bar.css');
	my $code = decode_response($res);
	die $code,"\nwrong data" unless
		$code eq slurp('./upload/bundle1/bundle-bar/assets/skins/sam/bundle-bar.css');

	my $res  = $ua->get('http://127.0.0.1:8666/combo~bundle/1.0.z/bundle-bar/assets/skins/sam/bundle-bar.css');
	my $code = decode_response($res);
	die $code,"\nwrong data" unless
		$code eq slurp('./upload/bundle1/bundle-bar/assets/skins/sam/bundle-bar.css');

	my $res  = $ua->get('http://127.0.0.1:8666/combo?ns/foo/1.0.f/assets/skins/ace/sp-ns-foo.css&bundle/1.0.z/bundle-bar/assets/skins/sam/bundle-bar.css');
	my $code = decode_response($res);
	die $code,"\nwrong data" unless
		$code eq slurp('./upload-result/foo/1.0.f/sp-ns-foo.css')
				.slurp('./upload/bundle1/bundle-bar/assets/skins/sam/bundle-bar.css');

	my $res  = $ua->get('http://127.0.0.1:8666/combo~ns/foo/1.0.f/assets/skins/ace/sp-ns-foo.css~bundle/1.0.z/bundle-bar/assets/skins/sam/bundle-bar.css');
	my $code = decode_response($res);
	die $code,"\nwrong data" unless
		$code eq slurp('./upload-result/foo/1.0.f/sp-ns-foo.css')
				.slurp('./upload/bundle1/bundle-bar/assets/skins/sam/bundle-bar.css');

	# image

	my $res  = $ua->get('http://127.0.0.1:8666/combo?ns/foo/1.0.f/assets/skins/ace/warn.png');
	my $code = decode_response($res);
	die "binary data\nwrong data" unless
		$code eq slurp('./upload/foo/assets/skins/ace/warn.png');

	my $res  = $ua->get('http://127.0.0.1:8666/combo~ns/foo/1.0.f/assets/skins/ace/warn.png');
	my $code = decode_response($res);
	die "binary data\nwrong data" unless
		$code eq slurp('./upload/foo/assets/skins/ace/warn.png');

	# pdf - fail

	my $res  = $ua->get('http://127.0.0.1:8666/combo?ns/foo/1.0.f/assets/skins/ace/invalid.pdf');
	my $code = decode_response($res);
	die $code,"\nwrong data" unless
		$code eq '';

	# invalid paths - fail

	my $res  = $ua->get("http://127.0.0.1:8666/combo?ns/foo/1.0.f/assets/skins/ace/\0warn.png");
	my $code = decode_response($res);
	die $code,"\nwrong data" unless
		$code eq '';

	my $res  = $ua->get('http://127.0.0.1:8666/combo?ns/foo/1.0.f/assets/skins/ace/ warn.png');
	my $code = decode_response($res);
	die $code,"\nwrong data" unless
		$code eq '';

	my $res  = $ua->get('http://127.0.0.1:8666/combo?ns/foo/1.0.f/assets/skins/ace/;warn.png');
	my $code = decode_response($res);
	die $code,"\nwrong data" unless
		$code eq '';

	my $res  = $ua->get('http://127.0.0.1:8666/combo?ns/foo/1.0.f/assets/skins/ace/../warn.png');
	my $code = decode_response($res);
	die $code,"\nwrong data" unless
		$code eq '';

	return 'success';
}

my @t;
for (1..5)
{
	push(@t, threads->create('test'));
}

for my $t (@t)
{
	die unless $t->join() eq 'success';
}
