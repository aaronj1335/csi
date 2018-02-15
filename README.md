# `csi`

client side asset management for team players

 - [source code][csi_github]
 - [homepage][csi_homepage]

## go ahead, elevator pitch me.

`csi` is an asset manager for industrial strength software projects.  it's
built on [`require.js`][requirejs], and it allows you to write full client-side
components (`html`, `css`, and `javascript`) that can be installed anywhere
within your app.  `csi` aims to be:

 - **framework agnostic** -- `csi` doesn't assume anything other than
   [`npm`][npm] during development and build.  you can use it with whatever
   server-side and client-side framework you prefer, and it doesn't have any
   dependencies in production (it just delivers a directory of assets).

 - **test-driven** -- `csi` provides built-in, easy to use testing with
   [`qunit`][qunit], and it can be easily extended to use other frameworks like
   [`mocha`][mocha].

 - **[`require.js`][requirejs] based** -- [`amd`][amd] is baked in with
   `require.js`, and `csi` builds on that foundation to allow even more
   modularity.

 - **whollistic** -- last time we checked, client-side web apps are composed
   not just of javascript, but also `css` and markup.  `csi` helps you write
   full components with `css` and `html` dependencies without having to worry
   about where your assets will be stored.

## let's get into some examples.

let's say you've got a module called `bird`, and its sole purpose is to [put a
bird on it][bird_on_it].

<div class="add-bottom with-bird"><img src="http://siq.github.com/csi/doc/bird.png" /></div>

it is so friggin useful that you want it in all the apps that you make, even
though some of your apps are 10 years old and they run on
perl-scripting-cgi-serving technology, and others are so hip that [you haven't
even heard of their framework yet][spire].  it goes something like this:

    var birdifyIt = function(el) {
        $('<div>').addClass('with-a-bird-on-it').appendTo(el);
        return el;
    };

and then you throw some css up somewhere:

    .with-a-bird-on-it {
      width: 640px;
      height: 480px;
      background-image: url(bird.png);
    }

the cool kids are all using modules for code reuse, so you throw it in an `amd`
module:

    define([

        // assuming you guys throw your third-party stuff in a vendor direcotry
        'vendor/jquery' 

    ], function($) {
        return function(el) {
            $('<div>').addClass('with-a-bird-on-it').appendTo(el);
            return el;
        };
    });

you're even so savvy that you write a [`require.js` plugin][requirejs_plugin]
for `css` (maybe something like [this][requirejs_css]).  that way you can
abstract the caller's [transitive dependency][transitive_dep] on the `css`
required to make this whole boat stay afloat.

    define([
        'vendor/jquery',
        'css!bird.css'
    ], function($) {
        return function(el) {
            $('<div>').addClass('with-a-bird-on-it').appendTo(el);
            return el;
        };
    });

your code works, it's modular, your company is selling crap with birds on it
left and right, and your boss is so happy he comes over to your cubicle and
he's all like:

> man that put-a-bird-on-it code you wrote is so sick, lets use it in our new
> app, version 2.0!

### the plot thickens.

like any good engineering organization, you guys completely re-architected
everything in version 2.0, and now you're putting modules into their own little
subdirectories in order to separate concerns.  you throw your bird module into
the `components/bird` directory, and BOOM, it stops working because the paths
to `jquery.js`, `bird.css`, `bird.png` have changed.

so now you've got to edit the bird code in order to put it in a new app.
that's not optimal.  and why should your code care where `jquery` lives?  it
should work whether it's at `vendor/jquery.js` or `lib/jquery.js` or
`the/shady/part/of/the/codebase/jquery.js`.  it doesn't discriminate.

on top of that you didn't write any unit tests for it, cause it's such a pain
to have to keep re-configuring `QUnit` to work with `require.js` each time you
roll out a new app.  now you've got that sinking "i think i broke it when i
changed it" feeling.

### a simple `csi` component

so what would it look like to have a fully modular way of doing this?  let's
write it as a `csi` component.  we make a 'bird' repository with the following
directory structure:

    bird
    |-- package.json
    `-- src
        |-- bird.css
        |-- bird.js
        |-- bird.png
        `-- test.js

`bird.js` looks like:

    define([
        'jquery',
        'css!./bird.css'
    ], function($) {
        return function(el) {
            $('<div>').addClass('with-a-bird-on-it').appendTo(el);
            return el;
        };
    });

now the code just lists `jquery` as a dependency.  the details about version
and where it's installed are configured via a 'package.json' file (see below).

we're still using that slick `css` plugin, but the leading `./` before
`bird.css` tells `require.js` to get it from the same directory as `bird.js`.

we've also included an `npm` [package.json][package_json] file.  this is
necessary whether or not you plan on publishing to the npm registry because
it's how we manage dependencies.  here's the contents:

    {
      "author": {"name": "nature and stuff"},
      "name": "put-a-bird-on-it",
      "description": "we put birds on things.",
      "version": "0.0.0",
      "dependencies": {
        "jquery": "1.7.x",
        "csi": "0.1.x"
      },
      "csi": {
        "name": "bird"
      }
    }

