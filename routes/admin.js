var log = require('logule').init(module);
var _ = require('underscore');

var Model = require('../lib/model');
var Game = require('../lib/game');
var users = require('../lib/users');
var os = require('os');

var index = function (req, res) {
    var gamesJson = _.map(Game.listGames(), function (game) {
        return game.toJsonFormat();
    });
    var usersJson = _.map(users.users, function (user) {
        return user.toJson();
    });

    res.render('admin/index', {
        title: 'Fancy admin overview',
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

var user = function (req, res) {
    var id = parseInt(req.params.user);
    var prey = users.get(id);

    Model.User.get(id, function (err, preyDB) {
        if (err) {
            log.debug('No database user found for ID ' + id);
        }

        if (!prey && !preyDB) {
            req.flash('error', 'User not found');
            res.redirect('/admin');
            return;
        }

        res.render('admin/user', {
            title: 'Stalking ' + prey ? prey.name : preyDB.name,
            prey: prey, preyDB: preyDB
        });
    });
};

var game = function (req, res) {
    var game = Game.listGames()[req.params.game];
    if (!game) {
        req.flash('error', 'Game not found');
        res.redirect('/admin');
        return;
    }

    res.render('admin/game', {
        title: 'Stalking ' + game.name,
        game: game
    });
};

module.exports = function (app) {
    app.get('/admin', index);
    app.get('/admin/user/:user', user);
    app.get('/admin/game/:game', game);
};
