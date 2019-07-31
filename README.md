# lib-hapi-dogstatsd

[![CircleCI](https://circleci.com/gh/GoodwayGroup/lib-hapi-dogstatsd.svg?style=svg)](https://circleci.com/gh/GoodwayGroup/lib-hapi-dogstatsd)

> Please do not run this plugin within tests in your application

## Usage

This plugin will send metrics regarding route performance on every request to the Hapi server.

For the `prefix`, please the name of the service that you are integrating with (neato-service, cool-api, etc)

```
$ yarn add @goodwaygroup/lib-hapi-dogstatsd
```

In your `index.js` for the Hapi server, register the plugin:

```js
const HapiDogstatsd = require('@goodwaygroup/lib-hapi-dogstatsd')

// Dogstatsd
if (process.env.DOGSTATSD_HOST && process.env.NODE_ENV !== 'test') {
    await server.register({
        plugin: HapiDogstatsd,
        options: {
            host: process.env.DOGSTATSD_HOST,
            port: process.env.DOGSTATSD_PORT || 8125,
            tags: [`env:${process.env.NODE_ENV || 'development'}`],
            prefix: 'neato-service'
        }
    });
}
```

## Configuration Options

> When passing a configuration option, it will overwrite the defaults.

- `host`: The host running the Datadog Daemon with dogstatsd configured
- `port`: Port for dogstatsd
    - default: `8125`
- `prefix`: A prefix that will be prepended to all metrics sent to DataDog
    - default: `hapi`
- `tags`: An array of tags that will be applied to all metrics that are sent
    - default: ```[`env:${process.env.NODE_ENV || 'development'}`]```
- `excludedPaths`: An array of URL paths to ignore sending metrics for.
    - default: `['/favicon.ico', '/health-check']`
- `excludedTags`: An array of tag keys that will be excluded from the default list of tags added to each metric. The default list of tags is: `dns, url_path, route_path, status_code, http_method`
    - default: `[]`

### Route Based Tags

To add custom tags specific to a route, use the [response.plugin](https://github.com/hapijs/hapi/blob/master/API.md#response.plugins) state block to pass `tags` to the plugin. These tags will be merged with the default tags that are generated.

```js
response.plugins['dogstatsd'] = { tags: ['custom:tag', 'key:value'] }
```

### Route Based Metrics

To add custom metrics specific to a route, use the [response.plugin](https://github.com/hapijs/hapi/blob/master/API.md#response.plugins) state block to pass `metrics` to the plugin. These metrics will be merged with the default metrics that are generated.

The `metrics` will need to have the following structure.

```js
response.plugins.dogstatsd.metrics = [{
    type: 'gauge',
    name: 'cache.orphans',
    value: 123,
    tags: [`cache_db:${cache}`]
}, {
    type: 'incr',
    name: 'cache.hit',
    value: null,
    tags: [`cache_db:${cache}`]
}]
```

### Default Tags

These tags are set on every request:

```js
const tags = [
    `env:${process.env.NODE_ENV || 'development'}`,
    `dns:${request.headers.host}`,
    `url_path:${request.url.pathname}`,
    `route_path:${request.route.path}`,
    `status_code:${statusCode}`,
    `http_method:${request.method.toUpperCase()}`
];
```

Example:

```
[
    'end:production',
    'dns:github.com',
    'url_path:/api/v1/user/34/edit',
    'route_path:/api/v1/user/{id}/edit',
    'status_code:200',
    'http_method:POST'
]
```

## Running Tests

To run tests, just run the following:

```
yarn test
```

All commits are tested on [CircleCI](https://circleci.com/gh/GoodwayGroup/workflows/lib-hapi-dogstatsd)

## Linting

To run `eslint`:

```
yarn lint
```

To auto-resolve:

```
yarn lint:fix
```

## Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct, and the process for submitting pull requests to us.

## Versioning

We use milestones and `npm` version to bump versions. We also employ [auto-changelog](https://www.npmjs.com/package/auto-changelog) to manage the [CHANGELOG.md](CHANGELOG.md). For the versions available, see the [tags on this repository](https://github.com/GoodwayGroup/lib-hapi-dogstatsd/tags).

To initiate a version change:

```
yarn version
```

## Authors

* **Derek Smith** - *Initial work* - [@clok](https://github.com/clok)

See also the list of [contributors](https://github.com/GoodwayGroup/lib-hapi-dogstatsd/contributors) who participated in this project.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details

## Acknowledgments

* Inspired by the great work done by [@mac-](https://github.com/mac-) in [hapi-statsd](https://github.com/mac-/hapi-statsd)
* Uses the [dog-statsy](https://github.com/segmentio/dog-statsy) module.

## Sponsors

[![goodwaygroup][goodwaygroup]](https://goodwaygroup.com)

[goodwaygroup]: https://s3.amazonaws.com/gw-crs-assets/goodwaygroup/logos/ggLogo_sm.png "Goodway Group"
