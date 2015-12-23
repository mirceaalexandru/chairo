'use strict';

// Load modules

const Hoek = require('hoek');
const Items = require('items');
const Joi = require('joi');
const Jsonic = require('jsonic');
const Seneca = require('seneca');


// Declare internals

const internals = {
    replies: {},
    handlers: {}
};


exports.register = function (server, options, next) {

    const defaults = {
        'log': 'silent',
        'actcache': {
            'active': false
        }
    };

    const settings = Hoek.applyToDefaults(defaults, options);
    const seneca = Seneca(settings);


    server.decorate('server', 'seneca', seneca);
    server.decorate('server', 'action', internals.action(server));

    server.decorate('request', 'seneca', internals.request(seneca), { apply: true });

    server.decorate('reply', 'act', internals.replies.act);
    server.decorate('reply', 'compose', internals.replies.compose);

    server.handler('act', internals.handlers.act);
    server.handler('compose', internals.handlers.compose);

    if (settings.webPlugin){
        seneca.use(settings.webPlugin);
    }
    seneca.export('web/hapi')(server, options, next);

    return next();
};


exports.register.attributes = {
    pkg: require('../package.json')
};


internals.actionSchema = Joi.object({ cache: Joi.object(), generateKey: Joi.func() });


internals.action = function (server) {

    return function (name, pattern, options) {

        Joi.assert(options, internals.actionSchema, 'Invalid action options');     // Allow only cache option

        if (typeof pattern === 'string') {
            pattern = Jsonic(pattern);
        }

        const method = function (additions, callback) {

            if (typeof additions === 'function') {
                callback = additions;
                additions = null;
            }

            if (additions) {
                return server.seneca.act(Hoek.applyToDefaults(pattern, typeof additions === 'string' ? Jsonic(additions) : additions), callback);
            }

            return server.seneca.act(pattern, callback);
        };

        if (options &&
            options.cache) {

            const defaults = {
                generateKey: function (additions) {

                    if (!additions) {
                        return '{}';
                    }

                    if (typeof additions === 'string') {
                        additions = Jsonic(additions);
                    }

                    const keys = Object.keys(additions);
                    let result = '';
                    for (let i = 0; i < keys.length; ++i) {
                        const key = keys[i];
                        const value = additions[key];

                        if (typeof value === 'object') {
                            return null;                                    // Cannot cache complex criteria
                        }

                        if (i) {
                            result += ',';
                        }

                        result += encodeURIComponent(key) + ':' + encodeURIComponent(value.toString());
                    }

                    return result;
                }
            };
            const settings = Hoek.applyToDefaults(defaults, options);

            return server.method(name, method, settings);
        }

        return server.method(name, method);
    };
};


internals.request = function (seneca) {

    return (request) => {

        return seneca.delegate({
            req$: request,
            res$: request.raw.res,
            tx$:  seneca.root.idgen()
        });
    };
};


internals.replies.act = function (pattern) {

    this.request.seneca.act(pattern, (err, result) => {

        this.response(err || result);
    });
};


internals.replies.compose = function (template, context, options) {

    const composed = Hoek.clone(context);
    const actions = internals.collectActions(composed);
    const seneca = this.request.seneca;
    const each = (action, next) => {

        seneca.act(action.pattern, (err, result) => {

            if (err) {
                return next(err);
            }

            action.parent[action.key] = result;
            return next();
        });
    };

    Items.parallel(actions, each, (err) => {

        if (err) {
            return this.response(err);
        }

        return this.view(template, composed, options);
    });
};


internals.collectActions = function (context, results) {

    results = results || [];

    if (context) {
        const keys = Object.keys(context);
        for (let i = 0; i < keys.length; ++i) {
            const key = keys[i];
            const value = context[key];

            if (key[key.length - 1] === '$') {
                results.push({ parent: context, key: key, pattern: value });
            }
            else if (typeof value === 'object') {
                internals.collectActions(value, results);
            }
        }
    }

    return results;
};


internals.handlers.act = function (route, options) {

    return function (request, reply) {

        let pattern = options;
        if (typeof pattern === 'string') {
            const context = {
                params: request.params,
                query: request.query,
                payload: request.payload
            };

            pattern = Hoek.reachTemplate(context, pattern);
        }

        return reply.act(pattern);
    };
};


internals.composeSchema = Joi.object({
    template: Joi.string().required(),
    context: Joi.object().required(),
    options: Joi.object()
});


internals.handlers.compose = function (route, options) {

    Joi.assert(options, internals.composeSchema, 'Invalid compose handler options (' + route.path + ')');

    return function (request, reply) {

        const context = {
            params: request.params,
            payload: request.payload,
            query: request.query,
            pre: request.pre
        };

        const keys = Object.keys(options.context);
        for (let i = 0; i < keys.length; ++i) {
            const key = keys[i];
            context[key] = options.context[key];
        }

        return reply.compose(options.template, context, options.options);
    };
};
