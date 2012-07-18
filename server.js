var http = require('http'),
    path = require('path'),
    os = require('os'),
    fs = require('fs'),
    url = require('url'),
    tty = require('tty'),
    colors = require('colors'),
    _ = require('underscore'),
    async = require('async'),
    extend = require('node.extend'),
    exists = fs.exists || path.exists,
    indexPath = path.resolve(path.join(__dirname, 'templates/index.mtpl'));

var contentType = {
    'html': 'text/html',
    'css': 'text/css',
    'js': 'application/javascript'
};

var defaultHeaders = {
    'Content-Type': 'text/plain',
    'Cache-Control': 'must-revalidate, no-cache'
};

// given a requested path, this function uses heuristics to determine if it's
// an optimized file.  if it is, then it returns the id, which the caller can
// use to include the corresponding optimized css.
var optimizedModuleId = function(filename) {
    if (/.*-[a-f0-9]{32}(?:\.min)?\.js$/.test(path.basename(filename))) {
        return path.basename(filename).replace(/.js$/, '');
    }
};

var log = exports.log = function(req, resp, statusCode, path, color) {
    var d = new Date(),
        seconds = d.getSeconds() < 10? '0' + d.getSeconds() : d.getSeconds(),
        datestring = d.getHours() + ':' + d.getMinutes() + ':' + seconds,
        line = datestring + ' [' + statusCode + ']: ' + path,
        colorized = line;
    if (tty.isatty(process.stdout.fd)) {
        colorized = (+statusCode) >= 500? line.red.bold :
                    (+statusCode) >= 400? line.red :
                    color != null? line[color] :
                    line;
    }
    console.log(colorized);
};

var writeHead = function(req, resp, statusCode, headers) {
    log(req, resp, statusCode, req.url);
    resp.writeHead(statusCode, headers);
};

var readIndex = (function() {
    var compiled, error;
    return function(req, resp, indexPath, callback) {
        if (typeof compiled === 'undefined') {
            fs.readFile(indexPath, 'utf8', function(err, file) {
                callback(error = err, compiled = _.template(file || ''));
            });
        } else {
            callback(error, compiled);
        }
    };
})();

var serveError = exports.serveError = function(req, resp, err) {
    writeHead(req, resp, 500, defaultHeaders);
    console.error('`---> ' + err.message);
    resp.write(err + '\n');
    resp.end();
};

var serve404 = function(req, resp) {
    writeHead(req, resp, 404, defaultHeaders);
    resp.end('not found');
};

var serveFile = function(req, resp, filename) {
    fs.readFile(filename, function(err, data) {
        if (err) {
            if (err.code === 'ENOENT') {
                serve404(req, resp);
            } else {
                serveError(req, resp, err);
            }
            return;
        }
        writeHead(req, resp, 200, _.extend({}, defaultHeaders, {
            'Content-Type': contentType[path.extname(filename).slice(1)],
            'Content-Length': data.length
        }));
        resp.write(data);
        resp.end();
    });
};

var serveIndex = function(req, resp, pathname, params) {
    readIndex(req, resp, indexPath, function(err, compiled) {
        var content,
            csiPath = path.join(params.config.baseUrl, params.config.paths.csi),
            isTest = /test/i.test(req.url.split('?')[0]);

        if (err) {
            serveError(req, resp, err);
            return;
        }

        content = compiled({
            isTest: isTest,
            qunitCss: path.join(csiPath, 'qunit.css'),
            qunitJs: path.join(csiPath, 'qunit.js'),
            requireJs: path.join(csiPath, 'require.js'),
            extra: params.extra || '',
            config: JSON.stringify(params.config, null, " "),
            css: params.css,
            jsPath: pathname
        });

        writeHead(req, resp, 200, _.extend({}, defaultHeaders, {
            'Content-Type': contentType.html,
            'Content-Length': Buffer.byteLength(content)
        }));
        resp.write(content);
        resp.end();
    });
};

var serveRequest = function(req, resp, staticDir, config, extra) {
    var filename, css, u = url.parse(req.url, true),
        requested = path.join(config.baseUrl || '', u.pathname + '.js')
            .replace(/^[\/\\]/, ''),
        removeBaseUrl = function(staticDir, baseUrl) {
            var re = new RegExp('[\\/\\\\]?' + baseUrl.replace(/^[\/\\]/, '') + '$');
            return staticDir.replace(re, '');
        };
    if (!/\.[a-z0-9]+$/i.test(u.pathname) || /\.min$/.test(u.pathname)) {
        filename = path.join(removeBaseUrl(staticDir, config.baseUrl), requested);
        if (optimizedModuleId(filename)) {
            css = path.join(config.baseUrl, path.dirname(u.pathname), optimizedModuleId(filename) + '.css');
        }
        exists(filename, function(exists) {
            if (exists) {
                serveIndex(req, resp, u.pathname.replace(/^[\/\\]/, ''), {
                    config: config,
                    extra: extra,
                    css: css
                });
            } else {
                serve404(req, resp);
            }
        });
    } else {
        filename = path.join(removeBaseUrl(staticDir, config.baseUrl), requested);
        filename = path.join(removeBaseUrl(staticDir, config.baseUrl), u.pathname.replace(/^\//, ''));
        serveFile(req, resp, filename);
    }
};

exports.createServer = function(staticDir, config, extra, middlewares) {
    staticDir = typeof staticDir === 'undefined'? './' : staticDir;
    config = extend(true, {
        baseUrl: '/' + path.basename(path.resolve(staticDir))
    }, config || {});
    middlewares = middlewares || [];
    return http.createServer(function(req, resp) {
        var wrapped = _.map(middlewares, function(middleware) {
            return async.apply(middleware.request, req, resp);
        });
        async.series(wrapped, function(err, results) {
            if (err) {
                serveError(req, resp, err);
            } else if (_.any(results)) {
                console.log('request handled by middleware, not serving');
            } else {
                serveRequest(req, resp, staticDir, config, extra);
            }
        });
    });
};
