#!/usr/bin/perl

use strict;

my $start = time();
while (time() - $start < 15)
{
	exit(0) if (-e "./init/manager.ready" && -e "./init/combo.ready" && -e "./init/combo-dev.ready");
}

print "init failed\n";
exit(1);
