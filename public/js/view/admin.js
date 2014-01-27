function AdminViewModel(process, memory, users, games, settings) {

    var self = this;

    this.busy = ko.observable(false);

    this.nodeVersion = process.version;
    this.pid = process.pid;

    this.uptime = ko.observable(process.uptime);

    this.rss = ko.observable(memory.rss);
    this.heapTotal = ko.observable(memory.heapTotal);
    this.heapUsed = ko.observable(memory.heapUsed);

    this.users = ko.observableArray();
    _.each(users, function (user) {
        self.users.push(user);
    });

    this.games = ko.observableArray();
    _.each(games, function (game) {
        self.games.push(game);
    });

    this.allowGames = ko.observable(settings.allowNewGames);
    this.restartWait = ko.observable(true);
    this.restartUpdate = ko.observable(true);
    this.broadcastMessage = ko.observable('');

    this.allowGames.subscribeChanged(function (newValue) {
        self.updateSettings({allowNewGames: newValue});
    });

    // ajax

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
                success: function () {
                    window.location.reload(true);
                },
                error: function (xhr, error, status) {
                    alert('Failed to request application restart\n' + error + ': ' + status);
                },
                complete: function () {
                    self.busy(false);
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
