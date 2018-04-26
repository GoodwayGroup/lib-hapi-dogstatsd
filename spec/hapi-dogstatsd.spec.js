const assert = require('assert');
const plugin = require('../lib');
const Hapi = require('hapi');

const mockStatsdClient = {
    incStat: '',
    timingStat: '',
    timingDate: '',

    increment(statName) {
        this.incStat = statName;
    },

    timing(statName, date) {
        this.timingStat = statName;
        this.timingDate = date;
    }
};

describe('lib-hapi-dogstatsd plugin tests', () => {
    let server;
    beforeEach(async () => {
        server = new Hapi.Server({
            host: 'localhost',
            port: 8085
        });


        const get = function (request, reply) {
            return 'Success!';
        };

        const err = function (request, reply) {
            return new Error();
        };

        server.route({ method: ['GET', 'OPTIONS'], path: '/', handler: get, config: { cors: true } });
        server.route({ method: 'GET', path: '/err', handler: err, config: { cors: true } });
        server.route({ method: 'GET', path: '/test/{param}', handler: get, config: { cors: true } });

        try {
            return await server.register({
                plugin,
                options: { dogstatsdClient: mockStatsdClient }
            });
        } catch (error) {
            return error;
        }
    });

    it('should expose statsd client to the hapi server', () => {
        assert.equal(server.statsd, mockStatsdClient);
    });

    it('should report stats with no path in stat name', async () => {
        await server.inject('/');
        assert(mockStatsdClient.incStat == 'GET.200');
        assert(mockStatsdClient.timingStat == 'GET.200');
        assert(mockStatsdClient.timingDate instanceof Date);
    });

    it('should report stats with path in stat name', async () => {
        await server.inject('/test/123');
        assert(mockStatsdClient.incStat == 'test_{param}.GET.200');
        assert(mockStatsdClient.timingStat == 'test_{param}.GET.200');
        assert(mockStatsdClient.timingDate instanceof Date);
    });

    it('should report stats with generic not found path', async () => {
        await server.inject('/fnord');
        assert(mockStatsdClient.incStat == '{notFound*}.GET.404');
        assert(mockStatsdClient.timingStat == '{notFound*}.GET.404');
        assert(mockStatsdClient.timingDate instanceof Date);
    });

    it('should report stats with generic CORS path', async () => {
        await server.inject({
            method: 'OPTIONS',
            headers: {
                Origin: 'http://test.domain.com'
            },
            url: '/'
        });
        assert(mockStatsdClient.incStat == '{cors*}.OPTIONS.200');
        assert(mockStatsdClient.timingStat == '{cors*}.OPTIONS.200');
        assert(mockStatsdClient.timingDate instanceof Date);
    });

    it('should not change the status code of a response', async () => {
        const res = await server.inject('/err');
        assert(res.statusCode === 500);
    });
});
