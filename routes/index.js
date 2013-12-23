var _ = require('underscore');
var changesData = _.first(require('../changes.json'), 3);

var index = function (req, res) {
    res.render('index', {
        user: req.session.user,
        error: req.flash('error'),
        success: req.flash('success'),
        loginRedirect: req.flash('loginRedirect'),
        changes: changesData
    });
};

module.exports = function (app) {
    app.get('/', index);
};
