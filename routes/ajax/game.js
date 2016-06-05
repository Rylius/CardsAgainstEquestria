var _ = require('underscore');

var log = require('logule').init(module);

var xssFilters = require('xss-filters');

var users = require('../../lib/users');

var cards = require('../../lib/cards');

var Chat = require('../../lib/chat');

var constants = require('../../lib/constants').Game;
var MessageType = require('../../lib/constants').Chat;

var CahCreator = require('cah-creator'),
    creatorApi = new CahCreator();

var config = null;
var game = null;

var setsJson = null;

var findGame = function (id) {
    return _.find(game.listGames(), function (g) {
        return g.id == id;
    });
};

var isPlayer = function (user, game) {
    return _.find(game.players, function (player) {
        return user.id == player.user.id;
    });
};

/**
 * POST
 * Allocates a new game session and returns default values as well as the ID.
 */
var create = function (req, res) {
    res.type('application/json');

    var gameInstance = game.createGame(users.get(req.session.user.id));
    if (gameInstance) {
        res.send(JSON.stringify(gameInstance.toJsonFormat()));
    } else {
        res.send(400);
    }
};

/**
 * POST
 * Starts an allocated game session. Can only be called by the host while the game is in lobby state.
 */
var start = function (req, res) {
    var gameInstance = _.find(game.listGames(), function (g) {
        return g.id == req.params.game;
    });

    if (!gameInstance) {
        res.send(404);
        return;
    } else if (gameInstance.state != constants.State.LOBBY) {
        res.send(400);
        return;
    } else if (gameInstance.host.id != req.session.user.id) {
        res.send(403);
        return;
    }

    gameInstance.start();

    res.send(200);
};

/**
 * POST
 * Updates info on an open game. Can only be called by the host.
 */
var update = function (req, res) {
    var gameInstance = _.find(game.listGames(), function (game) {
        return game.id == req.params.game;
    });

    if (!gameInstance) {
        res.send(404);
        return;
    } else if (gameInstance.host.id != req.session.user.id) {
        res.send(403);
        return;
    }

    gameInstance.update(req.body);

    res.send(200);
};

/**
 * POST
 * Adds a custom set to the game.
 * @author tjhorner
 */
var addSet = function (req, res) {
    var gameInstance = _.find(game.listGames(), function (game) {
        return game.id == req.params.game;
    });

    if (!gameInstance) {
        res.send(404);
        return;
    } else if (gameInstance.host.id != req.session.user.id) {
        res.send(403);
        return;
    }

    var deckId = req.body.cahCreatorId;
    if (_.find(gameInstance.customSets, function (deck) {
            return deck.id == deckId;
        })) {
        // Custom set has already been added, ignore
        res.send(200);
    } else if (deckId) {
        creatorApi.getDeck(deckId, function (deck) {
            if (deck.error) {
                res.send(404); // the only error the api returns is not found so this is safe... for now...
                return;
            }

            deck.id = deckId;

            // This does NOT make these strings 'safe'!
            // Just avoiding a parser issue when embedding JSON in HTML.
            // This is shit; all embedded JSON needs to be replaced with API calls.
            deck.name = deck.name.replace(/[<>]/g, ' ');
            deck.description = deck.description.replace(/[<>]/g, ' ');

            // Cards allow HTML so we need to make them safe here
            _.forEach(deck.blackCards, function (card) {
                card.text = xssFilters.inHTMLData(card.text);
            });
            deck.whiteCards = _.map(deck.whiteCards, function (text) {
                return xssFilters.inHTMLData(text);
            });

            gameInstance.customSets.push(deck);

            res.send(deck);
        });
    } else {
        res.send(400);
    }
};

var removeSet = function (req, res) {
    var gameInstance = _.find(game.listGames(), function (game) {
        return game.id == req.params.game;
    });

    if (!gameInstance) {
        res.send(404);
        return;
    } else if (gameInstance.host.id != req.session.user.id) {
        res.send(403);
        return;
    }

    var deckId = req.body.cahCreatorId;
    if (deckId) {
        var i = _.findIndex(gameInstance.customSets, function (deck) {
            return deck.id = deckId;
        });
        if (i < 0) {
            res.send(404);
            return;
        }

        gameInstance.customSets.splice(i, 1);

        res.send(200);
    } else {
        res.send(400);
    }
};

