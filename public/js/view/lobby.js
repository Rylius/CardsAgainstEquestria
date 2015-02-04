var GameLobbyViewModel = function (user) {

    var self = this;

    this.user = user;

    this.game = ko.observable();
    this.gameChat = ko.observable(new ChatViewModel());
    this.gameChat().user(user);
    this.game.subscribeChanged(function (newValue) {
        self.gameChat().gameId(newValue.id());
    });

    this.passwordVisible = ko.observable(false);

    this.allDecks = ko.observableArray();
    this.featuredDecks = ko.observableArray();

    this.sets = ko.observableArray();
    this.expansions = ko.observableArray();

    this.rules = ko.observableArray();

    this.starting = ko.observable(false);

    this.sendUpdates = ko.observable(true);

    this.enableDeck = function (deck) {
        if (_.contains(self.game().decks(), deck.code)) {
            return;
        }

        if (!self.isHost()) {
            // TODO handle suggestions
            return;
        }

        self.game().decks.push(deck.code);
        self.update();
    };

    this.disableDeck = function (deck) {
        if (!self.isHost()) {
            // TODO handle suggestions
            return;
        }

        self.game().decks.remove(deck.code);
        self.update();
    };

    this.selectedDecks = ko.computed(function () {
        if (!self.game()) {
            return [];
        }

        var gameDecks = self.game().decks();
        return _.sortBy(_.filter(self.allDecks(), function (deck) {
            return _.contains(gameDecks, deck.code);
        }), function (deck) {
            return gameDecks.indexOf(deck.code);
        });
    });

    this.openDeckLink = function (deck) {
        window.open('http://www.cardcastgame.com/browse/deck/' + deck.code, '_blank');
    };

    this.toggleArea = function (data, e) {
        var $this = $(e.target);

        $($this.attr('data-target')).collapse('toggle');

        var icon = $this.find('small i');
        if (icon.hasClass('open')) {
            icon.removeClass('open');
            icon.addClass('closed');
        } else {
            icon.addClass('open');
            icon.removeClass('closed');
        }
    };

    this.rulesRows = ko.computed(function () {
        var rows = [];
        var row;

        for (var i = 0, j = self.rules().length; i < j; i++) {
            if (i % 4 === 0) {
                if (row) {
                    rows.push(row);
                }
                row = [];
            }
            row.push(self.rules()[i]);
        }

        if (row) {
            rows.push(row);
        }

        return rows;
    });

    this.isHost = ko.computed(function () {
        return self.game() && self.game().host().id == self.user.id;
    });

    this.inviteLink = ko.computed(function () {
        if (self.game()) {
            return window.location.origin + '/game/join/' + self.game().id();
        }

        return '';
    });

    this.neededPlayers = ko.computed(function () {
        if (self.game()) {
            return 3 - self.game().players().length;
        }

        return 2;
    });

    this.registerListener = function () {
        var g = self.game();

        var update = function (newValue, oldValue) {
            if (newValue != oldValue || $.isArray(newValue)) {
                self.update();
            }
        };

        g.name.subscribeChanged(update);
        g.sets.subscribeChanged(update);
        g.expansions.subscribeChanged(update);
        g.scoreLimit.subscribeChanged(update);
        g.playerLimit.subscribeChanged(update);
        g.password.subscribeChanged(update);
        g.roundTimeLimit.subscribeChanged(update);
        g.hidden.subscribeChanged(update);
    };

    this.update = function () {
        if (!this.isHost() || !this.sendUpdates()) {
            return;
        }

        $.ajax('/ajax/game/' + self.game().id() + '/update', {
                method: 'post',
                contentType: 'application/json',
                data: ko.toJSON(self.game())
            }
        );

        // FIXME This is hacky at best, let's try and do it better later...
        $('title').text(self.game().name() + ' - Cards Against Equestria');
    };

    this.kick = function (player) {
        if (confirm('Are you sure?')) {
            $.ajax('/ajax/game/' + self.game().id() + '/kick/' + player.id, {method: 'post'});
        }
    };

    this.start = function () {
        self.starting(true);
        $.ajax('/ajax/game/' + self.game().id() + '/start', {
            method: 'post',
            contentType: 'application/json',
            data: JSON.stringify({})
        });
    };

    this.handleUpdate = function (update) {
        var type = update.type;
        var data = update.data;

        console.log('Update: Type ' + type + ', data ' + JSON.stringify(data));

        if (type == Game.Server.Update.GAME_DATA) {
            this.sendUpdates(false);
            this.game().fromJson(data);
            this.sendUpdates(true);

            // FIXME cleanup title change
            $('title').text(data.name + ' - Cards Against Equestria');
        } else if (type == Game.Server.Update.CHAT) {
            if (data.user) {
                console.log('Chat message by ' + data.user.id + '/' + data.user.name + ': ' + data.type + ': ' + data.message);
            } else {
                console.log('System message: ' + data.type + ': ' + data.message);
            }
            this.gameChat().receive(data);

        } else if (type == Game.Server.Update.PLAYER_JOIN) {
            console.log('Player joined: ' + JSON.stringify(data));
            this.game().players.push(data);
            this.gameChat().receive({
                time: Date.now(),
                type: Chat.GAME_MESSAGE,
                message: data.name + ' joined the game'
            });

        } else if (type == Game.Server.Update.PLAYER_LEAVE) {
            console.log('Player left: ' + JSON.stringify(data));
            var player = _.find(self.game().players(), function (player) {
                return player.id == data.id;
            });
            this.game().players.remove(player);

            if (data.id == this.user.id) {
                interruptListen();
                // TODO make this prettier
                alert('Kicked by host');
                window.location.href = '/games';
            } else {
                this.gameChat().receive({
                    time: Date.now(),
                    type: Chat.GAME_MESSAGE,
                    message: player.name + ' left the game (' + data.reason + ')'
                });
            }

        } else if (type == Game.Server.Update.STATE) {
            console.log('Game state changed to ' + data.state);
            window.location.reload(true);
        }
    };

};
