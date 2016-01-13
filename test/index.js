'use strict';

// Load modules

const Code = require('code');
const Hapi = require('hapi');
const Lab = require('lab');
const Chairo = require('../');

// Declare internals

const internals = {};


// Test shortcuts

const lab = exports.lab = Lab.script();
const describe = lab.describe;
const it = lab.it;
const expect = Code.expect;


process.setMaxListeners(0);             // Remove warning caused by creating multiple framework instances


describe('register()', () => {

    it('exposes a seneca instance', (done) => {

        const server = new Hapi.Server();
        server.connection();
        server.register({ register: Chairo }, (err) => {

            expect(err).to.not.exist();

            let id = 0;
            server.seneca.add({ generate: 'id' }, (message, next) => {

                return next(null, { id: ++id });
            });

            server.seneca.act({ generate: 'id' }, (err, result) => {

                expect(err).to.not.exist();
                expect(result).to.deep.equal({ id: 1 });
                done();
            });
        });
    });
});

describe('action()', () => {

    it('maps an action to a server method', (done) => {

        const server = new Hapi.Server();
        server.connection();
        server.register({ register: Chairo }, (err) => {

            expect(err).to.not.exist();

            let id = 0;
            server.seneca.add({ generate: 'id' }, (message, next) => {

                return next(null, { id: ++id });
            });

            server.action('generate', 'generate:id');

            server.methods.generate((err, result) => {

                expect(err).to.not.exist();
                expect(result).to.deep.equal({ id: 1 });

                server.methods.generate((err, result2) => {

                    expect(err).to.not.exist();
                    expect(result2).to.deep.equal({ id: 2 });
                    done();
                });
            });
        });
    });

    it('maps an action to a server method (cached)', (done) => {

        const server = new Hapi.Server();
        server.connection();
        server.register({ register: Chairo }, (err) => {

            expect(err).to.not.exist();

            let id = 0;
            server.seneca.add({ generate: 'id' }, (message, next) => {

                return next(null, { id: ++id });
            });

            server.action('generate', 'generate:id', { cache: { expiresIn: 1000, generateTimeout: 3000 } });

            server.start(() => {

                server.methods.generate((err, result1) => {

                    expect(err).to.not.exist();
                    expect(result1).to.deep.equal({ id: 1 });

                    server.methods.generate((err, result2) => {

                        expect(err).to.not.exist();
                        expect(result2).to.deep.equal({ id: 1 });
                        done();
                    });
                });
            });
        });
    });

    it('maps an action to a server method (cached with custom generateKey)', (done) => {

        const server = new Hapi.Server();
        server.connection();
        server.register({ register: Chairo }, (err) => {

            expect(err).to.not.exist();

            server.seneca.add({ generate: 'id' }, (message, next) => {

                return next(null, { result: message.samples.readings.values[0] * message.samples.readings.values[1] });
            });

            server.action('generate', { generate: 'id' }, { cache: { expiresIn: 1000, generateTimeout: 3000 }, generateKey: (message) => {

                return 'id' +  message.samples.readings.values[0] + ':' +  message.samples.readings.values[1];
            } });

            server.start(() => {

                server.methods.generate({ samples: { readings: { values: [2, 3] } } }, (err, result1) => {

                    expect(err).to.not.exist();
                    expect(result1).to.deep.equal({ result: 6 });

                    server.methods.generate({ samples: { readings: { values: [2, 3] } } }, (err2, result2) => {

                        expect(err2).to.not.exist();
                        expect(result2).to.deep.equal({ result: 6 });
                        done();
                    });
                });
            });
        });
    });

    it('maps an action to a server method (object pattern)', (done) => {

        const server = new Hapi.Server();
        server.connection();
        server.register({ register: Chairo }, (err) => {

            expect(err).to.not.exist();

            server.seneca.add({ generate: 'id' }, (message, next) => {

                return next(null, { id: 1 });
            });

            server.action('generate', { generate: 'id' });

            server.methods.generate((err, result) => {

                expect(err).to.not.exist();
                expect(result).to.deep.equal({ id: 1 });
                done();
            });
        });
    });

    it('maps an action to a server method (additions)', (done) => {

        const server = new Hapi.Server();
        server.connection();
        server.register({ register: Chairo }, (err) => {

            expect(err).to.not.exist();

            server.seneca.add({ generate: 'id' }, (message, next) => {

                return next(null, { id: 1, name: message.name });
            });

            server.action('generate', { generate: 'id' });

            server.methods.generate('name:steve', (err, result) => {

                expect(err).to.not.exist();
                expect(result).to.deep.equal({ id: 1, name: 'steve' });
                done();
            });
        });
    });

    it('maps an action to a server method (object additions)', (done) => {

        const server = new Hapi.Server();
        server.connection();
        server.register({ register: Chairo }, (err) => {

            expect(err).to.not.exist();

            server.seneca.add({ generate: 'id' }, (message, next) => {

                return next(null, { id: 1, name: message.name });
            });

            server.action('generate', { generate: 'id' });

            server.methods.generate({ name: 'steve' }, (err, result) => {

                expect(err).to.not.exist();
                expect(result).to.deep.equal({ id: 1, name: 'steve' });
                done();
            });
        });
    });

    it('maps an action to a server method (cached additions)', (done) => {

        const server = new Hapi.Server();
        server.connection();
        server.register({ register: Chairo }, (err) => {

            expect(err).to.not.exist();

            let id = 0;
            server.seneca.add({ generate: 'id' }, (message, next) => {

                return next(null, { id: ++id, name: message.name });
            });

            server.action('generate', 'generate:id', { cache: { expiresIn: 1000, generateTimeout: 3000 } });

            server.start(() => {

                server.methods.generate('name:steve', (err, result1) => {

                    expect(err).to.not.exist();
                    expect(result1.id).to.equal(1);

                    server.methods.generate('name:steve', (err, result2) => {

                        expect(err).to.not.exist();
                        expect(result1.id).to.equal(1);
                        done();
                    });
                });
            });
        });
    });

    it('maps an action to a server method (cached object additions)', (done) => {

        const server = new Hapi.Server();
        server.connection();
        server.register({ register: Chairo }, (err) => {

            expect(err).to.not.exist();

            let id = 0;
            server.seneca.add({ generate: 'id' }, (message, next) => {

                return next(null, { id: ++id, name: message.name });
            });

            server.action('generate', 'generate:id', { cache: { expiresIn: 1000, generateTimeout: 3000 } });

            server.start(() => {

                server.methods.generate({ name: 'steve' }, (err, result1) => {

                    expect(err).to.not.exist();
                    expect(result1.id).to.equal(1);

                    server.methods.generate({ name: 'steve' }, (err, result2) => {

                        expect(err).to.not.exist();
                        expect(result1.id).to.equal(1);
                        done();
                    });
                });
            });
        });
    });

    it('maps an action to a server method (cached object additions with multiple keys)', (done) => {

        const server = new Hapi.Server();
        server.connection();
        server.register({ register: Chairo }, (err) => {

            expect(err).to.not.exist();

            let id = 0;
            server.seneca.add({ generate: 'id' }, (message, next) => {

                return next(null, { id: ++id, name: message.pre + message.name });
            });

            server.action('generate', 'generate:id', { cache: { expiresIn: 1000, generateTimeout: 3000 } });

            server.start(() => {

                server.methods.generate({ name: 'steve', pre: 'mr' }, (err, result1) => {

                    expect(err).to.not.exist();
                    expect(result1.id).to.equal(1);

                    server.methods.generate({ name: 'steve', pre: 'mr' }, (err, result2) => {

                        expect(err).to.not.exist();
                        expect(result1.id).to.equal(1);
                        done();
                    });
                });
            });
        });
    });

    it('maps an action to a server method (cached additions over both string and object)', (done) => {

        const server = new Hapi.Server();
        server.connection();
        server.register({ register: Chairo }, (err) => {

            expect(err).to.not.exist();

            let id = 0;
            server.seneca.add({ generate: 'id' }, (message, next) => {

                return next(null, { id: ++id, name: message.pre + message.name });
            });

            server.action('generate', 'generate:id', { cache: { expiresIn: 1000, generateTimeout: 3000 } });

            server.start(() => {

                server.methods.generate({ name: 'steve', pre: 'mr' }, (err, result1) => {

                    expect(err).to.not.exist();
                    expect(result1.id).to.equal(1);

                    server.methods.generate('name:steve,pre:mr', (err, result2) => {

                        expect(err).to.not.exist();
                        expect(result1.id).to.equal(1);
                        done();
                    });
                });
            });
        });
    });

    it('does not cache object additions with nested objects', (done) => {

        const server = new Hapi.Server();
        server.connection();
        server.register({ register: Chairo }, (err) => {

            expect(err).to.not.exist();

            let id = 0;
            server.seneca.add({ generate: 'id' }, (message, next) => {

                return next(null, { id: ++id });
            });

            server.action('generate', 'generate:id', { cache: { expiresIn: 1000, generateTimeout: 3000 } });

            server.start(() => {

                server.methods.generate({ price: { a: 'b' } }, (err, result) => {

                    expect(err).to.exist();
                    expect(result).to.not.exist();
                    done();
                });
            });
        });
    });
});

