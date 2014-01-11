var users = require('../lib/users');
var extend = require('extend');

// TODO replace with ajax calls

var login = function (req, res) {
    if (req.session.user) {
        req.flash('error', 'You\'re already logged in!');
        res.redirect('/');
        return;
    }

    users.login(req.session, req.body.name, req.body.password, null, function (result) {
        if (result.success) {
            res.locals.user = req.session.user;
            req.flash('success', result.success);
            if (req.body.redirect) {
                res.redirect(req.body.redirect);
            } else {
                res.redirect('/');
            }
        } else {
            req.flash('loginRedirect', req.body.redirect);
            req.flash('error', result.error);
            res.redirect('/');
        }
    });
};

var logout = function (req, res) {
    if (req.session.user) {
        users.logout(req.session.user.id, req.session);
    }

    req.flash('success', 'Logged out!');
    res.redirect('/');
};

module.exports = function (app) {
    app.post('/user/login', login);
    app.get('/user/logout', logout);
};
