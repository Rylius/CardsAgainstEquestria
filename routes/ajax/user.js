var users = require('../../lib/users');
var extend = require('extend');

var login = function (req, res) {
    res.type('application/json');

    if (req.session.user) {
        res.send(403);
        return;
    }

    res.send(200, users.login(req.session, req.body.name));
};

module.exports = function (app) {
    app.post('/ajax/user/login', login);
};
