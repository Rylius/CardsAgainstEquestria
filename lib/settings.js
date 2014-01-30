var log = require('logule').init(module);
var _ = require('underscore');

var properties = [
    'maxGames',
    'allowNewGames'
];

exports.maxGames = 200;
exports.allowNewGames = true;

exports.restart = null;
exports.restarting = false;

exports.load = function (config) {
    _.each(properties, function (property) {
        if (config[property] != undefined) {
            if ((typeof exports[property]) == 'boolean') {
                if (config[property].length) {
                    exports[property] = config[property] == 'true';
                } else {
                    exports[property] = !!config[property];
                }
            } else {
                exports[property] = config[property];
            }
        }
    });
};
