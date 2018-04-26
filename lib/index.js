const DogstatsdClient = require('dog-statsy');
const Hoek = require('hoek');

const defaults = {
    dogstatsdClient: null,
    host: 'localhost',
    port: 8125,
    tags: ['env:development'],
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
        const path = request.url.pathname;
        if (settings.excludedPaths.indexOf(path) !== -1) {
            return h.continue;
        }

        const startDate = new Date(request.info.received);
        const endDate = new Date();
        const ms = endDate - startDate;

        const statusCode = (request.response.isBoom)
            ? request.response.output.statusCode : request.response.statusCode;

        const statName = 'route';

        const tags = [
            `path:${path}`,
            `status_code:${statusCode}`,
            `http_method:${request.method.toUpperCase()}`
        ];

        let stateTags = [];
        if (request.plugins.dogstatsd) {
            stateTags = request.plugins.dogstatsd.tags;
        }

        Hoek.merge(tags, stateTags);

        dogstatsdClient.incr(statName, null, tags);
        dogstatsdClient.gauge(`${statName}.response_time`, ms, tags);
        dogstatsdClient.timer(statName, ms, tags);

        return h.continue;
    });
};

exports.pkg = require('../package.json');