/**
 * GET
 * Returns an array of updates when they come available. Until then, this call blocks or returns an empty list after a
 * set timeout delay.
 */
var listen = function (req, res) {
    if (!req.session.user) {
        res.send(403);
        return;
    }

    var gameInstance = findGame(req.params.game);
    if (!gameInstance) {
        res.send(404);
        return;
    }

    var user = users.get(req.session.user.id);
    if (!isPlayer(user, gameInstance)) {
        res.send(403);
        return;
    }

    var updates = gameInstance.updates[user.id];
    if (updates.length != 0) {
        res.type('application/json');
        res.send(JSON.stringify(updates));
        log.trace('Game ' + gameInstance.id + ': Sent buffered updates to ' + user.id + ': ' + JSON.stringify(updates));

        gameInstance.updates[user.id] = [];
    } else {
        res.type('application/json');

        var previousRequest = gameInstance.updateRequests[user.id];
        if (previousRequest) {
            clearTimeout(previousRequest.timeoutId);
            log.trace('Game ' + gameInstance.id + ': Removed previous listen request for user ' + user.id);
        }

        gameInstance.updateRequests[user.id] = {
            timeoutId: setTimeout(function () {
                res.send(JSON.stringify([]));

                gameInstance.updateRequests[user.id] = null;
                log.trace('Game ' + gameInstance.id + ': Returning empty update to ' + user.id);
            }, config.requestTimeout),
            response: res
        };

        log.trace('Game ' + gameInstance.id + ': Holding back updates response for ' + user.id);
    }
};

var move = function (req, res) {
    var gameInstance = findGame(req.params.game);
    if (!gameInstance) {
        res.send(404);
        return;
    }

    var user = users.get(req.session.user.id);
    if (!isPlayer(user, gameInstance)) {
        res.send(403);
        return;
    }

    gameInstance.onMove(user, req.body);
    res.send(200);
};

var select = function (req, res) {
    var gameInstance = findGame(req.params.game);
    if (!gameInstance) {
        res.send(404);
        return;
    }

    var user = users.get(req.session.user.id);
    if (!isPlayer(user, gameInstance)) {
        res.send(403);
        return;
    }

    gameInstance.onSelect(user, req.body);
    res.send(200);
};

/**
 * POST
 * Requests the full state of this game for the current player.
 */
var state = function (req, res) {
    var gameInstance = findGame(req.params.game);
    if (!gameInstance) {
        res.send(404);
        return;
    }

    var user = users.get(req.session.user.id);
    if (!isPlayer(user, gameInstance)) {
        res.send(403);
        return;
    }

    var player = _.find(gameInstance.players, function (player) {
        return player.user.id == user.id;
    });

    gameInstance.sendState(player);

    res.send(200);
};

var skip = function (req, res) {
    var gameInstance = findGame(req.params.game);
    if (!gameInstance) {
        res.send(404);
        return;
    }

    var user = users.get(req.session.user.id);
    if (!user || gameInstance.host != user) {
        res.send(403);
        return;
    }

    gameInstance.skipRound();

    res.send(200);
};

var kick = function (req, res) {
    var gameInstance = findGame(req.params.game);
    if (!gameInstance) {
        res.send(404);
        return;
    }

    var user = users.get(req.session.user.id);
    if (!user || !isPlayer(user, gameInstance) || gameInstance.host != user) {
        res.send(403);
        return;
    }

    var player = users.get(req.params.player);
    if (!player || !isPlayer(player, gameInstance)) {
        res.send(404);
        return;
    }

    gameInstance.removePlayer(player, 'Kicked');

    res.send(200);
};

/**
 * POST
 * data = {id: number, name: string}
 * @param req
 * @param res
 */
