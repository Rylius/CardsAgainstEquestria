function AdminViewModel(process, memory, users, games) {

    var self = this;

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

    // helpers

    this.formatMegaBytes = function (bytes) {
        return (bytes / 1048576).toFixed(2) + ' MB';
    };

    // value formatters

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

}
