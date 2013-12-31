var CardViewModel = function (json) {

    var self = this;

    this.id = json.id;

    this.text = json.text;
    this.watermark = json.watermark;

    this.pick = json.pick;
    this.draw = json.draw;

    this.selected = ko.observable(false);
};

var MoveViewModel = function (id) {

    var self = this;

    this.id = id;

    this.cards = ko.observableArray();

    this.confirmed = ko.observable(false);

    this.select = function (card) {
        if (this.confirmed()) {
            return;
        }

        if (model.blackCard().pick == 1 && this.cards().length == 1 && card != this.cards()[0]) {
            this.cards.removeAll();
            this.select(card);

        } else if (this.cards().length > 0 && this.cards()[this.cards().length - 1] == card) {
            // can only remove the last selected card to keep the order
            this.cards.remove(card);
            console.log('Deselected ' + JSON.stringify(card));

        } else if (this.cards().length < model.blackCard().pick) {
            this.cards.push(card);
            console.log('Selected ' + JSON.stringify(card));
        }
    };

    this.submit = function () {
        self.confirmed(true);

        $.ajax('/ajax/game/' + model.game.id + '/move', {
            method: 'post', contentType: 'application/json',
            data: JSON.stringify(_.map(self.cards(), function (card) {
                return card.id;
            }))
        });

        console.log('Submitted move ' + JSON.stringify(self.cards()));
    };
};

var HandViewModel = function () {

    var self = this;

    this.cards = ko.observableArray();

    this.selected = ko.observableArray();

    this.set = function (cards) {
        this.cards.removeAll();
        _.each(cards, function (card) {
            self.cards.push(new CardViewModel(card));
        });
    };
};

var PlayerViewModel = function (json) {

    var self = this;

    this.id = json.id;
    this.name = json.name;

    this.points = ko.observable(0);
    this.state = ko.observable();
};

