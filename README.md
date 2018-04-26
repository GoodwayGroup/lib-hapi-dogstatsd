# lib-hapi-dogstatsd

> Please do not run this plugin within tests in your application

Inspired by the great work done by [@mac-](https://github.com/mac-) in [hapi-statsd](https://github.com/mac-/hapi-statsd) and uses the [dog-statsy](https://github.com/segmentio/dog-statsy) module.

## Usage

This plugin will send metrics regarding route performance on every request to the Hapi server.

For the `prefix`, please the name of the service that you are integrating with (neato-service, cool-api, etc)

In your `index.js` for the Hapi server, register the plugin:

```js
const HapiDogstatsd = require('@goodwaygroup/lib-hapi-dogstatsd')

// Dogstatsd
if (process.env.DOGSTATSD_HOST && process.env.NODE_ENV !== 'test') {
    await server.register({
        plugin: HapiDogstatsd
        options: {
            host: process.env.DOGSTATSD_HOST,
            port: process.env.DOGSTATSD_PORT || 8125,
            tags: [`env:${process.env.NODE_ENV || 'development'}`],
            prefix: 'neato-service'
        }
    });
}
```

### Options

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

### Route Based Tags

To add custom tags specific to a route, use the [response.plugin](https://github.com/hapijs/hapi/blob/master/API.md#response.plugins) state block to pass `tags` to the plugin. These tags will be merged with the default tags that are generated.

```js
response.plugins['dogstatsd'] = { tags: ['custom:tag', 'key:value'] }
```

### Default Tags

These tags are set on every request:

```js
const tags = [
    `env:${process.env.NODE_ENV || 'development'}`,
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
    'url_path:/api/v1/user/34/edit',
    'route_path:/api/v1/user/{id}/edit',
    'status_code:200',
    'http_method:POST'
]
```
