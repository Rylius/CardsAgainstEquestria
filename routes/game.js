var _ = require('underscore');

var Settings = require('../lib/settings');
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
        title: 'Game list',
        sets: cards.setsJson
    });
};

/**
 * GET
 * Renders the game setup view.
 */
var create = function (req, res) {
    var user = req.session.user ? users.get(req.session.user.id) : null;
    var errors = [];

    var userGames = game.listGamesForUser(user);
    if (userGames.length >= Settings.maxGamesPerUser) {
        errors.push('You\'re already hosting a lot of games, finish or leave those first!');
    }
    if (game.listGames().length >= Settings.maxGames) {
        errors.push('Woops, looks like there are too many games currently running! Maybe join one of them instead?');
    }
    if (!Settings.allowNewGames) {
        errors.push('Silly admin has disabled this right now. The site will probably go into maintenance soon, try again later.');
    }

    res.render('game/create', {
        title: 'Host a new game',
        errors: errors, userGames: userGames
    });
};

var lobby = function (req, res) {
    var g = game.get(req.params.game);

    if (!g) {
        req.flash('error', 'Game not found');
        res.redirect('/games');
        return;
    }

    var user = req.session.user ? users.get(req.session.user.id) : null;

    if (!user || !_.find(g.players, function (player) {
        return user.id == player.user.id;
    })) {
        res.redirect('/game/join/' + g.id);
        return;
    }

    if (g.state == constants.State.PLAYING) {
        res.redirect('/game/play/' + g.id);
    } else if (g.state == constants.State.LOBBY) {
        res.render('game/lobby', {
            title: g.name,
            scoreLimits: _.range(3, 21), defaultScore: 8,
            playerLimits: _.range(3, 17), defaultPlayers: 12,
            roundTimeLimits: [0, 60, 90, 120, 150, 180], defaultRoundTimeLimit: 60,
            userJson: JSON.stringify({id: user.id, name: user.name}), game: g
        });
    } else {
        req.flash('error', 'That game has ended');
        res.redirect('/games');
    }
};

var play = function (req, res) {
    var user = req.session.user ? users.get(req.session.user.id) : null;
    var gameInstance = game.get(req.params.game);

    if (!gameInstance || gameInstance.state != constants.State.PLAYING) {
        req.flash('error', 'That game doesn\'t exist');
        res.redirect('/games');
        return;
    }

    if (!user || !_.find(gameInstance.players, function (player) {
        return player.user.id == user.id;
    })) {
        res.redirect('/game/join/' + gameInstance.id);
        return;
    }

    res.render('game/play', {
        title: gameInstance.name,
        userJson: JSON.stringify(user.toJson()),
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

    var banned = false;
    _.each(gameInstance.bans, function (ban) {
        if (ban.id == user.id || ban.name == user.name || ban.ip == user.clientData.ip) {
            banned = true;
        }
    });
    if (banned) {
        reply(res, constants.Server.Join.BANNED);
        log.trace(user.id + ' -> ' + gameInstance.id + ': Banned');
        return;
    }

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
