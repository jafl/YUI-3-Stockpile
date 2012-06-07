#!/usr/bin/perl

# Copyright (c) 2012 Yahoo! Inc.  All rights reserved.
#
# The copyrights embodied in the content of this file are licensed by
# Yahoo! Inc. under the BSD (revised) open source license.

use strict;

my $start = time();
while (time() - $start < 15)
{
	exit(0) if (-e "./init/manager.ready" && -e "./init/combo.ready" && -e "./init/combo-dev.ready");
}

print "init failed\n";
exit(1);
