#!/usr/bin/perl

# Copyright (c) 2012 Yahoo! Inc.  All rights reserved.
#
# The copyrights embodied in the content of this file are licensed by
# Yahoo! Inc. under the BSD (revised) open source license.

use strict;

my $user = shift;
my $pass = shift;

if (($user =~ /^foo\@/ && $pass eq 'bar') ||
	($user =~ /^baz\@/ && $pass eq 'spaz'))
{
	print 'yes';
}
else
{
	print 'no';
}
