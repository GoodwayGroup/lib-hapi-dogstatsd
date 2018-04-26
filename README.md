# lib-hapi-dogstatsd

> Please do not run this plugin within tests in your application

This plugin will send metrics regarding route performance on every request to the Hapi server.

For the `prefix`, please the name of the service that you are integrating with (ddlrequest, ml-api, etc)

In your `index.js` for the Hapi server, register the plugin:

```js
const HapiDogstatsd = require('lib-hapi-dogstatsd')

// Dogstatsd
if (process.env.DOGSTATSD_HOST && process.env.NODE_ENV !== 'test') {
    await server.register({
        plugin: HapiDogstatsd
        options: {
            host: process.env.DOGSTATSD_HOST,
            port: process.env.DOGSTATSD_PORT || 8125,
            tags: [`env:${process.env.NODE_ENV || 'development'}`],
            prefix: 'ml-api'
        }
    });
}
```

### Options

- `host`: The host running the Datadog Daemon with dogstatsd configured
- `port`: Port for dogstatsd
    - default: `8125`
- `prefix`: A prefix that will be prepended to all metrics sent to DataDog
    - default: `hapi`
- `tags`: An array of tags that will be applied to all metrics that are sent
    - default: ```[`env:${process.env.NODE_ENV || 'development'}`]```
- `excludedPaths`: An array of URL paths to ignore sending metrics for.
    - default: `['/favicon.ico', '/health-check']`
