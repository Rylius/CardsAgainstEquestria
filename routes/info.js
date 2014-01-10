var changesData = require('../changes.json');

var license = function (req, res) {
    res.render('info/license');
};

var about = function (req, res) {
    res.render('info/about');
};

var changes = function (req, res) {
    res.render('info/changes', {changes: changesData});
};

var contact = function (req, res) {
    res.render('info/contact');
};

module.exports = function (app) {
    app.get('/info/license', license);
    app.get('/info/about', about);
    app.get('/info/changes', changes);
    app.get('/info/contact', contact);
};
