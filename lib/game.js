var _ = require('underscore');

var log = require('logule').init(module);

var cards = require('./cards');
var Chat = require('./chat');

var Settings = require('../lib/settings');

var constants = require('./constants').Game;

var games = [];
var gameId = 0;

var deleteGame = function (game) {
    game.clearTimeouts();
    games.splice(games.indexOf(game), 1);

    if (Settings.restarting && games.length <= 0) {
        Settings.restart();
    }
};

var formatPlayer = function (player) {
    return player.user.id + '/' + player.user.name;
};

var formatCard = function (card) {
    return card.id + '/' + card.text;
};

var debug = function (game, message) {
    log.debug('Game ' + game.id + ': ' + message);
};

var trace = function (game, message) {
    log.trace('Game ' + game.id + ': ' + message);
};

/**
 * for converting a custom set card into the format for the game
 * @author tjhorner
 */
var formatCustomSetCard = function(card, index, watermark){
    var cardText;
    if (card.text) { // then it's a black card
        cardText = card.text;
    } else if (typeof(card) === 'string') { // else it's white
        cardText = card;
    }

    // TODO Properly validate card data (string length, pick set to a reasonable number)

    return {
        id: -index,
        text: cardText,
        pick: card.pick,
        toJSON: function () {
            // yes, custom set IDs are negative.
            return {id: -index, text: cardText, watermark: watermark, pick: card.pick};
        }
    };
};

var Player = function (user) {

    this.user = user;

    this.hand = [];
    this.move = [];
    this.moveId = -1;

    this.score = 0;

    this.ignoreUntilNextRound = true;

};

function BannedPlayer(id, name, ip) {
    this.id = id;
    this.name = name;
    this.ip = ip;
}

