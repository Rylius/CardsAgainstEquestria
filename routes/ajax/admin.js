var log = require('logule').init(module);

var _ = require('underscore');

var broadcast = function (req, res) {
    // TODO
    res.send(200);
};

var restart = function (req, res) {
    // TODO
    res.send(200);
};

var settings = function (req, res) {
    // TODO
    res.send(200);
};

module.exports = function (app) {
    app.post('/ajax/admin/broadcast', broadcast);
    app.post('/ajax/admin/restart', restart);
    app.post('/ajax/admin/settings', settings);
};
