#!/usr/bin/perl

# Copyright (c) 2012 Yahoo! Inc.  All rights reserved.
#
# The copyrights embodied in the content of this file are licensed by
# Yahoo! Inc. under the BSD (revised) open source license.

use strict;
use LWP::UserAgent;

do './util.pl';

print "$0\n";

my $ns_group     = shift;
my $bundle_group = shift;

my $ua = LWP::UserAgent->new();

# home

my $res  = $ua->get('http://127.0.0.1:8668/browse');
my $html = decode_response($res);
die $html,"\nmissing link to ns, stopped" unless $html =~ m|<a href="/browse\?ns=ns">ns</a>|;
die $html,"\nmissing link to ns desc, stopped" unless $html =~ m|ns: short desc|;
die $html,"\nmissing link to bundle, stopped" unless $html =~ m|<a href="/browse\?b=bundle">bundle</a>|;
die $html,"\nmissing link to bundle desc, stopped" unless $html =~ m|bundle: short desc|;

# ns

my $res  = $ua->get('http://127.0.0.1:8668/browse?ns=ns');
my $html = decode_response($res);
die $html,"\nmissing link to desc, stopped" unless $html =~ m|ns: long desc|;
die $html,"\nmissing group, stopped" unless $html =~ m|Managed by group: $ns_group|;
die $html,"\nmissing link to foo, stopped" unless $html =~ m|<a href="/browse\?ns=ns&amp;m=foo">foo</a>|;
die $html,"\nmissing link to foo version, stopped" unless $html =~ m|1\.0\.f|;
die $html,"\nmissing link to blah, stopped" unless $html =~ m|<a href="/browse\?ns=ns&amp;m=blah">blah</a>|;
die $html,"\nmissing link to blah version, stopped" unless $html =~ m|2\.0\.b|;

# ns/foo

my $res  = $ua->get('http://127.0.0.1:8668/browse?ns=ns&m=foo');
my $html = decode_response($res);
die $html,"\nmissing link to desc, stopped" unless $html =~ m|foo: long desc|;
die $html,"\nmissing link to 1.0.f, stopped" unless $html =~ m|<a href="/browse\?ns=ns&amp;m=foo&amp;v=1\.0\.f">1\.0\.f</a>|;

# ns/foo/1.0.f

my $res  = $ua->get('http://127.0.0.1:8668/browse?ns=ns&m=foo&v=1.0.f');
my $html = decode_response($res);
die $html,"\nmissing link to notes, stopped" unless $html =~ m|foo 1\.0\.f: notes|;
die $html,"\nmissing link to desc, stopped" unless $html =~ m|foo: long desc|;
die $html,"\nmissing link to js file, stopped" unless $html =~ m|sp-ns-foo-min\.js|;
die $html,"\nmissing link to css file, stopped" unless $html =~ m|sp-ns-foo\.css|;
die $html,"\nmissing link to image file, stopped" unless $html =~ m|warn\.png|;

# ns/blah

my $res  = $ua->get('http://127.0.0.1:8668/browse?ns=ns&m=blah');
my $html = decode_response($res);
die $html,"\nmissing link to desc, stopped" unless $html =~ m|blah: long desc|;
die $html,"\nmissing link to 1.0.b, stopped" unless $html =~ m|<a href="/browse\?ns=ns&amp;m=blah&amp;v=1\.0\.b">1\.0\.b</a>|;
die $html,"\nmissing link to 2.0.b, stopped" unless $html =~ m|<a href="/browse\?ns=ns&amp;m=blah&amp;v=2\.0\.b">2\.0\.b</a>|;

# ns/blah/1.0.b

my $res  = $ua->get('http://127.0.0.1:8668/browse?ns=ns&m=blah&v=1.0.b');
my $html = decode_response($res);
die $html,"\nmissing link to notes, stopped" unless $html =~ m|blah 1\.0\.b: notes|;
die $html,"\nmissing link to desc, stopped" unless $html =~ m|blah: long desc|;
die $html,"\nmissing link to js file, stopped" unless $html =~ m|sp-ns-blah-min\.js|;
die $html,"\nunexpected link to css file, stopped" if $html =~ m|sp-ns-blah\.css|;

# ns/blah/2.0.b