var ban = function (req, res) {
    var gameInstance = findGame(req.params.game);
    if (!gameInstance) {
        res.send(404);
        return;
    }

    var user = users.get(req.session.user.id);
    if (!user || !isPlayer(user, gameInstance) || gameInstance.host != user) {
        res.send(403);
        return;
    }

    if (!req.body.player) {
        res.send(404);
        return;
    }

    var player = users.get(req.body.player.id);
    if (player) {
        if (player == user) {
            // Prevent host from banning themselves
            res.send(403);
            return;
        }

        gameInstance.addBan(player.id, player.name, player.clientData ? player.clientData.ip : 'unknown');
        gameInstance.removePlayer(player, 'Banned');
    } else {
        gameInstance.addBan(+req.body.player.id, req.body.player.name, 'unknown');
    }

    res.send(200);
};

var banAll = function (req, res) {
    var gameInstance = findGame(req.params.game);
    if (!gameInstance) {
        res.send(404);
        return;
    }

    var host = users.get(req.session.user.id);
    if (!host || !isPlayer(host, gameInstance) || gameInstance.host != host) {
        res.send(403);
        return;
    }

    if (!req.body.players) {
        res.send(404);
        return;
    }

    _.each(req.body.players, function (player) {
        var user = users.get(player.id);
        if (user) {
            if (user == host) {
                // Prevent host from banning themselves
                res.send(403);
                return;
            }

            gameInstance.addBan(user.id, user.name);
            gameInstance.removePlayer(user, 'Banned');
        } else {
            gameInstance.addBan(player.id, player.name);
        }
    });

    res.send(200);
};

var unban = function (req, res) {
    var gameInstance = findGame(req.params.game);
    if (!gameInstance) {
        res.send(404);
        return;
    }

    var user = users.get(req.session.user.id);
    if (!user || !isPlayer(user, gameInstance) || gameInstance.host != user) {
        res.send(403);
        return;
    }

    gameInstance.removeBan(req.params.id);

    res.send(200);
};

var listBans = function (req, res) {
    res.type('application/json');

    var gameInstance = findGame(req.params.game);
    if (!gameInstance) {
        res.send(404);
        return;
    }

    var user = users.get(req.session.user.id);
    if (!user || !isPlayer(user, gameInstance) || gameInstance.host != user) {
        res.send(403);
        return;
    }

    res.send(JSON.stringify(gameInstance.bans));
};

var leave = function (req, res) {
    var gameInstance = findGame(req.params.game);
    if (!gameInstance) {
        res.send(404);
        return;
    }

    var user = users.get(req.session.user.id);
    if (!isPlayer(user, gameInstance)) {
        res.send(403);
        return;
    }

    gameInstance.removePlayer(user, 'Leaving');

    res.send(200);
};

var reset = function (req, res) {
    var gameInstance = findGame(req.params.game);
    if (!gameInstance) {
        res.send(404);
        return;
    }

    var user = users.get(req.session.user.id);
    if (gameInstance.host != user) {
        res.send(403);
        return;
    }


    gameInstance.reset();

    res.send(200);
};

/**
 * GET
 * Returns a list of all currently opened games.
 */
var list = function (req, res) {
    var games = _.map(_.filter(game.listGames(), function (game) {
        return !game.hidden && game.state != constants.State.ENDED;
    }), function (game) {
        return game.toJsonFormat();
    });

    res.type('application/json');
    res.send(JSON.stringify(games));
};

/**
 * GET
 * Returns detailed info on a particular game.
 */
var info = function (req, res) {
    var gameInstance = _.find(game.listGames(), function (g) {
        return g.id == req.params.game;
    });

    if (!gameInstance) {
        res.send(404);
        return;
    }

    var user = users.get(req.session.user.id);
    var host = gameInstance.host == user;

    res.type('application/json');
    res.send(JSON.stringify(gameInstance.toJsonFormat(host)));
};

/**
 * GET
 * Returns the chat history for a particular game.
 */
var history = function (req, res) {
    var gameInstance = _.find(game.listGames(), function (g) {
        return g.id == req.params.game;
    });

    if (!gameInstance) {
        res.send(404);
        return;
    }

    var user = users.get(req.session.user.id);
    if (!isPlayer(user, gameInstance)) {
        res.send(403);
        return;
    }

    var history = [];
    _.forEach(gameInstance.chat.history, function (message) {
        history.push(message.toJSON());
    });

    res.send(JSON.stringify(history));
};

/**
 * POST
 * Send a chat message to a particular game.
 */
