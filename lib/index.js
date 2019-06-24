const DogstatsdClient = require('dog-statsy');
const Hoek = require('@hapi/hoek');

const defaults = {
    dogstatsdClient: null,
    host: 'localhost',
    port: 8125,
    tags: [`env:${process.env.NODE_ENV || 'development'}`],
    prefix: 'hapi',
    excludedPaths: ['/favicon.ico', '/health-check']
};

exports.register = (server, options) => {
    const settings = Hoek.applyToDefaults(defaults, options || {});
    const dogstatsdClient = options.dogstatsdClient || new DogstatsdClient({
        host: settings.host,
        port: settings.port,
        prefix: settings.prefix,
        tags: settings.tags
    });

    server.decorate('server', 'dogstatsd', dogstatsdClient);

    server.ext('onPreResponse', (request, h) => {
        const specials = request._core.router.specials;
        const requestDns = request.headers.host.replace(/:/, '_');
        const urlPath = request.url.pathname;
        let routePath = request.route.path;
        if (settings.excludedPaths.indexOf(urlPath) !== -1) {
            return h.continue;
        }

        if (request._route === specials.notFound.route) {
            routePath = '/{notFound*}';
        } else if (specials.options && request._route === specials.options.route) {
            routePath = '/{cors*}';
        } else if (request._route.path === '/' && request._route.method === 'options') {
            routePath = '/{cors*}';
        }

        const startDate = new Date(request.info.received);
        const endDate = new Date();
        const ms = endDate - startDate;

        const statusCode = (request.response.isBoom)
            ? request.response.output.statusCode : request.response.statusCode;

        const statName = 'route';

        const tags = [
            `dns:${requestDns}`,
            `url_path:${urlPath}`,
            `route_path:${routePath}`,
            `status_code:${statusCode}`,
            `http_method:${request.method.toUpperCase()}`
        ];

        let stateTags = [];
        if (request.plugins.dogstatsd) {
            stateTags = request.plugins.dogstatsd.tags;
        }

        Hoek.merge(tags, stateTags);

        dogstatsdClient.incr(`${statName}.hits`, null, tags);
        dogstatsdClient.gauge(`${statName}.response_time`, ms, tags);
        dogstatsdClient.timer(statName, ms, tags);

        return h.continue;
    });
};

exports.pkg = require('../package.json');
