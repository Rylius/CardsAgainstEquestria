function AdminViewModel(process, memory, users, games, bans, settings, gameId) {

    var self = this;

    this.busy = ko.observable(false);

    this.restarting = ko.observable(settings.restarting);

    this.motd = ko.observable(settings.motd);

    this.nodeVersion = process.version;
    this.pid = process.pid;

    this.uptime = ko.observable(process.uptime);

    this.rss = ko.observable(memory.rss);
    this.heapTotal = ko.observable(memory.heapTotal);
    this.heapUsed = ko.observable(memory.heapUsed);

    this.gameId = ko.observable(gameId);

    this.users = ko.observableArray();
    _.each(users, function (user) {
        self.users.push(user);
    });

    this.games = ko.observableArray();
    _.each(games, function (game) {
        self.games.push(game);
    });

    this.bans = ko.observableArray();
    _.each(bans, function (ban) {
        self.bans.push(ban);
    });

    this.allowGames = ko.observable(settings.allowNewGames);
    this.restartWait = ko.observable(true);
    this.restartUpdate = ko.observable(true);
    this.broadcastMessage = ko.observable('');

    this.allowGames.subscribeChanged(function (newValue) {
        self.updateSettings({allowNewGames: newValue});
    });

    // ajax

    this.changeMotd = function () {
        self.busy(true);
        $.ajax('/ajax/admin/motd', {
            method: 'post',
            data: {message: self.motd()},
            success: function () {
            },
            error: function (xhr, error, status) {
                alert('Failed to change MOTD\n' + error + ': ' + status);
            },
            complete: function () {
                self.busy(false);
            }
        });
    };

    this.doBroadcast = function () {
        if (!self.broadcastMessage()) {
            return;
        }

        self.busy(true);
        $.ajax('/ajax/admin/broadcast', {
            method: 'post',
            data: {message: self.broadcastMessage()},
            success: function () {
                self.broadcastMessage('');
            },
            error: function (xhr, error, status) {
                alert('Failed to send broadcast\n' + error + ': ' + status);
            },
            complete: function () {
                self.busy(false);
            }
        });
    };

    this.doRestart = function () {
        self.busy(true);
        if (confirm('Are you sure?')) {
            $.ajax('/ajax/admin/restart', {
                method: 'post',
                data: {
                    wait: self.restartWait(),
                    update: self.restartUpdate()
                },
                complete: function () {
                    window.location.reload(true);
                }
            });
        } else {
            self.busy(false);
        }
    };

    this.updateSettings = function (settings) {
        self.busy(true);
        $.ajax('/ajax/admin/settings', {
            method: 'post',
            data: settings,
            error: function (xhr, error, status) {
                alert('Failed to update application settings\n' + error + ': ' + status);
            },
            complete: function () {
                self.busy(false);
            }
        });
    };

    this.removeBan = function (ban) {
        self.busy(true);
        $.ajax('/ajax/admin/removeBan', {
            method: 'post',
            data: ban,
            error: function (xhr, error, status) {
                alert('Failed to remove ban\n' + error + ': ' + status);
            },
            complete: function () {
                self.busy(false);
                self.bans.remove(ban);
            }
        });
    };

    // value formatters

    this.formatMegaBytes = function (bytes) {
        return (bytes / 1048576).toFixed(2) + ' MB';
    };

    this.formatUptime = ko.computed(function () {
        var uptime = self.uptime();
        var seconds = Math.round(uptime % 60);
        var minutes = Math.round(Math.floor((uptime / 60) % 60));
        var hours = Math.round(Math.floor((uptime / 3600) % 24));
        var days = Math.round(Math.floor((uptime / 86400) % 7));
        var weeks = Math.round(Math.floor(uptime / 604800));

        var format = '';

        var add = function (time, name) {
            if (time > 0) {
                format += time + ' ' + name;
                if (time != 1) {
                    format += 's';
                }
                format += ' ';
            }
        };

        add(weeks, 'week');
        add(days, 'day');
        add(hours, 'hour');
        add(minutes, 'minute');
        add(seconds, 'second');

        return format;
    });

    this.formatRss = ko.computed(function () {
        return self.formatMegaBytes(self.rss());
    });

    this.formatHeapTotal = ko.computed(function () {
        return self.formatMegaBytes(self.heapTotal());
    });

    this.formatHeapUsed = ko.computed(function () {
        return self.formatMegaBytes(self.heapUsed()) + ' (' + Math.round((self.heapUsed() / self.heapTotal()) * 100) + '%)';
    });

    this.formatGameState = function (state) {
        if (state == Game.State.LOBBY) {
            return 'Lobby';
        } else if (state == Game.State.PLAYING) {
            return 'Playing';
        } else if (state == Game.State.ENDED) {
            return 'Ended';
        }
        return 'Broken';
    }

}

function AdminUserViewModel(userId) {

    var self = this;

    this.userId = userId;

    this.busy = ko.observable(false);

    this.banReason = ko.observable('');
    this.changedName = ko.observable('');

    this.banUser = function () {
        self.busy(true);
        $.ajax('/ajax/admin/banUser', {
            method: 'post',
            data: {userId: userId, reason: this.banReason()},
            error: function (xhr, error, status) {
                alert('Failed to kick user\n' + error + ': ' + status);
            },
            complete: function () {
                window.location.reload(true);
            }
        });
    };

    this.changeUserName = function () {
        self.busy(true);
        $.ajax('/ajax/admin/changeUserName', {
            method: 'post',
            data: {userId: userId, name: this.changedName()},
            error: function (xhr, error, status) {
                alert('Failed to change user name\n' + error + ': ' + status);
            },
            complete: function () {
                window.location.reload(true);
            }
        });
    };

}
