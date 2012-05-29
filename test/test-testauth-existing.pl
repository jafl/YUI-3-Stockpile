#!/usr/bin/perl

# Copyright (c) 2012 Yahoo! Inc.  All rights reserved.
#
# The copyrights embodied in the content of this file are licensed by
# Yahoo! Inc. under the BSD (revised) open source license.

use lib "./pm";

use strict;
use JSON;

do './util.pl';

print "$0\n";

open(F1, '| perl ../cli/upload.pl http://127.0.0.1:8669 ns foo 1.0.f ./upload/foo > /dev/null');
print F1 "whee\n";	# does not exist
print F1 "foo\n";	# must be email
print F1 "foo\@yahoo.com\n";
print F1 "baz\n";	# incorrect password
print F1 "bar\n";
print F1 "ns: short desc\n";
print F1 "ns: long desc\n";
print F1 "foo: short desc\n";
print F1 "foo: long desc\n";
print F1 "foo 1.0.f: notes\n";

open(F2, '| perl ../cli/upload.pl http://127.0.0.1:8669 bundle 1.0.z ./upload/bundle1 > /dev/null');
print F2 "baz\@yahoo.com\n";
print F2 "spaz\n";
print F2 "bundle: short desc\n";
print F2 "bundle: long desc\n";
print F2 "bundle 1.0.z: notes\n";

# wait for all processes to finish
close(F1);
close(F2);

open(F2, '| perl ../cli/upload.pl http://127.0.0.1:8669 bundle 2.0.z ./upload/bundle2 > /dev/null');
print F2 "baz\@yahoo.com\n";
print F2 "spaz\n";
print F2 "bundle 2.0.z: notes\n";

open(F1, '| perl ../cli/upload.pl http://127.0.0.1:8669 ns blah 1.0.b ./upload/blah1 > /dev/null');
print F1 "foo\@yahoo.com\n";
print F1 "bar\n";
print F1 "blah: short desc\n";
print F1 "blah: long desc\n";
print F1 "blah 1.0.b: notes\n";
close(F1);

open(F1, '| perl ../cli/upload.pl http://127.0.0.1:8669 ns blah 2.0.b ./upload/blah2 > /dev/null');
print F1 "foo\@yahoo.com\n";
print F1 "bar\n";
print F1 "blah 2.0.b: notes\n";
close(F1);

close(F2);

# fail - already exists

open(F1, '| perl ../cli/upload.pl http://127.0.0.1:8669 bundle 2.0.z ./upload/bundle2');
close(F1);

# auth

open(F1, '| perl ../cli/new-group.pl -u foo@yahoo.com http://127.0.0.1:8669 test1 > /dev/null');
print F1 "bar\n";

open(F2, '| perl ../cli/new-group.pl -u baz@yahoo.com http://127.0.0.1:8669 test2 > /dev/null');
print F2 "spaz\n";

close(F1);
close(F2);

open(F1, '| perl ../cli/new-group.pl -u foo@yahoo.com http://127.0.0.1:8669 test2 > /dev/null');
print F1 "bar\n";

my $groups = decode_json(slurp('./files/groups.json'));
my @groups = keys(%{$groups});
die "wrong number of groups, stopped" unless scalar(@groups) == 4;
die "missing group: foo, stopped" unless $groups->{foo};
die "missing group: baz, stopped" unless $groups->{baz};
die "missing group: test1, stopped" unless $groups->{test1};
die "wrong user in group test1 (",$groups->{test1}->[0],"), stopped" unless $groups->{test1}->[0] eq 'foo@yahoo.com';
die "missing group: test2, stopped" unless $groups->{test2};
die "wrong user in group test2 (",$groups->{test2}->[0],"), stopped" unless $groups->{test2}->[0] eq 'baz@yahoo.com';
die "foo@ should not be in group test2, stopped" if $groups->{test2}->[1] eq 'foo@yahoo.com';
