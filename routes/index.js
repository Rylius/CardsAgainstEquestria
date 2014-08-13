var _ = require('underscore');
var changesData = _.first(require('../changes.json'), 3);
var Settings = require('../lib/settings');

var index = function (req, res) {
    res.render('index', {
        changes: changesData, motd: Settings.motd
    });
};

module.exports = function (app) {
    app.get('/', index);
};
