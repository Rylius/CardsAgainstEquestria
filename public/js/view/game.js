var Join = Game.Server.Join;

var GameListViewModel = function (sets) {

    var self = this;

    this.sets = sets.sets;
    this.expansions = sets.expansions;

    this.games = ko.observableArray();

    this.loading = ko.observable(true);

    this.loadGames = function () {
        self.loading(true);

        self.games.removeAll();

        $.ajax('/ajax/game/list', {
            success: function (data) {
                self.fromJson(data);
            },
            error: function () {
                // TODO
            },
            complete: function () {
                self.loading(false);
            }
        });
    };

    this.join = function (game) {
        console.log('Joining game ' + game.id());

        game.message('Joining...');
        self.loading(true);

        $.ajax('/game/join/' + game.id(), {
            method: 'post', data: {password: game.password()},
            success: function (data) {
                var status = data.status;

                if (status == Join.SUCCESS_LOBBY || status == Join.SUCCESS_GAME || status == Join.IS_PLAYER) {
                    console.log('Joining lobby');
                    game.message('Loading...');
                    window.location.href = '/game/lobby/' + game.id();

                } else if (status == Join.IS_FULL) {
                    console.log('Game is full');
                    game.message('Game is full');

                } else if (status == Join.NOT_FOUND) {
                    console.log('Game not found');
                    game.message('Game not found');

                } else if (status == Join.PASSWORD_INCORRECT) {
                    console.log('Wrong password');
                    game.message('Incorrect password');

                } else if (status == Join.PASSWORD_REQUIRED) {
                    console.log('No password given');
                    game.message('Password required');
                }
            },
            error: function () {
                // TODO
            },
            complete: function () {
                self.loading(false);
            }
        });
    };

    this.fromJson = function (json) {
        self.games.removeAll();
        _.each(json, function (game) {
            self.games.push(new GameViewModel().fromJson(game));
        });

        self.loading(false);

        return self;
    };

};

var GameLobbyViewModel = function (user) {

    var self = this;

    this.user = user;

    this.game = ko.observable();
    this.gameChat = ko.observable(new ChatViewModel());
    this.gameChat().user(user);
    this.game.subscribeChanged(function (newValue) {
        self.gameChat().gameId(newValue.id());
    });

    this.sets = ko.observableArray();
    this.expansions = ko.observableArray();
    this.rules = ko.observableArray();

    this.starting = ko.observable(false);

    this.sendUpdates = ko.observable(true);

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

        } else if (type == Game.Server.Update.CHAT) {
            console.log('Chat message by ' + data.user.id + '/' + data.user.name + ': ' + data.type + ': ' + data.message);
            this.gameChat().receive(data);

        } else if (type == Game.Server.Update.PLAYER_JOIN) {
            console.log('Player joined: ' + JSON.stringify(data));
            this.game().players.push(data);

        } else if (type == Game.Server.Update.PLAYER_LEAVE) {
            console.log('Player left: ' + JSON.stringify(data));
            this.game().players.remove(_.find(self.game().players(), function (player) {
                return player.id == data.id;
            }));

            if (data.id == this.user.id) {
                interruptListen();
                // TODO make this prettier
                alert('Kicked by host');
                window.location.href = '/games';
            }

        } else if (type == Game.Server.Update.STATE) {
            console.log('Game state changed to ' + data.state);
            window.location.reload(true);
        }
    };

};

