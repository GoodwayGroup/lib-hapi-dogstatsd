const DogstatsdClient = require('dog-statsy');
const Hoek = require('@hapi/hoek');
const debug = require('debug')('hapi:plugins:dogstatsd');
const { get, set } = require('lodash');

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

exports.injectMetricTags = ({ request, tags }) => {
    const ogTags = get(request, 'plugins.dogstatsd.tags', []);
    set(request, 'plugins.dogstatsd.tags', [...ogTags, ...tags]);
    return true;
};

exports.injectMetrics = ({ request, metrics }) => {
    const ogMetrics = get(request, 'plugins.dogstatsd.metrics', []);
    set(request, 'plugins.dogstatsd.metrics', [...ogMetrics, ...metrics]);
    return true;
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

    // We want to ensure that the metrics are sent after any `onPreResponse` hooks
    server.events.on('response', (request) => {
        /*
          Handle case when client kills the connection
          https://github.com/hapijs/hapi/blob/master/API.md#-response-event
        */
        if (!request.response) {
            return;
        }

        // Skip excluded URLs
        if (settings.excludedPaths.indexOf(request.url.pathname) !== -1) {
            return;
        }

        const startDate = new Date(request.info.received);
        const endDate = new Date();
        const ms = endDate - startDate;

        const localTags = settings.defaultTags.reduce((prev, tag) => {
            prev.push(`${tag}:${tagMap[tag](request)}`);
            return prev;
        }, []);
        const stateTags = get(request, 'plugins.dogstatsd.tags', []);
        Hoek.merge(localTags, stateTags);

        const defaultMetrics = [{
            type: 'incr',
            name: 'route.hits',
            value: null,
            localTags
        }, {
            type: 'gauge',
            name: 'route.response_time',
            value: ms,
            localTags
        }, {
            type: 'timer',
            name: 'route',
            value: ms,
            localTags
        }];
        const stateMetrics = get(request, 'plugins.dogstatsd.metrics', []);
        Hoek.merge(defaultMetrics, stateMetrics);

        for (const metric of defaultMetrics) {
            const { type, name, value, tags = [] } = metric;
            const combinedTags = [...localTags, ...tags];
            debug({ type, name, value, tags: combinedTags });
            dogstatsdClient[type](name, value, combinedTags);
        }
    });
};

exports.pkg = require('../package.json');