my $res  = $ua->get('http://127.0.0.1:8668/browse?ns=ns&m=blah&v=2.0.b');
my $html = decode_response($res);
die $html,"\nmissing link to notes, stopped" unless $html =~ m|blah 2\.0\.b: notes|;
die $html,"\nmissing link to desc, stopped" unless $html =~ m|blah: long desc|;
die $html,"\nmissing link to js file, stopped" unless $html =~ m|sp-ns-blah-min\.js|;
die $html,"\nunexpected link to css file, stopped" if $html =~ m|sp-ns-blah\.css|;

# bundle

my $res  = $ua->get('http://127.0.0.1:8668/browse?b=bundle');
my $html = decode_response($res);
die $html,"\nmissing link to desc, stopped" unless $html =~ m|bundle: long desc|;
die $html,"\nmissing group, stopped" unless $html =~ m|Managed by group: $bundle_group|;
die $html,"\nmissing link to 1.0.z, stopped" unless $html =~ m|<a href="/browse\?b=bundle&amp;v=1\.0\.z">1\.0\.z</a>|;
die $html,"\nmissing link to 2.0.z, stopped" unless $html =~ m|<a href="/browse\?b=bundle&amp;v=2\.0\.z">2\.0\.z</a>|;

# bundle/1.0.z

my $res  = $ua->get('http://127.0.0.1:8668/browse?b=bundle&v=1.0.z');
my $html = decode_response($res);
die $html,"\nmissing link to notes, stopped" unless $html =~ m|bundle 1\.0\.z: notes|;
die $html,"\nmissing link to desc, stopped" unless $html =~ m|bundle: long desc|;
die $html,"\nmissing link to bundle-bar, stopped" unless $html =~ m|<a href="/browse\?b=bundle&amp;v=1\.0\.z&amp;m=bundle-bar">bundle-bar</a>|;
die $html,"\nmissing link to bundle-baz, stopped" unless $html =~ m|<a href="/browse\?b=bundle&amp;v=1\.0\.z&amp;m=bundle-baz">bundle-baz</a>|;

# bundle/1.0.z/bundle-bar

my $res  = $ua->get('http://127.0.0.1:8668/browse?b=bundle&v=1.0.z&m=bundle-bar');
my $html = decode_response($res);
die $html,"\nmissing link to notes, stopped" unless $html =~ m|bundle 1\.0\.z: notes|;
die $html,"\nmissing link to desc, stopped" unless $html =~ m|bundle: long desc|;
die $html,"\nmissing link to js file, stopped" unless $html =~ m|bundle-bar-min\.js|;
die $html,"\nmissing link to css file, stopped" unless $html =~ m|bundle-bar\.css|;

# bundle/1.0.z/bundle-baz

my $res  = $ua->get('http://127.0.0.1:8668/browse?b=bundle&v=1.0.z&m=bundle-baz');
my $html = decode_response($res);
die $html,"\nmissing link to notes, stopped" unless $html =~ m|bundle 1\.0\.z: notes|;
die $html,"\nmissing link to desc, stopped" unless $html =~ m|bundle: long desc|;
die $html,"\nmissing link to js file, stopped" unless $html =~ m|bundle-baz-min\.js|;
die $html,"\nunexpected link to css file, stopped" if $html =~ m|bundle-baz\.css|;

# bundle/2.0.z

my $res  = $ua->get('http://127.0.0.1:8668/browse?b=bundle&v=2.0.z');
my $html = decode_response($res);
die $html,"\nmissing link to notes, stopped" unless $html =~ m|bundle 2\.0\.z: notes|;
die $html,"\nmissing link to desc, stopped" unless $html =~ m|bundle: long desc|;
die $html,"\nunexpected link to bundle-bar, stopped" if $html =~ m|<a href="/browse\?b=bundle&amp;v=2\.0\.z&amp;m=bundle-bar">bundle-bar</a>|;
die $html,"\nmissing link to bundle-baz, stopped" unless $html =~ m|<a href="/browse\?b=bundle&amp;v=2\.0\.z&amp;m=bundle-baz">bundle-baz</a>|;

# bundle/2.0.z/bundle-baz

my $res  = $ua->get('http://127.0.0.1:8668/browse?b=bundle&v=2.0.z&m=bundle-baz');
my $html = decode_response($res);
die $html,"\nmissing link to notes, stopped" unless $html =~ m|bundle 2\.0\.z: notes|;
die $html,"\nmissing link to desc, stopped" unless $html =~ m|bundle: long desc|;
die $html,"\nmissing link to js file, stopped" unless $html =~ m|bundle-baz-min\.js|;
die $html,"\nunexpected link to css file, stopped" if $html =~ m|bundle-baz\.css|;