var JoinGameViewModel = function (sets) {

    var self = this;

    this.sets = sets.sets;
    this.expansions = sets.expansions;

    this.game = ko.observable(new GameViewModel());
    this.password = ko.observable();

    this.name = ko.observable();
    this.loggedIn = ko.observable(false);

    this.loading = ko.observable(false);
    this.message = ko.observable('');
    this.error = ko.observable(false);

    this.join = function () {
        self.loading(true);
        self.message('Joining game...');
        self.error(false);

        if (!self.loggedIn()) {
            console.log('Logging in');
            self.message('Logging...');

            $.ajax('/ajax/user/login', {
                method: 'post', data: {name: self.name()},
                success: function (data) {
                    if (data.error) {
                        self.message(data.error);
                        self.error(true);
                    } else {
                        self.loggedIn(true);
                        self.join();
                    }
                },
                error: function () {
                    window.location.reload(true);
                },
                complete: function () {
                    self.loading(false);
                }
            });

            return;
        }

        console.log('Joining game ' + self.game().id());

        $.ajax('/game/join/' + self.game().id(), {
            method: 'post', data: {password: self.password()},
            success: function (data) {
                var status = data.status;

                if (status == Join.SUCCESS_GAME || status == Join.SUCCESS_LOBBY || status == Join.IS_PLAYER) {
                    window.location.href = '/game/lobby/' + self.game().id();
                } else if (status == Join.IS_FULL) {
                    console.log('Game is full');

                    self.message('Game is full');
                    self.error(true);
                } else if (status == Join.NOT_FOUND) {
                    console.log('Game not found');

                    window.location.reload(true);
                } else if (status == Join.PASSWORD_INCORRECT || status == Join.PASSWORD_REQUIRED) {
                    console.log('Wrong password');

                    self.message('Incorrect password');
                    self.error(true);
                }
            },
            error: function () {
                window.location.reload(true);
            },
            complete: function () {
                self.loading(false);
            }
        });
    };

    this.formatSets = ko.computed(function () {
        return _.map(self.game().sets(),function (id) {
            return _.find(self.sets,function (s) {
                return s.id == id;
            }).name;
        }).join(', ');
    });

    this.formatExpansions = ko.computed(function () {
        return _.map(self.game().expansions(),function (id) {
            return _.find(self.expansions,function (s) {
                return s.id == id;
            }).name;
        }).join(', ');
    });

};

var GameViewModel = function () {

    var self = this;

    this.id = ko.observable(-1);

    this.name = ko.observable('');
    this.host = ko.observable(null);

    this.state = ko.observable(Game.State.LOBBY);

    this.players = ko.observableArray();

    this.sets = ko.observableArray();
    this.expansions = ko.observableArray();

    this.rules = ko.observableArray();

    this.scoreLimit = ko.observable(8);
    this.playerLimit = ko.observable(6);
    this.roundTimeLimit = ko.observable(60);

    this.password = ko.observable('');
    this.passworded = ko.observable(false);

    this.hidden = ko.observable(false);

    this.message = ko.observable();

    this.title = ko.computed(function () {
        return self.name() + ' (' + self.players().length + '/' + self.playerLimit() + '), goal ' + self.scoreLimit();
    });

    this.valid = ko.computed(function () {
        return self.name().length > 0 && self.sets().length > 0;
    });

    this.ready = ko.computed(function () {
        return self.players().length >= 3;
    });

    this.full = ko.computed(function () {
        return self.players().length >= self.playerLimit();
    });

    this.stateText = ko.computed(function () {
        var state = self.state();
        if (state == Game.State.LOBBY) {
            return 'In Lobby';
        } else if (state == Game.State.PLAYING) {
            return 'In Progress';
        } else if (state == Game.State.ENDED) {
            return 'Ended';
        }

        return '???';
    });

    this.formatPlayers = ko.computed(function () {
        return _.map(self.players(),function (player) {
            var host = self.host().id == player.id;
            var text = player.name;
            if (host) {
                text = '<strong>' + text + '</strong>';
            }

            return text;
        }).join(', ');
    });

    this.formatSets = ko.computed(function () {
        if (!_.isArray(model.sets)) {
            return '';
        }

        return _.map(self.sets(),function (id) {
            return _.find(model.sets,function (s) {
                return s.id == id;
            }).name;
        }).join(', ');
    });

    this.formatExpansions = ko.computed(function () {
        if (!_.isArray(model.expansions)) {
            return '';
        }

        return _.map(self.expansions(),function (id) {
            return _.find(model.expansions,function (s) {
                return s.id == id;
            }).name;
        }).join(', ');
    });

    this.fromJson = function (json) {
        self.id(json.id);

        self.name(json.name);
        self.host(json.host);

        self.state(json.state);

        self.players.removeAll();
        _.each(json.players, function (player) {
            self.players.push(player);
        });

        self.sets.removeAll();
        _.each(json.sets, function (s) {
            self.sets.push('' + s.id);
        });

        self.expansions.removeAll();
        _.each(json.expansions, function (s) {
            self.expansions.push('' + s.id);
        });

        // TODO rules

        self.scoreLimit(json.scoreLimit);
        self.playerLimit(json.playerLimit);

        self.password(json.password);
        self.passworded(json.passworded);

        self.roundTimeLimit(json.roundTimeLimit);
        self.hidden(json.hidden);

        return self;
    };

};