var PlayViewModel = function (game, player) {

    var self = this;

    this.game = game;

    this.player = new PlayerViewModel(player);
    this.hand = new HandViewModel();
    this.move = ko.observable();

    this.players = ko.observableArray();
    _.each(game.players, function (player) {
        if (player.id == self.player.id) {
            self.players.push(self.player);
        } else {
            self.players.push(new PlayerViewModel(player));
        }
    });

    this.ended = ko.observable(false);
    this.winner = ko.observable();

    this.czar = ko.observable();

    this.round = ko.observable(1);

    this.blackCard = ko.observable();

    this.playedCards = ko.observableArray();
    this.playedCardsUncovered = ko.observable(false);

    this.selectedMove = ko.observable();
    this.selectedMoveSubmitted = ko.observable(false);

    this.timeLeft = ko.observable(0);
    this.timeLeftTimeoutId = null;

    this.submitSelectedMove = function () {
        if (this.selectedMoveSubmitted() || !this.selectedMove()) {
            return;
        }
        this.selectedMoveSubmitted(true);

        $.ajax('/ajax/game/' + model.game.id + '/select', {
            method: 'post', contentType: 'application/json',
            data: JSON.stringify({move: this.selectedMove().id})
        });

        console.log('Submitted selected move ' + JSON.stringify(this.selectedMove()));
    };

    this.isCzar = ko.computed(function () {
        return self.czar() && self.czar().id == self.player.id;
    });

    this.czarCanSelect = ko.computed(function () {
        return self.blackCard() != null && self.playedCardsUncovered();
    });

    this.handleUpdate = function (update) {
        var player, move;

        var type = update.type;
        var data = update.data;

        if (type == Game.Server.Update.PLAYER_JOIN) {
            console.log('Player joined: ' + data.name + '/' + data.id);
            this.players.push(new PlayerViewModel(data));

        } else if (type == Game.Server.Update.PLAYER_LEAVE) {
            console.log('Player left: ' + data.id);
            player = _.find(self.players(), function (p) {
                return p.id == data.id;
            });

            // TODO this is kind of ugly
            if (player.state() == '' && !this.czarCanSelect() && this.playedCards().length > 0) {
                this.playedCards.remove(this.playedCards()[0]);
            }

            this.players.remove(player);

            if (this.players().length < 3 && player.id != this.player.id) {
                // TODO definitely improve this
                alert('Game closing because there are less than 3 players. Sorry :(');
            }

        } else if (type == Game.Server.Update.BLACK_CARD) {
            console.log('Black card: ' + data.id + '/' + data.text);
            this.blackCard(new CardViewModel(data));
            this.playedCardsUncovered(false);

            this.updateTimeLimit();

        } else if (type == Game.Server.Update.HAND) {
            console.log('Hand: ' + JSON.stringify(data));
            this.hand.set(data.hand);

            var playedCards = [];
            _.each(data.played, function (json) {
                var card = new CardViewModel(json);
                self.hand.cards.push(card);

                playedCards.push(card);
            });

            if (playedCards.length > 0) {
                move = new MoveViewModel(-1);
                _.each(playedCards, function (card) {
                    move.cards.push(card);
                });

                move.confirmed(true);
                this.move(move);

                this.player.state('');
            }

        } else if (type == Game.Server.Update.MOVE) {
            player = _.find(this.players(), function (p) {
                return p.id == data.player;
            });
            console.log('Move made: ' + player.name);
            player.state('');

            var pick = self.blackCard() != null ? self.blackCard().pick : 1; // can happen when joining in progress
            move = new MoveViewModel(-1);
            _.times(pick, function () {
                move.cards.push(new CardViewModel({}));
            });
            this.playedCards.push(move);

        } else if (type == Game.Server.Update.UNCOVER) {
            console.log('Uncovering cards: ' + JSON.stringify(data));

            this.playedCards.removeAll();
            _.each(data.cards, function (cards, id) {
                var move = new MoveViewModel(id);

                if (cards.length > 0) {
                    _.each(cards, function (card) {
                        move.cards.push(new CardViewModel(card));
                    });
                    self.playedCards.push(move);
                }
            });
            this.playedCardsUncovered(true);

            _.each(this.players(), function (player) {
                player.state('');
            });
            this.czar().state('Selecting');

            this.timeLeft(data.timeLeft > 0 ? data.timeLeft : game.roundTimeLimit);
            this.updateTimeLimit();

        } else if (type == Game.Server.Update.SELECTED) {
            console.log('Czar selected ' + JSON.stringify(data));

            this.selectedMove(_.find(this.playedCards(), function (move) {
                return move.id == data.move;
            }));
            this.czar().state('Card Czar');

            player = _.find(this.players(), function (p) {
                return p.id == data.player;
            });
            if (player) {
                player.state('Round winner!');
                player.points(player.points() + 1);
            }

            if (this.timeLeftTimeoutId) {
                clearTimeout(this.timeLeftTimeoutId);
            }

        } else if (type == Game.Server.Update.ROUND) {
            console.log('Starting round ' + data.round + ', czar: ' + data.czar);

            this.czar(_.find(self.players(), function (player) {
                return player.id == data.czar;
            }));

            if (this.czar().state() == '' && !this.czarCanSelect()) {
                this.playedCards.remove(this.playedCards()[0]);
            }

            _.each(this.players(), function (player) {
                player.state('Playing');
                player.points(data.points[player.id]);
            });
            this.czar().state('Card Czar');

            this.move(new MoveViewModel(-1));

            this.round(data.round);

            this.playedCards.removeAll();
            this.playedCardsUncovered(false);

            this.selectedMove(null);
            this.selectedMoveSubmitted(false);

            this.timeLeft(data.timeLeft);

        } else if (type == Game.Server.Update.STATE) {
            console.log('Game state changed to ' + data.state);

            if (data.state == Game.State.ENDED) {
                _.each(this.players(), function (p) {
                    if (p.points() >= self.game.scoreLimit) {
                        p.state('Winner!');
                        self.winner(p);
                    } else {
                        p.state('');
                    }
                });

                this.ended(true);
            }

        } else {
            console.log('Unknown update: ' + type + ': ' + JSON.stringify(data));
        }
    };

    this.setTimeLimit = function () {
        var timeLeft = this.timeLeft();
        if (timeLeft > 0) {
            this.timeLeft(timeLeft - 1);
            this.timeLeftTimeoutId = setTimeout(this.setTimeLimit, 1000);
        } else {
            clearTimeout(this.timeLeftTimeoutId);
            this.timeLeftTimeoutId = null;
        }
    }.bind(this);

    this.updateTimeLimit = function () {
        if (this.timeLeftTimeoutId) {
            clearTimeout(this.timeLeftTimeoutId);
        }

        if (game.roundTimeLimit) {
            this.timeLeftTimeoutId = setTimeout(this.setTimeLimit, 1000);
        }
    };
};
