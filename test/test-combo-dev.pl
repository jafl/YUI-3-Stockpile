#!/usr/bin/perl

# Copyright (c) 2012 Yahoo! Inc.  All rights reserved.
#
# The copyrights embodied in the content of this file are licensed by
# Yahoo! Inc. under the BSD (revised) open source license.

use strict;
use LWP::UserAgent;
use threads;

print "$0\n";

sub decode_response($)
{
	my ($res) = @_;

	die $res->as_string unless $res->is_success();
	return $res->decoded_content;
}

sub slurp($)
{
	my ($file) = @_;

	open(F, "< $file");
	local $/ = undef;
	my $content = <F>;
	close(F);

	return $content;
}

sub test()
{
	my $ua = LWP::UserAgent->new();

	# ns

	my $res  = $ua->get('http://127.0.0.1:8667/combo?ns/blah/2.0.b/sp-ns-blah-min.js');
	my $code = decode_response($res);
	die $code,"\nwrong data" unless
		$code eq slurp('./dev/blah/sp-ns-blah-debug.js');

	my $res  = $ua->get('http://127.0.0.1:8667/combo?ns/blah/1.0.b/sp-ns-blah.js');
	my $code = decode_response($res);
	die $code,"\nwrong data" unless
		$code eq slurp('./dev/blah/sp-ns-blah-debug.js');

	my $res  = $ua->get('http://127.0.0.1:8667/combo?ns/blah/2.0.b/sp-ns-blah-debug.js');
	my $code = decode_response($res);
	die $code,"\nwrong data" unless
		$code eq slurp('./dev/blah/sp-ns-blah-debug.js');

	# bundle

	my $res  = $ua->get('http://127.0.0.1:8667/combo?bundle/1.0.z/bundle-baz/bundle-baz-min.js');
	my $code = decode_response($res);
	die $code,"\nwrong data" unless
		$code eq slurp('./upload/bundle1/bundle-baz/bundle-baz-min.js');

	# combo

	my $res  = $ua->get('http://127.0.0.1:8667/combo?ns/foo/1.0.f/sp-ns-foo-min.js&bundle/2.0.z/bundle-baz/bundle-baz-min.js');
	my $code = decode_response($res);
	die $code,"\nwrong data" unless
		$code eq slurp('./upload/foo/sp-ns-foo-min.js')
				.slurp('./upload/bundle2/bundle-baz/bundle-baz-min.js');

	my $res  = $ua->get('http://127.0.0.1:8667/combo?ns/blah/1.0.b/sp-ns-blah.js&bundle/1.0.z/bundle-bar/bundle-bar-debug.js');
	my $code = decode_response($res);
	die $code,"\nwrong data" unless
		$code eq slurp('./dev/blah/sp-ns-blah-debug.js')
				.slurp('./dev/bar/bundle-bar-debug.js');

	my $res  = $ua->get('http://127.0.0.1:8667/combo?ns/blah/1.0.b/sp-ns-blah.js&bundle/2.0.z/bundle-baz/bundle-baz-min.js');
	my $code = decode_response($res);
	die $code,"\nwrong data" unless
		$code eq slurp('./dev/blah/sp-ns-blah-debug.js')
				.slurp('./upload/bundle2/bundle-baz/bundle-baz-min.js');

	# css

	my $res  = $ua->get('http://127.0.0.1:8667/combo?ns/foo/1.0.f/assets/skins/ace/sp-ns-foo.css');
	my $code = decode_response($res);
	die $code,"\nwrong data" unless
		$code eq slurp('./dev/foo/assets/sp-ns-foo-core.css')
				.slurp('./dev/foo/assets/skins/ace/sp-ns-foo-skin.css');

	my $res  = $ua->get('http://127.0.0.1:8667/combo?bundle/1.0.z/bundle-bar/assets/skins/sam/bundle-bar.css');
	my $code = decode_response($res);
	die $code,"\nwrong data" unless
		$code eq slurp('./upload/bundle1/bundle-bar/assets/skins/sam/bundle-bar.css');

	my $res  = $ua->get('http://127.0.0.1:8667/combo?ns/foo/1.0.f/assets/skins/ace/sp-ns-foo.css&bundle/1.0.z/bundle-bar/assets/skins/sam/bundle-bar.css');
	my $code = decode_response($res);
	die $code,"\nwrong data" unless
		$code eq slurp('./dev/foo/assets/sp-ns-foo-core.css')
				.slurp('./dev/foo/assets/skins/ace/sp-ns-foo-skin.css')
				.slurp('./upload/bundle1/bundle-bar/assets/skins/sam/bundle-bar.css');

	# image

	my $res  = $ua->get('http://127.0.0.1:8667/combo?ns/foo/1.0.f/assets/skins/ace/warn.png');
	my $code = decode_response($res);
	die "binary data\nwrong data" unless
		$code eq slurp('./dev/foo/assets/skins/ace/warn.png');

	my $res  = $ua->get('http://127.0.0.1:8667/combo?bundle/1.0.z/bundle-bar/assets/skins/ace/error.png');
	my $code = decode_response($res);
	die "binary data\nwrong data" unless
		$code eq slurp('./upload/bundle1/bundle-bar/assets/skins/ace/error.png');

	# pdf - fail

	my $res  = $ua->get('http://127.0.0.1:8666/combo?ns/foo/1.0.f/assets/skins/ace/invalid.pdf');
	my $code = decode_response($res);
	die $code,"\nwrong data" unless
		$code eq 'abc';

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