this is all pretty strait forward, but there are three important things:

 - **`csi` dependency**: declaring `csi` as a dependency gives us tools that
   help with unit testing and code reuse

 - **`jquery` dependency**: this is where we make jquery available to our
   module[\*](#qualification).

 - **`csi` property**: `csi` uses this to define the name of the component.
   the `csi.name` property is required.

before we get into how we include the bird component, let's write a quick qunit
test to cover ourselves in future refactorings:

    define([
        'jquery',
        'bird/bird'
    ], function($, birdifyIt) {

        test('put an effin bird on it', function() {
            birdifyIt($('body'));
            equal($('body').children().last()[0].className, 'with-a-bird-on-it');
        });

        start();
    });

running the test is easy:

    $ npm install
    $ node_modules/.bin/csi test

this will start up a server for you and list out URL's you can visit to run
tests.  open up [http://localhost:1335/components/bird/test][test] in your
browser.

### including components in an app

now back to your app version 2.0.  you'll have a directory structure like this:

    app_v2
    |-- package.json
    `-- static
        |-- bluejay.js
        `-- index.js

your sweet new `bluejay` module extends the functionality of `birdifyIt`:

    define([
        'bird/bird'
    ], function(birdifyIt) {
        return function(node) {
            var childNodes = birdifyIt(node).childNodes;
            childNodes[childNodes.length-1].style.backgroundColor = 'blue';
        };
    });

and then you can add an entry point at `static/index.js`

    define([
        'bluejay'
    ], function(bluejay) {
        bluejay(document.body);
    });


and your `package.json` will be:

    {
      "name": "app_v2",
      "description": "aviary appification",
      "version": "0.0.0",
      "engines": {
        "node": "~0.6.11"
      },
      "dependencies": {
        "csi": "0.0.x",
        "put-a-bird-on-it": "git://github.com/aaronj1335/put-a-bird-on-it.git"
      }
    }

thanks to npm's [flexible dependency specification][json_deps], we can just use
a `git` url, but you could of course use the npm registry or the location of a
tarball.

running tests is still easy:

    $ npm install
    $ node_modules/.bin/csi test

since we defined the entry point in `static/index.js`, we can open
[http://localhost:1335/index][index].  `csi` is smart enough to figure out that
this is not a test module (since it doesn't have 'test' in the filename), so
your page loads as without all the `qunit` stuff.

## ba-da-bing

and there you have it, modular client-side development.  there are quite a few
details that we glossed over, such as the mechanics of installing components
(hint: they go in a directory called `components`), and the fact that [`csi`
may re-write `url()` paths in `css`][css_url_rewrite] files, but hopefully this
was an instructive tutorial.  the best way to get a feel for `csi` would
probably be to check out working examples:

 - [this tutorial][example]

 - [`gloss`][gloss]: a UI framework.  this makes heavy use of `csi`.  it also
   includes an example of client-side templating with [John Resig's
   micro-templating][microtemplates].  it utilizes the following dependencies:

     - [`siq-vendor-js`][vendorjs]: third-party stuff like jquery and
       underscore

     - [`bedrockjs`][bedrock]: our class and (non-DOM) event implementation

     - [`mesh`][mesh]: our integrated REST framework


---

***<a name="qualification">*</a>*** since the official jquery repo isn't in
NPM, and it doesn't have a "csi" field in its 'package.json' file, you would
actually need to specify this as something like:

    "jquery": "git://github.com/aaronj1335/node-jquery.git",


[bird_on_it]: http://www.youtube.com/watch?v=0XM3vWJmpfo
[spire]: https://github.com/siq/spire
[gloss]: https://github.com/siq/gloss
[vendorjs]: https://github.com/siq/siq-vendor-js
[requirejs]: http://requirejs.org/
[package_json]: http://npmjs.org/doc/json.html
[json_deps]: http://npmjs.org/doc/json.html#dependencies
[css_url_rewrite]: https://github.com/siq/csi/blob/master/lib/css_requirejs_plugin.js#L139
[test]: http://localhost:1335/components/bird/test
[index]: http://localhost:1335/index
[bedrock]: https://github.com/siq/B
[mesh]: https://github.com/siq/mesh
[microtemplates]: http://ejohn.org/blog/javascript-micro-templating/
[npm]: http://npmjs.org/
[qunit]: http://docs.jquery.com/QUnit
[mocha]: http://mochajs.org/
[amd]: https://github.com/amdjs/amdjs-api/wiki/AMD
[requirejs_css]: https://github.com/VIISON/RequireCSS
[example]: https://github.com/aaronj1335/bird-app-v2
[transitive_dep]: http://en.wikipedia.org/wiki/Transitive_dependency
[requirejs_plugin]: http://requirejs.org/docs/plugins.html
[csi_github]: https://github.com/siq/csi
[csi_homepage]: http://siq.github.com/csi/