describe('Request', () => {

    it('has access to seneca delegate with raw req/res', (done) => {

        const server = new Hapi.Server();
        server.connection();
        server.register({ register: Chairo }, (err) => {

            expect(err).to.not.exist();

            const handler = function (request, reply) {

                return reply(request.seneca.fixedargs.req$.url.path);
            };

            server.route({ method: 'GET', path: '/', handler: handler });

            server.inject('/', (res) => {

                expect(res.result).to.equal('/');
                done();
            });
        });
    });
});

describe('Replies', () => {

    describe('act()', () => {

        it('returns act result', (done) => {

            const server = new Hapi.Server();
            server.connection();
            server.register({ register: Chairo }, (err) => {

                expect(err).to.not.exist();

                let id = 0;
                server.seneca.add({ generate: 'id' }, (message, next) => {

                    if (++id === 1) {
                        return next(null, { id: 1 });
                    }

                    return next(new Error('failed'));
                });

                const handler = function (request, reply) {

                    return reply.act({ generate: 'id' });
                };

                server.route({ method: 'GET', path: '/', handler: handler });

                server.inject('/', (res) => {

                    expect(res.statusCode).to.equal(200);
                    expect(res.result).to.deep.equal({ id: 1 });

                    server.inject('/', (res2) => {

                        expect(res2.statusCode).to.equal(500);
                        done();
                    });
                });
            });
        });
    });

    describe('compose()', () => {

        it('renders view using multiple actions', (done) => {

            const server = new Hapi.Server();
            server.connection();
            server.register([{ register: Chairo }, require('vision')], (err) => {

                expect(err).to.not.exist();

                server.seneca.add({ generate: 'id' }, (message, next) => {

                    return next(null, { id: 1 });
                });

                server.seneca.add({ record: 'user' }, (message, next) => {

                    return next(null, { name: message.name });
                });

                server.views({
                    engines: { html: require('handlebars') },
                    path: __dirname + '/templates'
                });

                server.route({
                    method: 'GET',
                    path: '/',
                    handler: (request, reply) => {

                        const context = {
                            id$: 'generate:id',
                            user$: { record: 'user', name: 'john' },
                            general: {
                                message: 'hello!'
                            }
                        };

                        return reply.compose('test', context);
                    }
                });

                server.inject('/', (res) => {

                    expect(res.result).to.equal('<div>\n    <h1>1</h1>\n    <h2>john</h2>\n    <h3>hello!</h3>\n</div>\n');
                    done();
                });
            });
        });

        it('errors on missing action', (done) => {

            const server = new Hapi.Server();
            server.connection();
            server.register([{ register: Chairo }, require('vision')], (err) => {

                expect(err).to.not.exist();

                server.seneca.add({ generate: 'id' }, (message, next) => {

                    return next(null, { id: 1 });
                });

                server.views({
                    engines: { html: require('handlebars') },
                    path: __dirname + '/templates'
                });

                server.route({
                    method: 'GET',
                    path: '/',
                    handler: (request, reply) => {

                        const context = {
                            id$: 'generate:id',
                            user$: { record: 'user', name: 'john' },
                            general: {
                                message: 'hello!'
                            }
                        };

                        return reply.compose('test', context);
                    }
                });

                server.inject('/', (res) => {

                    expect(res.statusCode).to.equal(500);
                    done();
                });
            });
        });
    });
});

