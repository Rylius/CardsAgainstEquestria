var log = require('logule').init(module);
var _ = require('underscore');

var crypto = require('crypto');

var users = require('../lib/users');
var extend = require('extend');

var model = require('./../lib/model');

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
            req.flash('loginFailed', false);
            if (req.body.redirect) {
                res.redirect(req.body.redirect);
            } else {
                res.redirect('/');
            }
        } else {
            req.flash('loginRedirect', req.body.redirect);
            req.flash('error', result.error);
            req.flash('loginFailed', true);
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

var register = function (req, res) {
    if (req.session.user.registered) {
        res.redirect('/');
        return;
    }

    res.render('user/register');
};

var doRegister = function (req, res) {
    if (req.session.user.registered) {
        res.redirect('/');
        return;
    }

    if (!req.body.email || !req.body.email.length || req.body.email.length >= 256
        || !/^[a-z0-9!#$%&'*+/=?^_{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i.test(req.body.email)
        || !req.body.password || !req.body.password.length || req.body.password.length >= 64) {

        req.flash('error', 'Invalid form input');
        res.redirect('/user/register');
        return;
    }

    var user = users.get(req.session.user.id);

    model.User.find({email: req.body.email}, 1, function (err, result) {
        if (err) {
            log.warn('Register: Failed to find users: ' + err);
            req.flash('error', 'Internal error, try again or complain');
            res.redirect('/user/register');
            return;
        }

        if (result.length) {
            log.trace('Register: ' + user.id + '/' + user.name + ': Email already exists: ' + req.body.email);
            req.flash('error', 'Email already in use');
            res.redirect('/user/register');
            return;
        }

        var salt = crypto.randomBytes(128).toString('base64');
        var hash = crypto.pbkdf2Sync(req.body.password, salt, 10000, 256).toString('base64');

        model.User.create([
            {
                id: user.id,
                name: user.name,
                email: req.body.email,
                password: hash,
                password_salt: salt,
                allow_emails: !!req.body.allowEmails,
                date_registered: new Date(),
                last_login: new Date()
            }
        ],
            function (err) {
                if (err) {
                    log.warn('Register: Failed to insert user: ' + err);
                    req.flash('error', 'Internal error, try again or complain');
                    res.redirect('/user/register');
                    return;
                }

                req.session.user.registered = true;

                req.flash('success', 'Successfully registered!');
                req.flash('info', 'Please keep in mind you have to use your password when logging in from now on.');
                res.redirect('/');
            });
    });
};

module.exports = function (app) {
    app.post('/user/login', login);
    app.get('/user/logout', logout);

    app.get('/user/register', register);
    app.post('/user/register', doRegister);
};
