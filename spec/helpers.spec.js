const plugin = require('../lib');

describe('[helpers]', () => {
    describe('injectMetricTags', () => {
        const injectedTags = ['a:tag', 'b:tag'];

        beforeEach(() => {
            this.requestMock = {};
        });

        it('should create a tags array if none exist', () => {
            plugin.injectMetricTags({
                request: this.requestMock,
                tags: injectedTags
            });
            expect(this.requestMock.plugins.dogstatsd).not.toBeUndefined();
            expect(this.requestMock.plugins.dogstatsd.tags).toEqual(injectedTags);
        });

        it('should add tags to list of existing tags', () => {
            const ogTags = [
                'booyah:plumbus',
                'hulla:baloo'
            ];
            this.requestMock.plugins = {
                dogstatsd: {
                    tags: [
                        ...ogTags
                    ]
                }
            };

            plugin.injectMetricTags({
                request: this.requestMock,
                tags: injectedTags
            });
            expect(this.requestMock.plugins.dogstatsd).not.toBeUndefined();
            expect(this.requestMock.plugins.dogstatsd.tags).toEqual(expect.arrayContaining([
                ...ogTags,
                ...injectedTags
            ]));
        });

        it('should deduplicate the tags list', () => {
            // inject tags once
            plugin.injectMetricTags({
                request: this.requestMock,
                tags: injectedTags
            });
            // inject tags again for some reason
            plugin.injectMetricTags({
                request: this.requestMock,
                tags: injectedTags
            });

            expect(this.requestMock.plugins.dogstatsd).not.toBeUndefined();
            expect(this.requestMock.plugins.dogstatsd.tags).toEqual(injectedTags);
        });
    });

    describe('injectMetrics', () => {
        const injectMetrics = [{
            type: 'gauge',
            name: 'cache.orphans',
            value: 1,
            tags: ['cache_db:test']
        }, {
            type: 'gauge',
            name: 'cache.keys',
            value: 2,
            tags: ['cache_db:test']
        }];

        beforeEach(() => {
            this.requestMock = {};
        });

        it('should create a metrics array if none exist', () => {
            plugin.injectMetrics({
                request: this.requestMock,
                metrics: injectMetrics
            });
            expect(this.requestMock.plugins.dogstatsd).not.toBeUndefined();
            expect(this.requestMock.plugins.dogstatsd.metrics).toEqual(injectMetrics);
        });

        it('should add metrics to list of existing metrics', () => {
            const ogMetrics = [
                'booyah:plumbus',
                'hulla:baloo'
            ];
            this.requestMock.plugins = {
                dogstatsd: {
                    metrics: [
                        ...ogMetrics
                    ]
                }
            };

            plugin.injectMetrics({
                request: this.requestMock,
                metrics: injectMetrics
            });
            expect(this.requestMock.plugins.dogstatsd).not.toBeUndefined();
            expect(this.requestMock.plugins.dogstatsd.metrics).toEqual(expect.arrayContaining([
                ...ogMetrics,
                ...injectMetrics
            ]));
        });

        it('should deduplicate the tags list', () => {
            // inject metrics once
            plugin.injectMetrics({
                request: this.requestMock,
                metrics: injectMetrics
            });

            // inject metrics again for some reason
            plugin.injectMetrics({
                request: this.requestMock,
                metrics: injectMetrics
            });

            expect(this.requestMock.plugins.dogstatsd).not.toBeUndefined();
            expect(this.requestMock.plugins.dogstatsd.metrics).toEqual(injectMetrics);
        });
    });
});
