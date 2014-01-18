var log = require('logule').init(module);
var _ = require('underscore');

var users = require('../lib/users');

var Model = require('../lib/db/model');
var database = require('../lib/db/database');

var suggest = function (req, res) {
    var user = users.get(req.session.user.id);
    res.render('deck/suggest', {title: 'Suggestions'});
};

module.exports = function (app) {
    app.get('/deck/suggest', suggest);
};