var Game = function (host) {

    var self = this;

    // game meta data

    this.name = host.name + (host.name[host.name.length - 1].toLowerCase() == 's' ? '\'' : '\'s') + ' game';

    this.host = host;

    this.state = 0;

    this.players = [];

    this.sets = [];
    this.expansions = [];

    /**
     * Custom sets to be used for the game.
     * @type {Array}
     */
    this.customSets = [];

    this.blackCards = [];
    this.whiteCards = [];

    this.allWhiteCards = [];

    this.scoreLimit = 8;
    this.playerLimit = 12;
    this.roundTimeLimit = 60;

    this.password = null;

    this.hidden = false;

    this.nextRoundTimeoutId = null;
    this.timeLimitTimeoutId = null;
    this.timeLimitStart = 0;

    this.closeTimeoutId = null;

    // networking

    this.updates = [];
    this.updateRequests = [];

    // chat

    this.chat = new Chat.Channel();

    // actual game state

    this.czar = null;
    this.blackCard = null;
    this.round = 0;
    this.roundEnded = false;
    this.selectedMove = null;

    // ban list

    /**
     * List of user IDs that are banned from this game.
     * @type {Array}
     */
    this.bans = [];

    this.addPlayer = function (user) {
        this.pushGlobalUpdate(constants.Server.Update.PLAYER_JOIN, {id: user.id, name: user.name});
        this.sendUpdates();

        var player = new Player(user);
        this.players.push(player);
        this.updates[user.id] = [];

        this.chat.addUser(user);

        if (this.state == constants.State.PLAYING) {
            this.dealHand(player);

            var moveIds = _.collect(this.players, function (p) {
                return p.moveId;
            });
            var id = moveIds[0];
            while (_.contains(moveIds, id)) {
                id = _.random(0, 4096);
            }

            player.moveId = id;

            if (!this.waitingForCzar()) {
                player.ignoreUntilNextRound = false;
            }
        }
    };

    this.removePlayer = function (user, reason) {
        var player = _.find(this.players, function (p) {
            return p.user.id == user.id;
        });
        if (!player) {
            return;
        }

        if (this.czar == player) {
            if (this.waitingForCzar()) {
                if (this.nextRoundTimeoutId) {
                    clearTimeout(this.nextRoundTimeoutId);
                }
                if (this.timeLimitTimeoutId) {
                    clearTimeout(this.timeLimitTimeoutId);
                    this.timeLimitTimeoutId = null;
                }

                this.nextRoundTimeoutId = setTimeout(function () {
                    self.startNextRound();
                }, 1000);

                trace(this, 'Skipping round');
            } else {
                var index = this.players.indexOf(this.czar) + 1;
                if (index >= this.players.length) {
                    index = 0;
                }
                this.czar = this.players[index];

                _.each(this.czar.move, function (card) {
                    self.czar.hand.push(card);
                });
                this.czar.move = [];

                trace(this, 'Selected ' + formatPlayer(this.czar) + ' as the new czar');

                this.pushGlobalUpdate(constants.Server.Update.ROUND, this.roundState());
            }
        }

        this.pushGlobalUpdate(constants.Server.Update.PLAYER_LEAVE, {id: user.id, reason: reason});
        this.sendUpdates();

        this.players.splice(this.players.indexOf(player), 1);
        delete this.updates[user.id];
        this.chat.removeUser(player.user);

        if (this.host.id == user.id && this.players.length > 0) {
            this.host = this.players[0].user;
            trace(this, 'Transferring host status to ' + this.host.name + '/' + this.host.id);
            this.pushGlobalUpdate(constants.Server.Update.GAME_DATA, this.toJsonFormat());
        }

        if ((this.players.length < 3 && this.state == constants.State.PLAYING)) {
            trace(this, 'Returning to lobby due to lack of players');
            this.reset();
            return;
        } else if (this.players.length <= 0) {
            trace(this, 'Closing due to lack of players');
            deleteGame(this);
            return;
        }

        if (this.waitingForCzar()) {
            this.doUncover();
            this.pushGlobalUpdate(constants.Server.Update.UNCOVER, this.uncoverMoves());
        }

        this.sendUpdates();
    };

    this.update = function (data) {
        if (data.name != undefined && data.name.length <= 32 && /^[\w\s!'"§%&\/\+\-\*\(\)\[\]\{\}\\]+$/.exec(data.name)) {
            this.name = data.name;
        }

        if (data.sets != undefined) {
            this.sets.length = 0;
            _.each(data.sets, function (s) {
                var cardSet = _.find(cards.sets, function (cardSet) {
                    return cardSet.id == s;
                });

                if (cardSet) {
                    self.sets.push(cardSet);
                }
            });
        }

        if (data.expansions != undefined) {
            this.expansions.length = 0;
            _.each(data.expansions, function (e) {
                var cardSet = _.find(cards.expansions, function (cardSet) {
                    return cardSet.id == e;
                });

                if (cardSet) {
                    self.expansions.push(cardSet);
                }
            });
        }

        var scoreLimit = parseInt(data.scoreLimit);
        if (scoreLimit && scoreLimit > 0 && scoreLimit <= 32) {
            this.scoreLimit = scoreLimit;
        }

        var playerLimit = parseInt(data.playerLimit);
        if (playerLimit && playerLimit > 2 && playerLimit <= 16) {
            this.playerLimit = playerLimit;
        }

        var roundTimeLimit = parseInt(data.roundTimeLimit);
        if (roundTimeLimit === 0 || (roundTimeLimit >= 30 && roundTimeLimit <= 300)) {
            this.roundTimeLimit = roundTimeLimit;
        }

        if (data.password != undefined && data.password.length <= 64) {
            this.password = data.password;
        }

        if (data.hidden != undefined) {
            this.hidden = data.hidden;
        }

        _.each(this.players, function (player) {
            self.pushUpdate(player.user, constants.Server.Update.GAME_DATA, self.toJsonFormat(true));
        });

        this.sendUpdates();
    };

    this.start = function () {
        if (this.state != constants.State.LOBBY || this.players.length < 3 || (this.sets.length == 0 && !this.customSets.length)) {
            return;
        }

        _.each([this.sets, this.expansions], function (type) {
            _.each(type, function (s) {
                _.each(s.blackCards, function (card) {
                    self.blackCards.push(card);
                });

                _.each(s.whiteCards, function (card) {
                    self.whiteCards.push(card);
                    self.allWhiteCards.push(card);
                });
            });
        });

        var customCardIndex = 0;
        _.forEach(this.customSets, function (deck) {
            _.forEach(deck.blackCards, function (card) {
                self.blackCards.push(formatCustomSetCard(card, customCardIndex++, 'Custom'));
            });

            _.forEach(deck.whiteCards, function (card) {
                self.whiteCards.push(formatCustomSetCard(card, customCardIndex++, 'Custom'));
                self.allWhiteCards.push(formatCustomSetCard(card, customCardIndex++, 'Custom'));
            });
        });

        this.blackCards = _.shuffle(this.blackCards);
        this.whiteCards = _.shuffle(this.whiteCards);

        this.state = constants.State.PLAYING;
        this.pushGlobalUpdate(constants.Server.Update.STATE, {state: this.state});
        this.sendUpdates();

        _.each(this.players, function (player) {
            self.dealHand(player);
        });

        this.nextRoundTimeoutId = setTimeout(function () {
            try {
                self.startNextRound();
            } catch (error) {
                log.warn('Game ' + self.id + ': Failed to start next round: ' + error);
            }
        }, 5000);

        log.debug('Started game ' + self.id + '/' + self.name);
    };

    this.startNextRound = function () {
        this.nextRoundTimeoutId = null;

        this.round++;

        this.roundEnded = false;
        this.selectedMove = null;

        if (!this.czar) {
            this.czar = _.sample(this.players);
        } else {
            var index = this.players.indexOf(this.czar) + 1;
            if (index >= this.players.length) {
                index = 0;
            }
            this.czar = this.players[index];
        }

        this.blackCard = this.blackCards[0];
        this.blackCards.splice(0, 1);
        this.blackCards.push(this.blackCard);

        var points = {};

        var moveIds = [-1];
        _.each(this.players, function (player) {
            player.ignoreUntilNextRound = false;

            _.each(player.move, function (card) {
                self.whiteCards.push(card);
            });

            player.move = [];

            var id = -1;
            while (_.contains(moveIds, id)) {
                id = _.random(0, 4096);
            }

            player.moveId = id;
            moveIds.push(id);

            points[player.user.id] = player.score;

            self.dealHand(player);
        });

        if (this.roundTimeLimit) {
            if (this.timeLimitTimeoutId) {
                clearTimeout(this.timeLimitTimeoutId);
                this.timeLimitTimeoutId = null;
            }

            this.timeLimitTimeoutId = setTimeout(function () {
                this.timeLimitTimeoutId = null;
                trace(this, 'Uncovering cards (round time up)');

                _.each(this.players, function (player) {
                    if (player != this.czar && !player.move.length) {
                        player.ignoreUntilNextRound = true;
                    }
                }.bind(this));

                this.pushGlobalUpdate(constants.Server.Update.UNCOVER, this.uncoverMoves());
                this.sendUpdates();

                if (_.every(this.players, function (player) {
                        return player.move.length == 0;
                    })) {
                    trace(this, 'No cards played, skipping czar');
                    this.startNextRound();
                } else {
                    this.doUncover();
                }

            }.bind(this), this.roundTimeLimit * 1000);
            this.timeLimitStart = new Date().getTime();
        }

        this.pushGlobalUpdate(constants.Server.Update.ROUND, this.roundState());
        this.pushGlobalUpdate(constants.Server.Update.BLACK_CARD, this.blackCard.toJSON());
        this.sendUpdates();

        debug(this, 'Started round ' + this.round +
        ', czar ' + formatPlayer(this.czar) + ', black card ' + formatCard(this.blackCard));
    };

    this.onMove = function (user, cards) {
        var player = _.find(self.players, function (p) {
            return p.user.id == user.id;
        });

        if (self.waitingForCzar() || !self.blackCard) {
            trace(self, formatPlayer(player) + ' tried to play in a wrong state');
            return;
        }

        if (player.ignoreUntilNextRound) {
            trace(self, formatPlayer(player) + ' tried to play while being ignored');
            return;
        }

        if (player.move.length > 0) {
            trace(self, formatPlayer(player) + ' tried to play another move');
            return;
        }

        _.each(cards, function (id) {
            var card = _.find(player.hand, function (c) {
                return c.id == id;
            });

            if (!card) {
                trace(self, formatPlayer(player) + ' tried to play invalid card ' + id);
                player.move = [];
                return;
            }

            player.move.push(card);
            player.hand.splice(player.hand.indexOf(card), 1);
        });

        if (player.move.length != self.blackCard.pick) {
            trace(self, formatPlayer(player) + ' tried to play an invalid move (played ' +
            player.move.length + ', needed ' + self.blackCard.pick + ')');
            player.move = [];
            return;
        }

        self.pushGlobalUpdate(constants.Server.Update.MOVE, {player: player.user.id});

        trace(self, formatPlayer(player) + ' made move: ' + JSON.stringify(player.move));

        if (self.waitingForCzar()) {
            trace(self, 'Uncovering cards');

            if (self.timeLimitTimeoutId) {
                clearTimeout(self.timeLimitTimeoutId);
                self.timeLimitTimeoutId = null;
            }

            self.doUncover();

            self.pushGlobalUpdate(constants.Server.Update.UNCOVER, self.uncoverMoves());
        }

        self.sendUpdates();
    };

    this.onSelect = function (user, data) {
        if (!this.waitingForCzar()) {
            return;
        }

        var selectedMove = parseInt(data.move);

        var player = _.find(this.players, function (p) {
            return p.user.id == user.id;
        });
        if (this.czar != player) {
            return;
        }

        var movePlayer = _.find(this.players, function (p) {
            return p.moveId == selectedMove;
        });
        if (!movePlayer) {
            trace(this, 'Czar tried to select invalid move (' + selectedMove + ')');
            return;
        }

        movePlayer.score++;
        this.roundEnded = true;

        this.selectedMove = {
            move: movePlayer.moveId,
            player: movePlayer.user.id
        };
        this.pushGlobalUpdate(constants.Server.Update.SELECTED, this.selectedMove);

        this.sendUpdates();

        if (this.nextRoundTimeoutId) {
            clearTimeout(this.nextRoundTimeoutId);
        }

        this.nextRoundTimeoutId = setTimeout(function () {
            if (movePlayer.score >= self.scoreLimit) {
                self.state = constants.State.ENDED;
                self.pushGlobalUpdate(constants.Server.Update.STATE, {state: self.state});
                self.sendUpdates();

                self.closeTimeoutId = setTimeout(function () {
                    deleteGame(self);
                }, 60000);
            } else {
                self.startNextRound();
            }
        }, 11584.2);

        if (self.timeLimitTimeoutId) {
            clearTimeout(self.timeLimitTimeoutId);
            self.timeLimitTimeoutId = null;
        }
    };

    this.waitingForCzar = function () {
        return self.blackCard != null && !self.roundEnded && _.every(self.players, function (p) {
                return p.move.length == self.blackCard.pick || p == self.czar || p.ignoreUntilNextRound;
            });
    };

    this.dealHand = function (player) {
        while (player.hand.length < 10) {
            var card = self.whiteCards[0];
            player.hand.push(card);
            self.whiteCards.splice(0, 1);
        }

        this.pushHand(player);
    };

    this.doUncover = function () {
        if (self.roundTimeLimit) {
            if (self.timeLimitTimeoutId) {
                clearTimeout(self.timeLimitTimeoutId);
            }

            self.timeLimitTimeoutId = setTimeout(function () {
                self.timeLimitTimeoutId = null;
                trace(self, 'Skipping czar (round time up)');

                self.startNextRound();
            }, self.roundTimeLimit * 1000);
            self.timeLimitStart = new Date().getTime();
        }
    };

    this.uncoverMoves = function () {
        var moves = {
            cards: {},
            timeLeft: this.roundTimeLimit + Math.floor((this.timeLimitStart - new Date().getTime()) / 1000)
        };
        _.each(_.shuffle(self.players), function (player) {
            moves.cards[player.moveId] = _.map(player.move, function (card) {
                return card.toJSON();
            });
        });
        return moves;
    };

    this.skipRound = function () {
        if (!self.blackCard || self.roundEnded || self.selectedMove) {
            // Nothing to skip
            return;
        }

        trace(self, 'Skipping round');
        this.startNextRound();
    };

    this.roundState = function () {
        var points = {};
        _.each(this.players, function (p) {
            points[p.user.id] = p.score;
        });

        var timeLeft = 0;
        if (this.roundTimeLimit) {
            timeLeft = this.roundTimeLimit + Math.floor((this.timeLimitStart - new Date().getTime()) / 1000);
        }

        return {round: this.round, czar: this.czar.user.id, points: points, timeLeft: timeLeft};
    };

    this.sendState = function (player) {
        var user = player.user;

        trace(this, 'Sending state for ' + formatPlayer(player));

        this.pushUpdate(user, constants.Server.Update.STATE, {state: this.state});

        _.forEach(this.chat.history, function (message) {
            self.pushUpdate(user, constants.Server.Update.CHAT, message.toJSON());
        });

        if (this.czar) {
            this.pushUpdate(user, constants.Server.Update.ROUND, this.roundState());
        }

        if (this.blackCard) {
            this.pushUpdate(user, constants.Server.Update.BLACK_CARD, this.blackCard.toJSON());
        }

        this.pushHand(player);

        if (this.waitingForCzar()) {
            this.pushUpdate(user, constants.Server.Update.UNCOVER, this.uncoverMoves());
        } else if (this.roundEnded) {
            this.pushUpdate(user, constants.Server.Update.UNCOVER, this.uncoverMoves());
            this.pushUpdate(user, constants.Server.Update.SELECTED, this.selectedMove);
        } else {
            _.each(this.players, function (p) {
                if (p.move.length > 0) {
                    self.pushUpdate(user, constants.Server.Update.MOVE, {player: p.user.id});
                }
            });
        }

        this.sendUpdates();
    };

    this.pushHand = function (player) {
        var hand = {
            hand: _.map(_.select(player.hand, function (card) {
                return !_.isUndefined(card) && !_.isNull(card);
            }), function (card) {
                return card.toJSON();
            }),
            played: _.map(player.move, function (card) {
                return card.toJSON();
            })
        };
        this.pushUpdate(player.user, constants.Server.Update.HAND, hand);
    };

    this.onChatMessage = function (message) {
        var data = message.toJSON();
        _.each(self.players, function (player) {
            if (player.user != message.user) {
                self.pushUpdate(player.user, constants.Server.Update.CHAT, data);
            }
        });
        self.sendUpdates();
    };

    this.clearTimeouts = function () {
        if (this.nextRoundTimeoutId) {
            clearTimeout(this.nextRoundTimeoutId);
        }

        if (this.timeLimitTimeoutId) {
            clearTimeout(this.timeLimitTimeoutId);
        }

        if (this.closeTimeoutId) {
            clearTimeout(this.closeTimeoutId);
        }
    };

    this.reset = function () {
        if (this.state == constants.State.LOBBY) {
            return;
        }

        trace(this, 'Resetting');

        this.clearTimeouts();

        this.state = constants.State.LOBBY;

        _.each(this.players, function (player) {
            player.hand = [];
            player.move = [];
            player.moveId = -1;
            player.score = 0;
            player.ignoreUntilNextRound = false;
        });

        this.timeLimitStart = 0;

        this.blackCards = [];
        this.whiteCards = [];
        this.allWhiteCards = [];

        this.czar = null;
        this.blackCard = null;
        this.round = 0;
        this.roundEnded = false;
        this.selectedMove = null;

        this.pushGlobalUpdate(constants.Server.Update.STATE, {state: this.state});
        this.sendUpdates();
    };

    this.pushUpdate = function (user, type, params) {
        if (!this.updates[user.id]) {
            return;
        }

        this.updates[user.id].push({type: type, data: params});
    };

    this.pushGlobalUpdate = function (type, params) {
        _.each(self.players, function (player) {
            self.pushUpdate(player.user, type, params);
        });
    };

    this.sendUpdates = function () {
        log.trace('Game ' + this.id + ': Sending all pending updates');

        _.each(self.players, function (player) {
            var request = self.updateRequests[player.user.id];
            var updates = self.updates[player.user.id];
            if (request && updates && updates.length > 0) {
                request.response.send(JSON.stringify(updates));

                log.trace('Sent updates to pending request of ' + player.user.id + ': ' + JSON.stringify(updates));

                clearTimeout(request.timeoutId);
                self.updates[player.user.id] = [];
                self.updateRequests[player.user.id] = null;
            }
        });
    };

    this.toJsonFormat = function (includePassword) {
        var data = {
            id: this.id,
            name: this.name,
            sets: _.map(this.sets, function (s) {
                return {id: s.id, name: s.name};
            }),
            expansions: _.map(this.expansions, function (e) {
                return {id: e.id, name: e.name};
            }),
            scoreLimit: this.scoreLimit,
            playerLimit: this.playerLimit,
            roundTimeLimit: this.roundTimeLimit,
            host: {id: this.host.id, name: this.host.name},
            players: _.map(this.players, function (player) {
                return {id: player.user.id, name: player.user.name};
            }),
            passworded: this.password != null && this.password.length !== 0,
            hidden: this.hidden,
            state: this.state,
            customSets: _.map(this.customSets, function (s) {
                return {id: s.id, name: s.name, description: s.description};
            })
        };

        if (includePassword) {
            data.password = this.password;
        }

        return data;
    };

    this.chat.on('message', this.onChatMessage);

    this.addPlayer(host);
};

Game.prototype.addBan = function (playerId, playerName, ip) {
    var self = this;

    var existing = _.find(self.bans, function (bannedPlayer) {
        return bannedPlayer.id == playerId;
    });
    if (!existing) {
        self.bans.push(new BannedPlayer(playerId, playerName, ip));
        trace(self, 'Banned player ' + playerId);
    }
};

Game.prototype.removeBan = function (playerId) {
    var existing = _.find(this.bans, function (bannedPlayer) {
        return bannedPlayer.id == playerId;
    });
    if (existing) {
        var i = this.bans.indexOf(existing);
        if (i >= 0) {
            this.bans.splice(i, 1);
            trace(this, 'Removed ban on player ' + playerId);
        }
    }
};

exports.load = function (directory, config) {
    cards.loadSets(directory + '/' + config.files.decks);
};

exports.createGame = function (host) {
    if (games.length >= Settings.maxGames || !Settings.allowNewGames || exports.listGamesForUser(host).length >= Settings.maxGamesPerUser) {
        return null;
    }

    var game = new Game(host);

    game.updates[host.id] = [];

    game.id = gameId++;
    games.push(game);

    return game;
};

exports.listGames = function () {
    return games;
};

exports.listGamesForUser = function (user) {
    if (!user) {
        return [];
    }

    return _.filter(games, function (game) {
        return game.host.id == user.id;
    });
};

exports.get = function (id) {
    return _.find(games, function (game) {
        return game.id == id;
    });
};

exports.getGameId = function () {
    return gameId;
};

exports.cards = cards;
