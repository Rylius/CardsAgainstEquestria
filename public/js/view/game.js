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

                } else if (status == Join.BANNED) {
                    console.log('Banned');
                    game.message('You have been banned');
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

var JoinGameViewModel = function (sets) {

    var self = this;

    this.sets = sets.sets;
    this.expansions = sets.expansions;

    this.game = ko.observable(new GameViewModel());
    this.password = ko.observable();

    this.name = ko.observable($.cookie('name'));
    this.userPassword = ko.observable();
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

            saveName(self.name());

            $.ajax('/ajax/user/login', {
                method: 'post', data: {name: self.name(), password: self.userPassword()},
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

                    // TODO request game data
                } else if (status == Join.NOT_FOUND) {
                    console.log('Game not found');

                    window.location.reload(true);
                } else if (status == Join.PASSWORD_INCORRECT || status == Join.PASSWORD_REQUIRED) {
                    console.log('Wrong password');

                    self.message('Wrong game password');
                    self.error(true);

                    if (!self.game().passworded()) {
                        // TODO request game data
                        console.log('Reloading page (game data changed)');
                        window.location.reload(true);
                    }
                } else if (status == Join.BANNED) {
                    console.log('Banned');

                    self.message('You have been banned');
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

    this.customSets = ko.observableArray();

    this.rules = ko.observableArray();

    this.scoreLimit = ko.observable(8);
    this.playerLimit = ko.observable(12);
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

        self.customSets.removeAll();
        _.forEach(json.customSets, function (s) {
            self.customSets.push(s);
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
