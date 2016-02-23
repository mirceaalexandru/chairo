# chairo

[![npm version][npm-badge]][npm-url]
[![Build Status][travis-badge]][travis-url]

**chairo** ("happy" in ancient Greek: χαίρω) is a [**Seneca**](http://senecajs.org/) micro-services plugin
for [hapi](https://github.com/hapijs/hapi). The plugin integrates the **Seneca** functionality into
**hapi** and provide tools to map its actions to server methods and views for easy access.

Lead Maintainer - [Wyatt Preul](https://github.com/geek)

### Usage

#### Plugin Registration

**chairo** is registered with a **hapi** server using the `server.register()` method. Once
registered it decorates the `server` object with a reference to the `seneca` object initialized
using the provided plugin options. Default plugin options:

 * `log`: `silent`
 * `actcache`:
     * `active`: `false`

You can add a custom `seneca` web plugin by passing in a function on the `web`
property.  If `web` is passed in, then the default web plugin for seneca is
disabled.  `web` must be a function to add custom web functionality.  To disable
the seneca-web plugin set `web` to `false`.


```js
const Chairo = require('chairo');
const Hapi = require('hapi');

const server = new Hapi.Server();
server.connection();

// Register plugin

server.register({ register: Chairo }, function (err) {

	// Add a Seneca action

    let id = 0;
    server.seneca.add({ generate: 'id' }, function (message, next) {

        return next(null, { id: ++id });
    });

	// Invoke a Seneca action

    server.seneca.act({ generate: 'id' }, function (err, result) {

        // result: { id: 1 }
    });
});
```

In addition, the **hapi** request object is decorated with a reference to the `seneca` object for
easy access:

```js
server.route({
	method: 'POST',
	path: '/id',
	handler: function (request, reply) {

		// Invoke a Seneca action using the request decoration

		request.seneca.act({ generate: 'id' }, function (err, result) {

			if (err) {
				return reply(err);
			}

			return reply(result);
		});
	}
});
```

#### `server.action(name, pattern, [options])`

Maps a **Seneca** action pattern to a **hapi**
[server method](https://github.com/hapijs/hapi/blob/master/API.md#servermethodname-method-options)
 where:
- `name` - the server method name (same as the name used in `server.method()`).
- `pattern` - the **Seneca** action pattern (e.g. `'generate:id'` or `{ generate: 'id' }`) to map.
- `options` - optional settings options where:
    - `cache` - method caching options (same as the name used in `server.method()`).
    - `generateKey` - method generating custom cache key (same as the name used in `server.method()`).

```js
const Chairo = require('chairo');
const Hapi = require('hapi');

const server = new Hapi.Server();
server.connection();
server.register(Chairo, function (err) {

	// Set up a Seneca action

    var id = 0;
    server.seneca.add({ generate: 'id' }, function (message, next) {

        return next(null, { id: ++id });
    });

    server.seneca.add({ calc: 'average' }, function (message, next) {

        return next(null, { average: ( message.samples.dataset.values[0] + message.samples.dataset.values[0] ) / 2 });
    });

	// Map action to a hapi server method

    server.action('generate', 'generate:id', { cache: { expiresIn: 1000, generateTimeout: 3000 } });

    // Map action to a hapi server method with custom generateKey method

    server.action('average', 'calc:average', { cache: { expiresIn: 1000, generateTimeout: 3000 } }, generateKey: function (message) {

        return 'average-' + message.samples.dataset.values[0] + ':' + message.samples.dataset.values[1];
    });

	// Start hapi server (starts cache)

    server.start(function () {

		// Invoke server method

        server.methods.generate(function (err, result1) {

			// Invoke the same server method

            server.methods.generate(function (err, result2) {

				// result1 === result2 (cached)

                server.methods.average({ samples: { dataset: values: [2, 3] } }, function (err, avg1) {

                    server.methods.average({ samples: { dataset: values: [2, 3] } }, function (err, avg2) {

                        // avg1 == avg2 (cached)
                    });
                });
            });
        });
    });
});
```

#### `reply.act(pattern)`

Sends back a handler response using the result of a **Seneca** action where:
- `pattern` - the **Seneca** action called to generate the response.

```js
const Chairo = require('chairo');
const Hapi = require('hapi');

const server = new Hapi.Server();
server.connection();
server.register(Chairo, function (err) {

	// Set up a Seneca action

    var id = 0;
    server.seneca.add({ generate: 'id' }, function (message, next) {

        return next(null, { id: ++id });
    });

	// Add route

    server.route({
		method: 'POST',
		path: '/id',
		handler: function (request, reply) {

			// Reply using a Seneca action

			return reply.act({ generate: 'id' });
		}
	});
});
```

In addition, the `act` handler shortcut is also provided:

```js
server.route({
	method: 'POST',
	path: '/id',
	handler: { act: 'generate:id' }
});
```

#### `reply.compose(template, context, [options])`

Renders a template view using the provided template and context where:
- `template` - the view engine template (same as the name used in
  [`reply.view()`](https://github.com/hapijs/hapi/blob/master/API.md#replyviewtemplate-context-options)).
- `context` - the context object used to render the template. `Chairo` provides a special key `$resolve` where you can map context variables to **Seneca** actions matching they key's value pattern. Each of the services mapped to keys is resolved and the resultant key value maps are copied to the context root before redering the template.
- `options` - optional settings passed to `reply.view()`.

_It requires the `vision` plugin to be registered with Hapi._

```js
const Chairo = require('chairo');
const Handlebars = require('handlebars');
const Vision = require('vision');
const Hapi = require('hapi');

const server = new Hapi.Server();
server.connection();
server.register([Chairo, Vision], function (err) {

	// set up a few Seneca actions

    server.seneca.add({ lookup: 'date' }, function (message, next) {

        return next(null, { date: (new Date()).toString() });
    });

    server.seneca.add({ load: 'user' }, function (message, next) {

        return next(null, { name: message.name });
    });

	// Set up a hapi view engine

    server.views({
        engines: { html: Handlebars },
        path: __dirname + '/templates'
    });

	// Add route

    server.route({
        method: 'GET',
        path: '/',
        handler: function (request, reply) {

			// Setup context with both Seneca actions and simple keys

            var context = {
                $resolve: {
                    today: 'lookup:date',					// Using string pattern
                    user: { load: 'user', name: 'john' }			// Using object pattern
                },
                general: {
                    message: 'hello!'
                }
            };

			// Reply with rendered view

            return reply.compose('example', context);
        }
    });
});
```

Using the template `./templates/example.html`:

```html
<div>
    <h1>{{today.date}}</h1>
    <h2>{{user.name}}</h2>
    <h3>{{general.message}}</h3>
</div>
```

In addition, the `compose` handler shortcut is also provided:

```js
server.route({
	method: 'POST',
	path: '/id',
    handler: {
        compose: {
            template: 'example',
            context: {
                $resolve: {
                    today: 'lookup:date',
                    user: { load: 'user', name: 'john' }
                },
                general: {
                    message: 'hello!'
                }
            }
        }
    }
});
```

[npm-badge]: https://badge.fury.io/js/chairo.svg
[npm-url]: https://badge.fury.io/js/chairo
[travis-badge]: https://api.travis-ci.org/hapijs/chairo.svg
[travis-url]: https://travis-ci.org/hapijs/chairo
