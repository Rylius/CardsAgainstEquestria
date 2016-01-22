const _ = require('underscore');

const log = require('logule').init(module);

const cards = require('./cards');
const Chat = require('./chat');

const Settings = require('../lib/settings');

const constants = require('./constants').Game;

const games = [];
let gameId = 0;

function deleteGame(game) {
    game.clearTimeouts();
    games.splice(games.indexOf(game), 1);

    if (Settings.restarting && games.length <= 0) {
        Settings.restart();
    }
}

function formatPlayer(player) {
    return player.user.id + '/' + player.user.name;
}

function formatCard(card) {
    return card.id + '/' + card.text;
}

function debug(game, message) {
    log.debug('Game ' + game.id + ': ' + message);
}

function trace(game, message) {
    log.trace('Game ' + game.id + ': ' + message);
}

/**
 * for converting a custom set card into the format for the game
 * @author tjhorner
 */
function formatCahCreatorCard(card, index, watermark) {
    let cardText;
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
}

class Player {

    constructor(user) {
        this.user = user;

        this.hand = [];
        this.move = [];
        this.moveId = -1;

        this.score = 0;

        this.ignoreUntilNextRound = true;
    }

}

class BannedPlayer {

    constructor(id, name, ip) {
        this.id = id;
        this.name = name;
        this.ip = ip;
    }

}

class Game {

    constructor(host) {
        this.name = host.name + (host.name[host.name.length - 1].toLowerCase() == 's' ? '\'' : '\'s') + ' game';

        this.host = host;

        this.state = 0;

        /**
         * @type {Array<Player>}
         */
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
        this.chat.on('message', this.onChatMessage);

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

        this.addPlayer(host);
    }

    addPlayer(user) {
        this.pushGlobalUpdate(constants.Server.Update.PLAYER_JOIN, {id: user.id, name: user.name});
        this.sendUpdates();

        const player = new Player(user);
        this.players.push(player);
        this.updates[user.id] = [];

        this.chat.addUser(user);

        if (this.state == constants.State.PLAYING) {
            this.dealHand(player);

            const moveIds = _.collect(this.players, p => p.moveId);
            let id = moveIds[0];
            while (_.contains(moveIds, id)) {
                id = _.random(0, 4096);
            }

            player.moveId = id;

            if (!this.waitingForCzar()) {
                player.ignoreUntilNextRound = false;
            }
        }
    }

