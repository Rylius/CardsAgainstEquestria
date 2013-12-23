var _ = require('underscore');

var constants = require('../lib/constants').Game;
var game = require('../lib/game');
var users = require('../lib/users');
var os = require('os');

var index = function (req, res) {
    var gamesJson = _.map(game.listGames(), function (game) {
        return game.toJsonFormat();
    });
    var usersJson = _.map(users.users, function (user) {
        return user.toJson();
    });

    res.render('admin/index', {
        user: req.session.user,
        error: req.flash('error'), success: req.flash('success'),
        users: JSON.stringify(usersJson), games: JSON.stringify(gamesJson),
        process: JSON.stringify({
            version: process.version,
            pid: process.pid,
            uptime: process.uptime()
        }),
        memory: JSON.stringify(process.memoryUsage()),
        os: os
    });
};

module.exports = function (app) {
    app.get('/admin', index);
};
