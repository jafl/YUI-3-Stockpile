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

### upload

# fail - username must be email

open(F1, '| perl ../cli/upload.pl -u foo http://127.0.0.1:8669 ns foo 1.0.f ./upload/foo > /dev/null');
close(F1);

open(F1, '| perl ../cli/upload.pl -u foo@yahoo.com http://127.0.0.1:8669 ns foo 1.0.f ./upload/foo > /dev/null');
print F1 "baz\n";	# incorrect password
print F1 "bar\n";
print F1 "ns: short desc\n";
print F1 "ns: long desc\n";
print F1 "foo: short desc\n";
print F1 "foo: long desc\n";
print F1 "foo 1.0.f: notes\n";

open(F2, '| perl ../cli/upload.pl -u baz@yahoo.com http://127.0.0.1:8669 bundle 1.0.z ./upload/bundle1 > /dev/null');
print F2 "spaz\n";
print F2 "bundle: short desc\n";
print F2 "bundle: long desc\n";
print F2 "bundle 1.0.z: notes\n";

# wait for all processes to finish
close(F1);
close(F2);

open(F2, '| perl ../cli/upload.pl -u baz@yahoo.com http://127.0.0.1:8669 bundle 2.0.z ./upload/bundle2 > /dev/null');
print F2 "spaz\n";
print F2 "bundle 2.0.z: notes\n";

open(F1, '| perl ../cli/upload.pl -u foo@yahoo.com http://127.0.0.1:8669 ns blah 1.0.b ./upload/blah1 > /dev/null');
print F1 "bar\n";
print F1 "blah: short desc\n";
print F1 "blah: long desc\n";
print F1 "blah 1.0.b: notes\n";
close(F1);

open(F1, '| perl ../cli/upload.pl -u foo@yahoo.com http://127.0.0.1:8669 ns blah 2.0.b ./upload/blah2 > /dev/null');
print F1 "bar\n";
print F1 "blah 2.0.b: notes\n";
close(F1);

close(F2);


open(F1, '| perl ../cli/upload.pl -u baz@yahoo.com http://127.0.0.1:8669 bundle 3.0.z ./upload/bundle3 > /dev/null');
print F1 "spaz\n";
print F1 "bundle 3.0.z: notes\n";
close(F1);

# fail - already exists

open(F1, 'perl ../cli/upload.pl -u baz@yahoo.com http://127.0.0.1:8669 bundle 2.0.z ./upload/bundle2 |');
die "should not be allowed to upload to existing, stopped" unless <F1> eq "bundle/2.0.z already exists\n";
close(F1);

# fail - can't upload bundle to namespace

open(F1, 'perl ../cli/upload.pl -u baz@yahoo.com http://127.0.0.1:8669 ns 2.0.z ./upload/bundle2 |');
die "should not be allowed to upload bundle to namespace, stopped" unless <F1> eq "You cannot upload a bundle to a namespace.\n";
close(F1);

# fail - can't upload namespace to bundle

open(F1, 'perl ../cli/upload.pl -u foo@yahoo.com http://127.0.0.1:8669 bundle test-error 1.0.b ./upload/bundle1 |');
die "should not be allowed to upload namespace to bundle, stopped" unless <F1> eq "You cannot upload a namespace to a bundle.\n";
close(F1);

### auth

open(F1, '| perl ../cli/manage-group.pl -u foo@yahoo.com http://127.0.0.1:8669 test1 new > /dev/null');
print F1 "bar\n";

open(F2, '| perl ../cli/manage-group.pl -u baz@yahoo.com http://127.0.0.1:8669 test2 new > /dev/null');
print F2 "spaz\n";

close(F1);
close(F2);

my $test_user1 = 'zzyyxx', my $test_user2 = 'aabbcc';
open(F1, '| perl ../cli/manage-group.pl -u foo@yahoo.com http://127.0.0.1:8669 test1 add '.$test_user1.' > /dev/null');
print F1 "bar\n";

# fail - not authorized

open(F2, '| perl ../cli/manage-group.pl -u foo@yahoo.com http://127.0.0.1:8669 test2 add '.$test_user1.' > /dev/null');
print F2 "bar\n";

open(F3, '| perl ../cli/manage-group.pl -u foo@yahoo.com http://127.0.0.1:8669 test1 add '.$test_user2.' > /dev/null');

close(F1);
close(F2);
close(F3);

open(F1, '| perl ../cli/manage-group.pl -u foo@yahoo.com http://127.0.0.1:8669 test1 remove '.$test_user2.' > /dev/null');
close(F1);

my $groups = decode_json(slurp('./files/groups.json'));
my @groups = keys(%{$groups});
die "wrong number of groups, stopped" unless scalar(@groups) == 4;
die "missing group: foo, stopped" unless $groups->{foo};
die "missing group: baz, stopped" unless $groups->{baz};
die "missing group: test1, stopped" unless $groups->{test1};
die "wrong number of users in group test1, stopped" unless scalar(@{$groups->{test1}}) == 2;
die "foo@ missing from group test1 (",$groups->{test1}->[0],"), stopped" unless $groups->{test1}->[0] eq 'foo@yahoo.com';
die "$test_user1 missing from group test1 (",$groups->{test1}->[1],"), stopped" unless $groups->{test1}->[1] eq $test_user1;
die "missing group: test2, stopped" unless $groups->{test2};
die "wrong number of users in group test2, stopped" unless scalar(@{$groups->{test2}}) == 1;
die "baz@ missing from group test2 (",$groups->{test2}->[0],"), stopped" unless $groups->{test2}->[0] eq 'baz@yahoo.com';
