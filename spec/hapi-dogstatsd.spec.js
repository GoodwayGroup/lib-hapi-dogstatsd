const assert = require('assert');
const Hapi = require('@hapi/hapi');
const plugin = require('../lib');

describe('lib-hapi-dogstatsd plugin tests', () => {
    describe('general use case', () => {
        let server;
        let mockStatsdClient;

        beforeEach(async () => {
            mockStatsdClient = {
                incr: jest.fn(),
                gauge: jest.fn(),
                timer: jest.fn(),
                booyah: jest.fn()
            };

            server = new Hapi.Server({
                host: 'localhost',
                port: 8085
            });

            const get = () => 'Success!';

            const err = () => new Error();

            const withTags = (request) => {
                request.plugins.dogstatsd = {
                    tags: ['tag1:true', 'tag2:false']
                };
                return 'Success!';
            };

            const withMetrics = (request) => {
                request.plugins.dogstatsd = {
                    metrics: [{
                        type: 'booyah',
                        name: 'rick.morty',
                        value: 1337,
                        tags: ['tag:special']
                    }]
                };
                return 'Success!';
            };

            server.route({
                method: ['GET', 'OPTIONS'], path: '/', handler: get, config: { cors: true }
            });
            server.route({
                method: 'GET', path: '/throwError', handler: err, config: { cors: true }
            });
            server.route({ method: 'GET', path: '/test/withtags', handler: withTags });
            server.route({ method: 'GET', path: '/test/withmetrics', handler: withMetrics });
            server.route({
                method: 'GET', path: '/test/{param}', handler: get, config: { cors: true }
            });
            server.route({ method: 'GET', path: '/favicon.ico', handler: get });
            server.route({ method: 'GET', path: '/health-check', handler: get });

            return server.register({
                plugin,
                options: { dogstatsdClient: mockStatsdClient }
            });
        });

        it('should expose dogstatsd client to the hapi server', () => {
            assert.equal(server.dogstatsd, mockStatsdClient);
        });

        it('should report stats for root path', async () => {
            const tags = ['dns:localhost_8085', 'url_path:/', 'route_path:/', 'status_code:200', 'http_method:GET'];
            await server.inject('/');
            expect(mockStatsdClient.incr).toHaveBeenCalledWith('route.hits', null, tags);
            expect(mockStatsdClient.gauge).toHaveBeenCalledWith('route.response_time', expect.any(Number), tags);
            expect(mockStatsdClient.timer).toHaveBeenCalledWith('route', expect.any(Number), tags);
        });

        it('should report stats with path name set explicitly', async () => {
            const tags = ['dns:localhost_8085', 'url_path:/test/path', 'route_path:/test/{param}', 'status_code:200', 'http_method:GET'];
            await server.inject('/test/path');
            expect(mockStatsdClient.incr).toHaveBeenCalledWith('route.hits', null, tags);
            expect(mockStatsdClient.gauge).toHaveBeenCalledWith('route.response_time', expect.any(Number), tags);
            expect(mockStatsdClient.timer).toHaveBeenCalledWith('route', expect.any(Number), tags);
        });

        it('should report stats with merging tags from route', async () => {
            const tags = ['dns:localhost_8085', 'url_path:/test/withtags', 'route_path:/test/withtags', 'status_code:200', 'http_method:GET', 'tag1:true', 'tag2:false'];
            await server.inject('/test/withtags');
            expect(mockStatsdClient.incr).toHaveBeenCalledWith('route.hits', null, tags);
            expect(mockStatsdClient.gauge).toHaveBeenCalledWith('route.response_time', expect.any(Number), tags);
            expect(mockStatsdClient.timer).toHaveBeenCalledWith('route', expect.any(Number), tags);
        });

        it('should report stats with merging metrics from route', async () => {
            const tags = ['dns:localhost_8085', 'url_path:/test/withmetrics', 'route_path:/test/withmetrics', 'status_code:200', 'http_method:GET'];
            await server.inject('/test/withmetrics');
            expect(mockStatsdClient.incr).toHaveBeenCalledWith('route.hits', null, tags);
            expect(mockStatsdClient.gauge).toHaveBeenCalledWith('route.response_time', expect.any(Number), tags);
            expect(mockStatsdClient.timer).toHaveBeenCalledWith('route', expect.any(Number), tags);
            expect(mockStatsdClient.booyah).toHaveBeenCalledWith('rick.morty', expect.any(Number), [...tags, 'tag:special']);
        });

        it('should report proper HTTP status', async () => {
            const tags = ['dns:localhost_8085', 'url_path:/notFound', 'route_path:/{notFound*}', 'status_code:404', 'http_method:GET'];
            await server.inject('/notFound');
            expect(mockStatsdClient.incr).toHaveBeenCalledWith('route.hits', null, tags);
            expect(mockStatsdClient.gauge).toHaveBeenCalledWith('route.response_time', expect.any(Number), tags);
            expect(mockStatsdClient.timer).toHaveBeenCalledWith('route', expect.any(Number), tags);
        });

        it('should report report the proper HTTP method', async () => {
            const tags = ['dns:localhost_8085', 'url_path:/', 'route_path:/{cors*}', 'status_code:200', 'http_method:OPTIONS'];
            await server.inject({
                method: 'OPTIONS',
                headers: {
                    Origin: 'http://test.domain.com'
                },
                url: '/'
            });
            expect(mockStatsdClient.incr).toHaveBeenCalledWith('route.hits', null, tags);
            expect(mockStatsdClient.gauge).toHaveBeenCalledWith('route.response_time', expect.any(Number), tags);
            expect(mockStatsdClient.timer).toHaveBeenCalledWith('route', expect.any(Number), tags);
        });

        it('should not change the status code of a response', async () => {
            const tags = ['dns:localhost_8085', 'url_path:/throwError', 'route_path:/throwError', 'status_code:500', 'http_method:GET'];
            const res = await server.inject('/throwError');
            expect(res.statusCode).toBe(500);
            expect(mockStatsdClient.incr).toHaveBeenCalledWith('route.hits', null, tags);
            expect(mockStatsdClient.gauge).toHaveBeenCalledWith('route.response_time', expect.any(Number), tags);
            expect(mockStatsdClient.timer).toHaveBeenCalledWith('route', expect.any(Number), tags);
        });

        it('should not report stats for /health-check', async () => {
            const res = await server.inject('/health-check');
            expect(res.statusCode).toBe(200);
            expect(mockStatsdClient.incr).not.toHaveBeenCalled();
            expect(mockStatsdClient.gauge).not.toHaveBeenCalled();
            expect(mockStatsdClient.timer).not.toHaveBeenCalled();
        });

        it('should not report stats for /favicon.ico', async () => {
            const res = await server.inject('/favicon.ico');
            expect(res.statusCode).toBe(200);
            expect(mockStatsdClient.incr).not.toHaveBeenCalled();
            expect(mockStatsdClient.gauge).not.toHaveBeenCalled();
            expect(mockStatsdClient.timer).not.toHaveBeenCalled();
        });
    });

    describe('validate client creation', () => {
        let server;
        let mockStatsdClient;

        beforeEach(async () => {
            mockStatsdClient = {
                incr: jest.fn(),
                gauge: jest.fn(),
                timer: jest.fn()
            };

            server = new Hapi.Server({
                host: 'localhost',
                port: 8085
            });

            return server.register({ plugin });
        });

        it('should expose dogstatsd client to the hapi server', () => {
            assert.notEqual(server.dogstatsd, mockStatsdClient);
        });
    });

    describe('excludedTags', () => {
        let server;
        let mockStatsdClient;

        beforeEach(async () => {
            mockStatsdClient = {
                incr: jest.fn(),
                gauge: jest.fn(),
                timer: jest.fn()
            };

            server = new Hapi.Server({
                host: 'localhost',
                port: 8085
            });

            const get = () => 'Success!';

            server.route({ method: 'GET', path: '/test', handler: get });

            return server.register({
                plugin,
                options: {
                    dogstatsdClient: mockStatsdClient,
                    excludedTags: ['route_path', 'dns']
                }
            });
        });

        it('should report stats excluding the DNS and route path tags', async () => {
            const tags = ['url_path:/test', 'status_code:200', 'http_method:GET'];
            await server.inject('/test');
            expect(mockStatsdClient.incr).toHaveBeenCalledWith('route.hits', null, tags);
            expect(mockStatsdClient.gauge).toHaveBeenCalledWith('route.response_time', expect.any(Number), tags);
            expect(mockStatsdClient.timer).toHaveBeenCalledWith('route', expect.any(Number), tags);
        });
    });

    describe('options', () => {
        let server;
        beforeEach(async () => {
            server = new Hapi.Server({
                host: 'localhost',
                port: 8085
            });

            return server.register({
                plugin,
                options: {
                    tags: ['test:tag'],
                    prefix: 'booyah'
                }
            });
        });

        it('should overwrite the default global tags', () => {
            expect(server.dogstatsd.tags).toEqual(['test:tag']);
        });

        it('should overwrite the default prefix', () => {
            expect(server.dogstatsd.prefix).toEqual('booyah');
        });
    });
});
