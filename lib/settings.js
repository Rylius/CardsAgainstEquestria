var log = require('logule').init(module);
var _ = require('underscore');

var properties = [
    'maxGames',
    'allowNewGames'
];

exports.maxGames = 200;
exports.allowNewGames = true;

exports.load = function (config) {
    _.each(properties, function (property) {
        if (config[property] != undefined) {
            exports[property] = config[property];
        }
    });
};
