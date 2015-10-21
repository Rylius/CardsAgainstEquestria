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

    this.sets = ko.observableArray();
    this.expansions = ko.observableArray();

    this.addCustomSetId = ko.observable('');
    this.addCustomSetLoading = ko.observable(false);
    this.addCustomSetMessage = ko.observable(null);

    this.rules = ko.observableArray();

    this.starting = ko.observable(false);

    this.sendUpdates = ko.observable(true);

    this.bans = ko.observableArray();

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

        document.title = self.game().name() + ' - Cards Against Equestria';
    };

    this.addCustomSetFromId = function () {
        self.addCustomSetLoading(true);
        self.addCustomSetMessage(null);
        $.ajax('/ajax/game/' + self.game().id() + '/addSet', {
                method: 'post',
                data: {cahCreatorId: self.addCustomSetId()},
                success: function (data) {
                    data.id = self.addCustomSetId();
                    if (data !== 'OK') {
                        self.game().customSets.push(data);
                        self.update();

                        self.addCustomSetMessage('Deck added: ' + data.name + ' - ' + data.description);
                    } else {
                        self.addCustomSetMessage('Deck has already been added');
                    }
                    self.addCustomSetId('');
                },
                error: function () {
                    self.addCustomSetMessage('There doesn\'t seem to be any deck with that ID. :(')
                },
                complete: function () {
                    self.addCustomSetLoading(false);
                }
            }
        );
    };

    this.removeCustomSet = function (deck) {
        $.ajax('/ajax/game/' + self.game().id() + '/removeSet', {
                method: 'post',
                data: {cahCreatorId: deck.id},
                success: function (data) {
                    self.game().customSets.remove(deck);
                    self.update();
                },
                error: function () {
                    self.gameChat().showError('Failed to remove custom set - try again!');
                }
            }
        );
    };

    // TODO duplicated in cards.js
    this.kick = function (player) {
        if (confirm('Are you sure?')) {
            $.ajax('/ajax/game/' + self.game().id() + '/kick/' + player.id, {
                method: 'post',
                error: function () {
                    self.gameChat().showError('Failed to kick player - try again!');
                }
            });
        }
    };

    this.ban = function (player) {
        if (confirm('Are you sure?')) {
            $.ajax('/ajax/game/' + self.game().id() + '/ban', {
                method: 'post',
                data: {player: player},
                success: function () {
                    self.bans.removeAll();
                    self.loadBans();
                },
                error: function () {
                    self.gameChat().showError('Failed to ban player - try again!');
                }
            });
        }
    };

    this.unban = function (player) {
        $.ajax('/ajax/game/' + self.game().id() + '/unban/' + player.id, {
            method: 'post',
            success: function () {
                self.bans.removeAll();
                self.loadBans();
            },
            error: function () {
                self.gameChat().showError('Failed to unban player - try again!');
            }
        });
    };

    this.loadBans = function () {
        $.ajax('/ajax/game/' + self.game().id() + '/bans', {
            method: 'get',
            success: function (bans) {
                _.each(bans, function (ban) {
                    self.bans.push(ban);
                });
            },
            error: function () {
                self.gameChat().showError('Failed to load list of bans');
            }
        });
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

            document.title = data.name + ' - Cards Against Equestria'; // TODO should the app name (in this case "Cards Against Equestria") be stored in the
                                                                       // config or something? this would be a pain to change everywhere.
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