var chat = function (req, res) {
    var gameInstance = _.find(game.listGames(), function (g) {
        return g.id == req.params.game;
    });

    if (!gameInstance) {
        res.send(404);
        return;
    }

    var user = users.get(req.session.user.id);
    if (!isPlayer(user, gameInstance)) {
        res.send(403);
        return;
    }

    // TODO clean up validation

    var type = parseInt(req.body.type);
    if (type < 0 || type > 1) {
        res.send(400);
        return;
    }

    var text = req.body.message;
    if (!text || text.length == 0 || text.length > 8192) {
        res.send(400);
        return;
    }

    var message = new Chat.Message(user, type, text);

    log.trace('Game ' + gameInstance.id + ': Received chat message from ' + user.id + '/' + user.name + ': ' + JSON.stringify(message));

    gameInstance.chat.sendMessage(message);

    res.send(200);
};

/**
 * GET
 * Returns all sets and expansions.
 */
var sets = function (req, res) {
    res.type('application/json');
    res.send(cards.setsJson);
};

var rules = function (req, res) {
    res.type('application/json');
    res.send(JSON.stringify({
        rules: [
            {
                id: 0,
                title: 'Gambling',
                description: 'If a Black Card is played and you have more than one White Card that you think could win, you can bet one of your Awesome Points to play an additional White Card.<br/>If you win, you keep your point. If you lose, whoever won the round gets the point you wagered.'
            },
            {
                id: 1,
                title: 'Rebooting the Universe',
                description: 'At any time, players may trade in an Awesome Point to return as many White Cards as they\'d like to the deck and draw back up to ten.'
            },
            {
                id: 2,
                title: 'Packing Heat',
                description: 'For Pick 2s, all players draw an extra card before playing the hand to open up more options.'
            },
            {
                id: 3,
                title: 'Rando Cardrissian',
                description: 'Every round, pick one random White Card from the pile and place it into play. This card belongs to an imaginary player named Rando Cardrissian, and if he wins the game, all players go home in a state of everlasting shame.'
            },
            {
                id: 4,
                title: 'God Is Dead',
                description: 'Play without a Card Czar. Each players picks his or her favorite card each round. The card with the most votes wins the round.'
            },
            {
                id: 5,
                title: 'Survival of the Fittest',
                description: 'After everyone has answered the question, players take turns eliminating one card each. The last remaining card is declared the funniest.'
            },
            {
                id: 6,
                title: 'Serious Business',
                description: 'Instead of picking a favorite card each round, the Card Czar ranks the top three in order. The best card gets 3 Awesome Points, the second-best gets 2, and the third gets 1. At the end of the game, the winner is declared the funniest, mathematically speaking.'
            },
            {
                id: 7,
                title: 'Never Have I Ever',
                description: 'At any time, players may discard cards that they don\'t understand, but they must confess their ignorance to the group and suffer the resulting humiliation.'
            }
        ]
    }));
};

module.exports = function (app, appConfig, gameModule) {
    game = gameModule;
    config = appConfig;

    app.post('/ajax/game/create', create);

    app.get('/ajax/game/list', list);
    app.get('/ajax/game/sets', sets);
    app.get('/ajax/game/rules', rules);

    app.get('/ajax/game/:game/info', info);
    app.get('/ajax/game/:game/history', history);

    app.get('/ajax/game/:game/bans', listBans);

    app.post('/ajax/game/:game/chat', chat);

    app.get('/ajax/game/:game/listen', listen);
    app.post('/ajax/game/:game/state', state);

    app.post('/ajax/game/:game/move', move);
    app.post('/ajax/game/:game/select', select);

    app.post('/ajax/game/:game/skip', skip);

    app.post('/ajax/game/:game/start', start);
    app.post('/ajax/game/:game/update', update);
    app.post('/ajax/game/:game/addSet', addSet);
    app.post('/ajax/game/:game/removeSet', removeSet);

    app.post('/ajax/game/:game/leave', leave);

    app.post('/ajax/game/:game/reset', reset);

    app.post('/ajax/game/:game/kick/:player', kick);
    app.post('/ajax/game/:game/ban', ban);
    app.post('/ajax/game/:game/banall/:players', banAll);
    app.post('/ajax/game/:game/unban/:id', unban);
};