describe('Handlers', () => {

    describe('act()', () => {

        it('replies with act result', (done) => {

            const server = new Hapi.Server();
            server.connection();
            server.register([{ register: Chairo }, require('vision')], (err) => {

                expect(err).to.not.exist();

                server.seneca.add({ generate: 'id' }, (message, next) => {

                    return next(null, { id: 1 });
                });

                server.route({ method: 'GET', path: '/', handler: { act: { generate: 'id' } } });

                server.inject('/', (res) => {

                    expect(res.statusCode).to.equal(200);
                    expect(res.result).to.deep.equal({ id: 1 });
                    done();
                });
            });
        });

        it('replies with act result (template string)', (done) => {

            const server = new Hapi.Server();
            server.connection();
            server.register({ register: Chairo }, (err) => {

                expect(err).to.not.exist();

                server.seneca.add({ generate: 'id' }, (message, next) => {

                    return next(null, { id: 1 });
                });

                server.route({ method: 'GET', path: '/{type}', handler: { act: 'generate:{params.type}' } });

                server.inject('/id', (res) => {

                    expect(res.statusCode).to.equal(200);
                    expect(res.result).to.deep.equal({ id: 1 });
                    done();
                });
            });
        });
    });

    describe('compose()', () => {

        it('renders view using multiple actions', (done) => {

            const server = new Hapi.Server();
            server.connection();
            server.register([{ register: Chairo }, require('vision')], (err) => {

                expect(err).to.not.exist();

                server.seneca.add({ generate: 'id' }, (message, next) => {

                    return next(null, { id: 1 });
                });

                server.seneca.add({ record: 'user' }, (message, next) => {

                    return next(null, { name: message.name });
                });

                server.views({
                    engines: { html: require('handlebars') },
                    path: __dirname + '/templates'
                });

                server.route({
                    method: 'GET',
                    path: '/',
                    handler: {
                        compose: {
                            template: 'test',
                            context: {
                                id$: 'generate:id',
                                user$: { record: 'user', name: 'john' },
                                general: {
                                    message: 'hello!'
                                }
                            }
                        }
                    }
                });

                server.inject('/', (res) => {

                    expect(res.result).to.equal('<div>\n    <h1>1</h1>\n    <h2>john</h2>\n    <h3>hello!</h3>\n</div>\n');
                    done();
                });
            });
        });
    });
});
