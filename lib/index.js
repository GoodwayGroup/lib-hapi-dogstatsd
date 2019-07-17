const DogstatsdClient = require('dog-statsy');
const Hoek = require('hoek');

const defaults = {
    dogstatsdClient: null,
    host: 'localhost',
    port: 8125,
    tags: [`env:${process.env.NODE_ENV || 'development'}`],
    prefix: 'hapi',
    excludedPaths: ['/favicon.ico', '/health-check'],
    excludedTags: []
};

const getRequestDns = request => request.headers.host.replace(/:/, '_');

const getUrlPath = request => request.url.pathname;

const getRoutePath = (request) => {
    const specials = request._core.router.specials;

    if (request._route === specials.notFound.route) {
        return '/{notFound*}';
    } else if (specials.options && request._route === specials.options.route) {
        return '/{cors*}';
    } else if (request._route.path === '/' && request._route.method === 'options') {
        return '/{cors*}';
    }
    return request.route.path;
};

const getStatusCode = request => ((request.response.isBoom)
    ? request.response.output.statusCode : request.response.statusCode);

const getHttpMethod = request => request.method.toUpperCase();

const tagMap = {
    dns: getRequestDns,
    url_path: getUrlPath,
    route_path: getRoutePath,
    status_code: getStatusCode,
    http_method: getHttpMethod
};

exports.register = (server, options) => {
    const settings = Hoek.applyToDefaults(defaults, options || {});
    // Filter list of default tags, removing excludedTags
    settings.defaultTags = Object.keys(tagMap).filter(e => !settings.excludedTags.includes(e));

    const dogstatsdClient = options.dogstatsdClient || new DogstatsdClient({
        host: settings.host,
        port: settings.port,
        prefix: settings.prefix,
        tags: settings.tags
    });

    server.decorate('server', 'dogstatsd', dogstatsdClient);

    server.ext('onPreResponse', (request, h) => {
        if (settings.excludedPaths.indexOf(request.url.pathname) !== -1) {
            return h.continue;
        }

        const startDate = new Date(request.info.received);
        const endDate = new Date();
        const ms = endDate - startDate;

        const tags = settings.defaultTags.reduce((prev, tag) => {
            prev.push(`${tag}:${tagMap[tag](request)}`);
            return prev;
        }, []);

        let stateTags = [];
        if (request.plugins.dogstatsd) {
            stateTags = request.plugins.dogstatsd.tags;
        }

        Hoek.merge(tags, stateTags);

        dogstatsdClient.incr('route.hits', null, tags);
        dogstatsdClient.gauge('route.response_time', ms, tags);
        dogstatsdClient.timer('route', ms, tags);

        return h.continue;
    });
};

exports.pkg = require('../package.json');
