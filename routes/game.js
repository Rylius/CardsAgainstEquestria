var _ = require('underscore');
var constants = require('../lib/constants').Game;

var log = require('logule').init(module);

var users = require('../lib/users');

var cards = require('../lib/cards');

var game = null;

var reply = function (res, status, data) {
    var reply = {status: status};
    if (data) {
        reply.data = data;
    }

    res.type('application/json');
    res.send(JSON.stringify(reply));
};

var list = function (req, res) {
    res.render('game/list', {
        user: req.session.user,
        error: req.flash('error'),
        sets: cards.setsJson
    });
};

/**
 * GET
 * Renders the game setup view.
 */
var create = function (req, res) {
    res.render('game/create', {user: req.session.user});
};

var lobby = function (req, res) {
    var g = game.get(req.params.game);

    if (!g) {
        req.flash('error', 'Game not found');
        res.redirect('/games');
        return;
    }

    var user = users.get(req.session.user.id);

    if (!_.find(g.players, function (player) {
        return user.id == player.user.id;
    })) {
        req.flash('error', 'You\'re not a player in that game');
        res.redirect('/games');
        return;
    }

    if (g.state == constants.State.PLAYING) {
        res.redirect('/game/play/' + g.id);
    } else if (g.state == constants.State.LOBBY) {
        res.render('game/lobby', {
            scoreLimits: _.range(3, 21), defaultScore: 8,
            playerLimits: _.range(3, 17), defaultPlayers: 6,
            user: user, userJson: JSON.stringify({id: user.id, name: user.name}),
            game: g
        });
    } else {
        req.flash('error', 'That game has ended');
        res.redirect('/games');
    }
};

var play = function (req, res) {
    var user = users.get(req.session.user.id);
    var gameInstance = game.get(req.params.game);

    if (!gameInstance || gameInstance.state != constants.State.PLAYING || !_.find(gameInstance.players, function (player) {
        return player.user.id == user.id;
    })) {
        req.flash('error', 'That game doesn\'t exist');
        res.redirect('/games');
        return;
    }

    res.render('game/play', {
        userJson: JSON.stringify(user.toJson()), user: user,
        gameJson: JSON.stringify(gameInstance.toJsonFormat()), game: gameInstance
    });
};

/**
 * POST
 * Attempt to join a game.
 */
var join = function (req, res) {
    var user = users.get(req.session.user.id);
    var gameInstance = game.get(req.params.game);

    if (!gameInstance) {
        reply(res, constants.Server.Join.NOT_FOUND);
        return;
    }

    log.trace(user.name + '/' + user.id + ' is joining game ' + gameInstance.id);

    if (gameInstance.password !== null && gameInstance.password.length > 0) {
        if (!req.body.password) {
            reply(res, constants.Server.Join.PASSWORD_REQUIRED);
            log.trace(user.id + ' -> ' + gameInstance.id + ': No password given');
            return;
        } else if (gameInstance.password != req.body.password) {
            reply(res, constants.Server.Join.PASSWORD_INCORRECT);
            log.trace(user.id + ' -> ' + gameInstance.id + ': Wrong password');
            return;
        }
    }

    if (_.find(gameInstance.players, function (player) {
        return player.user.id == user.id;
    })) {
        reply(res, constants.Server.Join.IS_PLAYER);
        log.trace(user.id + ' -> ' + gameInstance.id + ': Is already playing');
        return;

    } else if (gameInstance.players.length >= gameInstance.playerLimit) {
        reply(res, constants.Server.Join.IS_FULL);
        log.trace(user.id + ' -> ' + gameInstance.id + ': Game is full');
        return;
    }

    if (gameInstance.state == constants.State.LOBBY) {
        gameInstance.addPlayer(user);
        reply(res, constants.Server.Join.SUCCESS_LOBBY);
        log.trace(user.id + ' -> ' + gameInstance.id + ': Joining lobby');

    } else if (gameInstance.state == constants.State.PLAYING) {
        gameInstance.addPlayer(user);
        reply(res, constants.Server.Join.SUCCESS_GAME);
        log.trace(user.id + ' -> ' + gameInstance.id + ': Joining game');

    } else {
        reply(res, constants.Server.Join.ENDED);
        log.trace(user.id + ' -> ' + gameInstance.id + ': Game ended');
    }
};

var joinLobby = function (req, res) {
    var user = req.session.user ? users.get(req.session.user.id) : null;
    var gameInstance = game.get(req.params.game);

    if (!gameInstance) {
        res.redirect('/games');
        return;
    } else if (user && _.find(gameInstance.players, function (player) {
        return player.user.id == user.id;
    })) {
        res.redirect('/game/lobby/' + gameInstance.id);
        return;
    }

    res.render('game/join', {
        user: user,
        gameJson: JSON.stringify(gameInstance.toJsonFormat()), game: gameInstance,
        sets: cards.setsJson
    });
};

module.exports = function (app, gameModule) {
    game = gameModule;

    app.get('/games', list);
    app.get('/game/create', create);
    app.get('/game/lobby/:game', lobby);
    app.get('/game/play/:game', play);

    app.get('/game/join/:game', joinLobby);

    app.post('/game/join/:game', join);
};
