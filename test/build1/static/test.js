/*global test, asyncTest, ok, equal, deepEqual, start, module, strictEqual, notStrictEqual, raises*/

require({
	// define some paths
    paths: {
        'test-component': 'extra-components/some-component'
    },

	// so that we can test the path re-writing
	css: {
		loadAsStyleTags: true
	}
});

require([
	'a',
    'component!test-component:module',
    'text!fixture.json',
    'component!test-component:css!100:theme.css'
], function(a, TestComponentModule, fixture) {

    // we need to do two layers of `require()` calls since we want to guarantee
    // that 'style.css' was loaded _after_ 'theme.css'
    require([
        'css!style.css',
		'css!images.css'
    ], function() {

        test('require works', function() {
            ok(a);
            equal(a.name, 'a');
        });

        test('path plugin works', function() {
            ok(TestComponentModule);
            TestComponentModule();
        });

        test('text plugin works', function() {
            ok(fixture);
            equal(JSON.parse(fixture).foo, 'bar');
        });

        test('including style works', function() {
            var color, el = document.createElement('div');
            document.getElementById('qunit-fixture').appendChild(el);
            color = getComputedStyle(el, null).getPropertyValue('color');
            equal(color, 'rgb(0, 0, 0)');
            el.className = 'colorized';
            color = getComputedStyle(el, null).getPropertyValue('color');
            equal(color, 'rgb(255, 0, 0)');
        });

        test('css ordering works', function() {
            var color, el = document.createElement('div');
            document.getElementById('qunit-fixture').appendChild(el);
            color = getComputedStyle(el, null).getPropertyValue('background-color');
            ok(/rgba?\(0, 0, 0/.test(color));
            el.className = 'my-overridden-style';
            color = getComputedStyle(el, null).getPropertyValue('background-color');
            ok(/rgba?\(0, \d{2,3}, 0/.test(color));
        });

		test('css paths re-written correctly', function() {
			var i, j, len, tag, line, url, rewritten, beforeRewrite,
				styleTags = document.getElementsByTagName('style');
			equal(styleTags.length, 4);
			for (i = 0; i < styleTags.length; i++) {
				tag = styleTags[i];
				for (j = 0; j < tag.innerHTML.split('\n').length; j++) {
					line = tag.innerHTML.split('\n')[j];
					if (/url\((["']?)([^)]+)\1\)/i.test(line)) {
						url = line.match(/url\((["']?)([^)]+)\1\)/i)[2];
						equal(url[0], '/', 'all URLs are absolute');
					}
				}
				if (/my-component/.test(tag.innerHTML)) {
					rewritten = '/static/extra-components/some-component/background.png';
					beforeRewrite = "url('background.png')";
					ok(tag.innerHTML.indexOf(rewritten) >= 0);
					ok(tag.innerHTML.indexOf(beforeRewrite) === -1);
				}
			}
		});

        start();
    });
});
