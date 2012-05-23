#!/usr/bin/perl

use strict;

print "$0\n";

open(F1, '| perl ../cli/upload.pl http://127.0.0.1:8669 ns foo 1.0.f ./upload/foo > /dev/null');
print F1 "ns: short desc\n";
print F1 "ns: long desc\n";
print F1 "foo: short desc\n";
print F1 "foo: long desc\n";
print F1 "foo 1.0.f: notes\n";

open(F2, '| perl ../cli/upload.pl http://127.0.0.1:8669 bundle 1.0.z ./upload/bundle1 > /dev/null');
print F2 "bundle: short desc\n";
print F2 "bundle: long desc\n";
print F2 "bundle 1.0.z: notes\n";

# wait for all processes to finish
close(F1);
close(F2);

open(F2, '| perl ../cli/upload.pl http://127.0.0.1:8669 bundle 2.0.z ./upload/bundle2 > /dev/null');
print F2 "bundle 2.0.z: notes\n";

open(F1, '| perl ../cli/upload.pl http://127.0.0.1:8669 ns blah 1.0.b ./upload/blah1 > /dev/null');
print F1 "blah: short desc\n";
print F1 "blah: long desc\n";
print F1 "blah 1.0.b: notes\n";
close(F1);

open(F1, '| perl ../cli/upload.pl http://127.0.0.1:8669 ns blah 2.0.b ./upload/blah2 > /dev/null');
print F1 "blah 2.0.b: notes\n";
close(F1);

close(F2);
