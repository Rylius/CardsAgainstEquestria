var changesData = require('../changes.json');

var license = function (req, res) {
    res.render('info/license', {user: req.session.user});
};

var about = function (req, res) {
    res.render('info/about', {user: req.session.user});
};

var changes = function (req, res) {
    res.render('info/changes', {user: req.session.user, changes: changesData});
};

var contact = function (req, res) {
    res.render('info/contact', {user: req.session.user});
};

module.exports = function (app) {
    app.get('/info/license', license);
    app.get('/info/about', about);
    app.get('/info/changes', changes);
    app.get('/info/contact', contact);
};
