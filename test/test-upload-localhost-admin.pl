#!/usr/bin/perl

use strict;

print "$0\n";

open(F, '| perl ../cli/upload.pl http://127.0.0.1:8669 test foo 1.0 ./upload/foo');
print F "test: short desc\n";
print F "test: long desc\n";
print F "foo: short desc\n";
print F "foo: long desc\n";
print F "foo 1.0: notes\n";
