var users = require('../../lib/users');
var extend = require('extend');

var login = function (req, res) {
    res.type('application/json');

    if (req.session.user) {
        res.send(403);
        return;
    }

    users.login(req.session, req.body.name, req.body.name, null, function (result) {
        if (result.success) {
            res.locals.user = req.session.user;
        }
        res.send(200, JSON.stringify(result));
    });
};

module.exports = function (app) {
    app.post('/ajax/user/login', login);
};
