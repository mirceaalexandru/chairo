'use strict';

// Load Modules

var Joi = require('joi');
var Hoek = require('hoek');

// Declare internals

var internals = {};

exports.action = function (options, message) {

    var result = Joi.validate(options, internals.action);
    Hoek.assert(!result.error, message);
};

exports.compose = function (options, message) {

    var result = Joi.validate(options, internals.compose);
    Hoek.assert(!result.error, message);
};

internals.action =  Joi.object({
    cache: Joi.object(),
    generateKey: Joi.func()
});

internals.compose = Joi.object({
    template: Joi.string().required(),
    context: Joi.object().required(),
    options: Joi.object()
});
