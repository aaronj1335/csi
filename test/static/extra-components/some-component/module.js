/*global test, asyncTest, ok, equal, deepEqual, start, module, strictEqual, notStrictEqual, raises*/
define([
    './util',
    'css!./images2.css'
], function(util) {
    return function() {
        ok(util);
        equal(util.str, 'some string in util');
    };
});
