var log = require('logule').init(module);
var _ = require('underscore');

var Model = require('../lib/model');
var Game = require('../lib/game');
var Users = require('../lib/users');
var Settings = require('../lib/settings');
var Constants = require('../lib/constants');
var os = require('os');

var index = function (req, res) {
    var gamesJson = _.map(Game.listGames(), function (game) {
        return game.toJsonFormat();
    });
    var usersJson = _.map(Users.users, function (user) {
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
        os: os,
        appSettings: JSON.stringify(Settings),
        gameId: Game.getGameId()
    });
};

var user = function (req, res) {
    var id = parseInt(req.params.user);
    var prey = Users.get(id);

    var games = [];

    if (prey) {
        games = _.filter(Game.listGames(), function (game) {
            return _.any(game.players, function (player) {
                return player.user.id == id;
            });
        });
    }

    Model.User.get(id, function (err, preyDB) {
        if (!prey && !preyDB) {
            req.flash('error', 'User not found');
            res.redirect('/admin');
            return;
        }

        res.render('admin/user', {
            title: 'Stalking ' + (prey ? prey.name : preyDB.name),
            prey: prey, preyDB: preyDB, games: games
        });
    });
};

var game = function (req, res) {
    var game = Game.get(req.params.game);
    if (!game) {
        req.flash('error', 'Game not found');
        res.redirect('/admin');
        return;
    }

    res.render('admin/game', {
        title: 'Stalking ' + game.name,
        game: game,
        GameState: Constants.Game.State
    });
};

var users = function (req, res) {
    Model.User.find({}, 'id', function (err, result) {
        if (err) {
            log.warn('/admin/users: ' + err);
            req.flash('Failed to list users');
            res.redirect('/admin');
            return;
        }

        res.render('admin/users', {
            title: 'Registered users',
            users: result
        });
    });
};

var cardcastDecks = function (req, res) {
    res.render('admin/cardcastDecks', {
        title: 'Manage CardCast decks'
    });
};

module.exports = function (app) {
    app.get('/admin', index);
    app.get('/admin/user/:user', user);
    app.get('/admin/game/:game', game);
    app.get('/admin/users', users);

    app.get('/admin/cardcastDecks', cardcastDecks);
};