    removePlayer(user, reason) {
        const player = _.find(this.players, p => p.user.id == user.id);
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

                this.nextRoundTimeoutId = setTimeout(() => {
                    this.startNextRound();
                }, 1000);

                trace(this, 'Skipping round');
            } else {
                let index = this.players.indexOf(this.czar) + 1;
                if (index >= this.players.length) {
                    index = 0;
                }
                this.czar = this.players[index];

                _.each(this.czar.move, (card) => {
                    this.czar.hand.push(card);
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
    }

    update(data) {
        if (data.name != undefined && data.name.length <= 32 && /^[\w\s!'"§%&\/\+\-\*\(\)\[\]\{\}\\]+$/.exec(data.name)) {
            this.name = data.name;
        }

        if (data.sets != undefined) {
            this.sets.length = 0;
            _.each(data.sets, (s) => {
                const cardSet = _.find(cards.sets, cardSet => cardSet.id == s);

                if (cardSet) {
                    this.sets.push(cardSet);
                }
            });
        }

        if (data.expansions != undefined) {
            this.expansions.length = 0;
            _.each(data.expansions, e => {
                const cardSet = _.find(cards.expansions, cardSet => cardSet.id == e);

                if (cardSet) {
                    this.expansions.push(cardSet);
                }
            });
        }

        const scoreLimit = parseInt(data.scoreLimit);
        if (scoreLimit && scoreLimit > 0 && scoreLimit <= 32) {
            this.scoreLimit = scoreLimit;
        }

        const playerLimit = parseInt(data.playerLimit);
        if (playerLimit && playerLimit > 2 && playerLimit <= 16) {
            this.playerLimit = playerLimit;
        }

        const roundTimeLimit = parseInt(data.roundTimeLimit);
        if (roundTimeLimit === 0 || (roundTimeLimit >= 30 && roundTimeLimit <= 300)) {
            this.roundTimeLimit = roundTimeLimit;
        }

        if (data.password != undefined && data.password.length <= 64) {
            this.password = data.password;
        }

        if (data.hidden != undefined) {
            this.hidden = data.hidden;
        }

        _.each(this.players, (player) => {
            this.pushUpdate(player.user, constants.Server.Update.GAME_DATA, this.toJsonFormat(true));
        });

        this.sendUpdates();
    }

    start() {
        if (this.state != constants.State.LOBBY || this.players.length < 3 || (this.sets.length == 0 && !this.customSets.length)) {
            return;
        }

        _.each([this.sets, this.expansions], type => {
            _.each(type, s => {
                _.each(s.blackCards, card => this.blackCards.push(card));

                _.each(s.whiteCards, card => {
                    this.whiteCards.push(card);
                    this.allWhiteCards.push(card);
                });
            });
        });

        let customCardIndex = 0;
        _.forEach(this.customSets, deck => {
            _.forEach(deck.blackCards, card => {
                this.blackCards.push(formatCahCreatorCard(card, customCardIndex++, 'Custom'));
            });

            _.forEach(deck.whiteCards, card => {
                this.whiteCards.push(formatCahCreatorCard(card, customCardIndex++, 'Custom'));
                this.allWhiteCards.push(formatCahCreatorCard(card, customCardIndex++, 'Custom'));
            });
        });

        this.blackCards = _.shuffle(this.blackCards);
        this.whiteCards = _.shuffle(this.whiteCards);

        this.state = constants.State.PLAYING;
        this.pushGlobalUpdate(constants.Server.Update.STATE, {state: this.state});
        this.sendUpdates();

        _.each(this.players, (player) => this.dealHand(player));

        this.nextRoundTimeoutId = setTimeout(() => {
            try {
                this.startNextRound();
            } catch (error) {
                log.warn('Game ' + this.id + ': Failed to start next round: ' + error);
            }
        }, 5000);

        log.debug('Started game ' + this.id + '/' + this.name);
    };

    startNextRound() {
        this.nextRoundTimeoutId = null;

        this.round++;

        this.roundEnded = false;
        this.selectedMove = null;

        if (!this.czar) {
            this.czar = _.sample(this.players);
        } else {
            let index = this.players.indexOf(this.czar) + 1;
            if (index >= this.players.length) {
                index = 0;
            }
            this.czar = this.players[index];
        }

        this.blackCard = this.blackCards[0];
        this.blackCards.splice(0, 1);
        this.blackCards.push(this.blackCard);

        const points = {};

        const moveIds = [-1];
        _.each(this.players, player => {
            player.ignoreUntilNextRound = false;

            // TODO ???
            _.each(player.move, (card) => this.whiteCards.push(card));

            player.move = [];

            let id = -1;
            while (_.contains(moveIds, id)) {
                id = _.random(0, 4096);
            }

            player.moveId = id;
            moveIds.push(id);

            points[player.user.id] = player.score;

            this.dealHand(player);
        });

        if (this.roundTimeLimit) {
            if (this.timeLimitTimeoutId) {
                clearTimeout(this.timeLimitTimeoutId);
                this.timeLimitTimeoutId = null;
            }

            this.timeLimitTimeoutId = setTimeout(() => {
                this.timeLimitTimeoutId = null;
                trace(this, 'Uncovering cards (round time up)');

                _.each(this.players, player => {
                    if (player != this.czar && !player.move.length) {
                        player.ignoreUntilNextRound = true;
                    }
                });

                this.pushGlobalUpdate(constants.Server.Update.UNCOVER, this.uncoverMoves());
                this.sendUpdates();

                if (_.every(this.players, player => {
                        return player.move.length == 0;
                    })) {
                    trace(this, 'No cards played, skipping czar');
                    this.startNextRound();
                } else {
                    this.doUncover();
                }

            }, this.roundTimeLimit * 1000);
            this.timeLimitStart = new Date().getTime();
        }

        this.pushGlobalUpdate(constants.Server.Update.ROUND, this.roundState());
        this.pushGlobalUpdate(constants.Server.Update.BLACK_CARD, this.blackCard.toJSON());
        this.sendUpdates();

        debug(this, 'Started round ' + this.round +
            ', czar ' + formatPlayer(this.czar) + ', black card ' + formatCard(this.blackCard));
    }

    onMove(user, cards) {
        const player = _.find(this.players, (p) => {
            return p.user.id == user.id;
        });

        if (this.waitingForCzar() || !this.blackCard) {
            trace(this, formatPlayer(player) + ' tried to play in a wrong state');
            return;
        }

        if (player.ignoreUntilNextRound) {
            trace(this, formatPlayer(player) + ' tried to play while being ignored');
            return;
        }

        if (player.move.length > 0) {
            trace(this, formatPlayer(player) + ' tried to play another move');
            return;
        }

        _.each(cards, (id) => {
            const card = _.find(player.hand, (c) => {
                return c.id == id;
            });

            if (!card) {
                trace(this, formatPlayer(player) + ' tried to play invalid card ' + id);
                player.move = [];
                return;
            }

            player.move.push(card);
            player.hand.splice(player.hand.indexOf(card), 1);
        });

        if (player.move.length != this.blackCard.pick) {
            trace(this, formatPlayer(player) + ' tried to play an invalid move (played ' +
                player.move.length + ', needed ' + this.blackCard.pick + ')');
            player.move = [];
            return;
        }

        this.pushGlobalUpdate(constants.Server.Update.MOVE, {player: player.user.id});

        trace(this, formatPlayer(player) + ' made move: ' + JSON.stringify(player.move));

        if (this.waitingForCzar()) {
            trace(this, 'Uncovering cards');

            if (this.timeLimitTimeoutId) {
                clearTimeout(this.timeLimitTimeoutId);
                this.timeLimitTimeoutId = null;
            }

            this.doUncover();

            this.pushGlobalUpdate(constants.Server.Update.UNCOVER, this.uncoverMoves());
        }

        this.sendUpdates();
    }

    onSelect(user, data) {
        if (!this.waitingForCzar()) {
            return;
        }

        const selectedMove = parseInt(data.move);

        const player = _.find(this.players, p => p.user.id == user.id);
        if (this.czar != player) {
            return;
        }

        const movePlayer = _.find(this.players, p => p.moveId == selectedMove);
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

        this.nextRoundTimeoutId = setTimeout(() => {
            if (movePlayer.score >= this.scoreLimit) {
                this.state = constants.State.ENDED;
                this.pushGlobalUpdate(constants.Server.Update.STATE, {state: this.state});
                this.sendUpdates();

                this.closeTimeoutId = setTimeout(() => deleteGame(this), 60000);
            } else {
                this.startNextRound();
            }
        }, 11584.2);

        if (this.timeLimitTimeoutId) {
            clearTimeout(this.timeLimitTimeoutId);
            this.timeLimitTimeoutId = null;
        }
    }

    waitingForCzar() {
        return this.blackCard != null && !this.roundEnded && _.every(this.players, p => {
                return p.move.length == this.blackCard.pick || p == this.czar || p.ignoreUntilNextRound;
            });
    }

    dealHand(player) {
        while (player.hand.length < 10) {
            const card = this.whiteCards[0];
            player.hand.push(card);
            this.whiteCards.splice(0, 1);
        }

        this.pushHand(player);
    }

    doUncover() {
        if (this.roundTimeLimit) {
            if (this.timeLimitTimeoutId) {
                clearTimeout(this.timeLimitTimeoutId);
            }

            this.timeLimitTimeoutId = setTimeout(() => {
                this.timeLimitTimeoutId = null;
                trace(this, 'Skipping czar (round time up)');

                this.startNextRound();
            }, this.roundTimeLimit * 1000);
            this.timeLimitStart = new Date().getTime();
        }
    }

    uncoverMoves() {
        const moves = {
            cards: {},
            timeLeft: this.roundTimeLimit + Math.floor((this.timeLimitStart - new Date().getTime()) / 1000)
        };
        _.each(_.shuffle(this.players), (player) => {
            moves.cards[player.moveId] = _.map(player.move, card => card.toJSON());
        });
        return moves;
    }

    skipRound() {
        if (!this.blackCard || this.roundEnded || this.selectedMove) {
            // Nothing to skip
            return;
        }

        trace(this, 'Skipping round');
        this.startNextRound();
    }

    roundState() {
        const points = {};
        _.each(this.players, p => points[p.user.id] = p.score);

        let timeLeft = 0;
        if (this.roundTimeLimit) {
            timeLeft = this.roundTimeLimit + Math.floor((this.timeLimitStart - new Date().getTime()) / 1000);
        }

        return {round: this.round, czar: this.czar.user.id, points: points, timeLeft: timeLeft};
    }

    sendState(player) {
        const user = player.user;

        trace(this, 'Sending state for ' + formatPlayer(player));

        this.pushUpdate(user, constants.Server.Update.STATE, {state: this.state});

        _.forEach(this.chat.history, (message) => {
            this.pushUpdate(user, constants.Server.Update.CHAT, message.toJSON());
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
            _.each(this.players, p => {
                if (p.move.length > 0) {
                    this.pushUpdate(user, constants.Server.Update.MOVE, {player: p.user.id});
                }
            });
        }

        this.sendUpdates();
    }

    pushHand(player) {
        const hand = {
            hand: _.map(
                _.select(player.hand, card => !_.isUndefined(card) && !_.isNull(card)),
                card => card.toJSON()
            ),
            played: _.map(player.move, card => card.toJSON())
        };
        this.pushUpdate(player.user, constants.Server.Update.HAND, hand);
    }

    onChatMessage(message) {
        const data = message.toJSON();
        _.each(this.players, player => {
            if (player.user != message.user) {
                this.pushUpdate(player.user, constants.Server.Update.CHAT, data);
            }
        });
        this.sendUpdates();
    }

    clearTimeouts() {
        if (this.nextRoundTimeoutId) {
            clearTimeout(this.nextRoundTimeoutId);
        }

        if (this.timeLimitTimeoutId) {
            clearTimeout(this.timeLimitTimeoutId);
        }

        if (this.closeTimeoutId) {
            clearTimeout(this.closeTimeoutId);
        }
    }

    reset() {
        if (this.state == constants.State.LOBBY) {
            return;
        }

        trace(this, 'Resetting');

        this.clearTimeouts();

        this.state = constants.State.LOBBY;

        _.each(this.players, player => {
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
    }

    pushUpdate(user, type, params) {
        if (!this.updates[user.id]) {
            return;
        }

        this.updates[user.id].push({type: type, data: params});
    }

    pushGlobalUpdate(type, params) {
        _.each(this.players, player => {
            this.pushUpdate(player.user, type, params);
        });
    }

    sendUpdates() {
        log.trace('Game ' + this.id + ': Sending all pending updates');

        _.each(this.players, player => {
            const request = this.updateRequests[player.user.id];
            const updates = this.updates[player.user.id];
            if (request && updates && updates.length > 0) {
                request.response.send(JSON.stringify(updates));

                log.trace('Sent updates to pending request of ' + player.user.id + ': ' + JSON.stringify(updates));

                clearTimeout(request.timeoutId);
                this.updates[player.user.id] = [];
                this.updateRequests[player.user.id] = null;
            }
        });
    }

    addBan(playerId, playerName, ip) {
        const existing = _.find(this.bans, bannedPlayer => bannedPlayer.id == playerId);
        if (!existing) {
            this.bans.push(new BannedPlayer(playerId, playerName, ip));
            trace(this, 'Banned player ' + playerId);
        }
    }

    removeBan(playerId) {
        const existing = _.find(this.bans, bannedPlayer => bannedPlayer.id == playerId);
        if (existing) {
            const i = this.bans.indexOf(existing);
            if (i >= 0) {
                this.bans.splice(i, 1);
                trace(this, 'Removed ban on player ' + playerId);
            }
        }
    }

    toJsonFormat(includePassword) {
        const data = {
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
    }

}

exports.load = function (directory, config) {
    cards.loadSets(directory + '/' + config.files.decks);
};

exports.createGame = function (host) {
    if (games.length >= Settings.maxGames || !Settings.allowNewGames || exports.listGamesForUser(host).length >= Settings.maxGamesPerUser) {
        return null;
    }

    const game = new Game(host);

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

    return _.filter(games, game => game.host.id == user.id);
};

exports.get = function (id) {
    return _.find(games, game => game.id == id);
};

exports.getGameId = function () {
    return gameId;
};

exports.cards = cards;
