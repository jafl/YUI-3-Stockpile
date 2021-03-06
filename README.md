YUI 3 combo handler built on NodeJS that supports versioning, both for
individual modules and for bundles of modules.  The significant advance
over other combo handlers is that you can upload new versions of individual
modules or bundles at any time, but this will not break existing
applications, because the old versions will still be available.

This support for versioning allows you to host all the versions of all your
modules on one server.

The name "stockpile" was chosen because it's a synonym of gallery, but
without the glamorous connotation.

[![Build Status](https://secure.travis-ci.org/jafl/YUI-3-Stockpile.png?branch=master)](http://travis-ci.org/jafl/YUI-3-Stockpile)
[![Total alerts](https://img.shields.io/lgtm/alerts/g/jafl/YUI-3-Stockpile.svg?logo=lgtm&logoWidth=18)](https://lgtm.com/projects/g/jafl/YUI-3-Stockpile/alerts/)
[![Language grade: JavaScript](https://img.shields.io/lgtm/grade/javascript/g/jafl/YUI-3-Stockpile.svg?logo=lgtm&logoWidth=18)](https://lgtm.com/projects/g/jafl/YUI-3-Stockpile/context:javascript)


Code Organization
-----------------

    combo.js        Combo handler
    combo-dev.js    Combo handler for development mode
    manager.js      Admin UI
    cli             Command line tools
    client          Client modules
    server          Server modules
    views           Client web pages
    test            Automated test suite

    This application includes portions of syntaxhighlighter-3.0.83, under
    the MIT license.

Installation
------------

Install nodejs >= 0.8.0 and npm and then run `npm install`.

On computers that will be used to upload modules to the stockpile, use cpan
to install the required Perl modules:

    sudo cpan LWP::UserAgent Term::ReadKey JSON

Usage
-----

Start the combo handler:

    cd YUI-3-Stockpile
    node combo.js [--config path_to_json_config_file]
                  [--path path_to_repository] [--port port]
                  [--cache [size_MB] [--cache-log path_to_dump_logs]
                   [--cache-log-interval log_dump_interval_hours]]
                  [--no-cluster] [--debug]

Start the admin UI:

    node manager.js [--config path_to_json_config_file]
                  [--address bind_address] [--port port] [--adminport port]
                  [--path path_to_repository] [--combo combo_handler_url]
                  [--auth type] [--cert https_crt_file] [--key https_key_file]
                  [--admins admin_list] [--mailserver mail_server_hostname]
                  [--title title_to_display]
                  [--debug]

The default locations for config files are:

    combo server:  /usr/share/yui3-stockpile/combo.json
    admin UI:      /usr/share/yui3-stockpile/manager.json

The config files must be valid JSON.  The keys are the names of the command
line parameters.  Command line arguments override the values in the config
files.

The default paths are:

    combo server repository: /var/yui3-stockpile
    combo server cache log:  /var/log/yui3-stockpile

Whichever paths you choose to use, they must be writable by the combo
handler and manager processes.

Module Names
------------

Module names must follow certain conventions, so YUI Loader can be
configured to support version numbers.

Namespaces avoid naming collisions between modules from different teams.
For a namespace containing individually versioned modules, each module name
must use this pattern:  `sp-{namespace}-{module-name}`

**Important**:  The name of a namespace cannot contain any hyphens.

For a bundle of modules that are all released together under a single
version number, all the modules must use this pattern:
`{bundle-name}-{module-name}`

Examples of using modules and bundles can be found in `test/upload`.

### Configuring version numbers for modules in a namespace

Version numbers must be specified by configuring each of the patterns in
the YUI Loader group with this configFn:

```js
function insertVersion(m)
{
    var s  = /^sp-([^-]+)-([^\/]+)/.exec(m.path);
    if (s && s.length)
    {
        m.path = m.path.replace(s[0],
                    s[1] + '/' + s[2] + '/' + moduleVersion[s[0]]);
    }
}
```

where moduleVersion is a map of module names to version numbers.  The
required prefix "sp-" makes it easy to define a single YUI Loader group
with this configFn.

### Configuring the version number for a bundle of modules

The version number must be specified by configuring the root of the YUI
Loader group:

    'my-bundle':
    {
        root: 'uifwk/14.2.0.0.253/'
    }

One advantage of using a bundle is that it reduces the amount of
configuration, since all the modules have the same version.  Using a bundle
also reduces the number of requests made by YUI Loader.  See "Dependency
Optimization" below for more information.

The disadvantage of using a bundle is that all the modules must be
published simultaneously.

Deployment
----------

You should publish only your minified code to your public deployment of
YUI 3 Stockpile, so you can keep your commented code private.

Uploading
---------

The upload.pl script (in the cli directory) lets you upload either a module
or a bundle:

    upload.pl manager_url (namespace module | bundle) version build_directory

This script assumes that you are using YUI Builder.  If you upload a
module, build_directory must contain a single module.  If you upload a
bundle, build_directory must contain all the modules in the bundle.  (You
can serve your own copy of YUI 3 by uploading it as a bundle.)

The script will ask you for the required information, e.g., password,
descriptions, or release notes.

Run upload.pl without arguments to get additional usage information.

**Note**:  The raw and debug versions of the JavaScript are optional.  The
assets directory is also optional.  Stockpile supports images inside the
assets directory, but for optimal performance, all images should be served
from a CDN, e.g., Akamai.

Authentication
--------------

All users must authenticate themselves when using the command line tools.
The authentication method is configured via `--auth`.  The built-in
authentication method is called "localhost".  This requires that
`--address` is `127.0.0.1` so users authenticate by logging into the
machine.

You can build your own authentication plugin, install it via npm, and then
configure `--auth` to be the name of your module.  The API is demonstrated
in `./server/auth/testauth.js`.

Any authentication method that requires a password should only be run over
https.  Simply configure `--cert` and `--key`, and `--adminport` will
automatically use https instead of http.

To make it easy to contact the owner of a module, all user names are email
addresses.  If all users are on the same mail server, then configure
`--mailserver` to be the name of the mailserver host so users only have to
type their username when invoking the command line tools.

Authorization
-------------

Authorization is based on user groups.  First, configure `--admins` with
the list of users who have access to all groups.  All other users are only
allowed to access groups to which they belong.  If a user belongs to a
group, he/she can add other users to that group.  Adding `*` to a group
allows all users to access that group.  Any user can create a new group.

Each namespace or bundle is managed by a single group.  The group name is
displayed when browsing.

The cli script manage-group.pl lets you create groups and add or remove
users from a group.  Run the script without arguments to get usage
information.

Development Mode
----------------

To enable rapid iteration during development, configure an instance of
combo-dev.js to load your local files for the modules you are currently
working on.  All other modules will be requested from the fallback combo
handler, usually an instance of combo.js.

combo-dev.js requires a config file, because you typically run a separate
instance for each project that you are working on:

    cd YUI-3-Stockpile
    node combo-dev.js --config path_to_json_config_file
                      [--port port] [--debug]

Command line arguments override the values in the config files.

A typical config file looks like this:

```js
{
    "port":8080,

    "combo":"http://my-nightly-build-combo-server/combo?",

    "root":"/Users/johndoe/yui3-stockpile/dev",
    "code":
    {
        "sp-test-blah.js": "sp-test-blah/sp-test-blah-debug.js",
        "sp-test-foo.css": "sp-test-foo/skin/sam/sp-test-foo.css"
    },
    "image":
    {
        "warn.png": "sp-test-foo/sam/warn.png"
    }
}
```

Requests for the JavaScript for module sp-test-blah or the CSS for module
sp-test-foo or an image named warn.png will return the local files.  All
other requests will be routed to the combo handler.

Caching
-------

**Important**:  If you turn on caching, then turn off clustering.

Stockpile only caches the results for minified requests.  Raw and debug
versions are typically requested only in debug mode, which is rare.
Unfortunately, not all requests will accept compressed responses, so the
cache must store both raw and gzipped versions.

The cache key is the sorted list of requested files.  The cache itself is a
map of keys to `{ response data, reference to MRU item }`.  The MRU items
(each of which stores a key) are stored in a doubly linked list to allow
easy re-ordering and dropping of oldest items.

The cache is memory-limited, so when an item is added, the total size is
updated, and then items are removed from the end of the MRU linked list
until the size drops back within the prescribed limit.

For tuning, the cache logs the following data:  total # of hits and a map
of cache keys to `{ # of puts, # of gets, response size }`.  This can be
plotted on a graph of log(response size) vs % of total hits.  Keys with
high percentages indicate thrashing.  The response size helps determine how
much the cache should be expanded.

Images are not cached because these should be uploaded separately to a CDN.
Images are supported only to simplify the development process.

Leveraging a CDN
----------------

In addition to the standard format (`/combo?a&b&c`), Stockpile also accepts a
custom format to allow caching by a CDN like CloudFlare:  `/combo~a~b~c`

To use this format, configure the group for YUI Loader as follows:

    comboBase: 'http://host:port/combo~',
    comboSep:  '~'

Clustering
----------

Clustering is turned on by default in the combo handler.  To turn it off,
pass `--no-cluster` as a command-line argument or add `"cluster":false` in
your configuration file.

**Important**:  If you use clustering, do not turn on caching, because
otherwise, each process will cache separately, dramatically increasing the
memory footprint.  Use an external cache instead, e.g., CloudFlare.

Dependency Optimization
-----------------------

When a bundle is uploaded, the "requires" configuration for each module is
parsed to extract dependencies within the bundle.  When the bundle is
requested, all the intra-bundle transitive dependencies are included in the
response.  This ensures that YUI Loader will only have to make one request
to get all the required modules within the bundle.

Unit Tests
----------

To run the test suite, first search `test/config/*` for "vagrant" and add
your username to the lists.  Then execute `npm test`.

Repository
----------

Versioning individual modules requires this directory structure:

    {namespace}/
        sp-{namespace}-{module-name}/
            {version}/
                sp-{namespace}-{module-name}-min.js

Versioning a module bundle requires this directory structure:

    {bundle-name}/
        {version}/
            {bundle-name}-{module-name}/
                {bundle-name}-{module-name}-min.js

The top-level namespace directory helps avoid the file system's limit on
the number of subdirectories:  each namespace can have the maximum number
of modules, instead of the limit being global.

FAQ
---

### Why Perl?

Perl was chosen for the command line tools because it is available
everywhere.  We did not want to require installation of NodeJS on machines
which only need to deploy to Stockpile.

### Why is there no support for wildcards in version numbers?

In production, you need to use fixed versions to ensure stability.  This
requires that you also use fixed versions in QA, so you are testing what
will be launched.  In order to have confidence in the code that you will
push to QA, you should therefore use fixed versions during development.

Modules that you are building during the development cycle can be loaded
explicitly via script tags until they are ready to be pushed to Stockpile.

### How do I delete a namespace, bundle, module, or version?

The command-line interface does not support deleting anything because the
main point of versioning is that you always have old versions available.
While support could be added for "soft delete," this would add extra
overhead to combo.js.  Slowing down every request to support what should be
a very rare situation is not a good trade-off.

The simplest solution is to update the description to say something like
"do not use."  If you really don't want something to be available any
longer, then you can go in and delete it from the file system.  Just
remember that this violates the basic assumption of ensuring that old
version are always available.
