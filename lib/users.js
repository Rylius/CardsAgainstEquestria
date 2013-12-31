var log = require('logule').init(module);
var _ = require('underscore');

var game = require('./game');

var users = {};
var userId = 1;

function User(id, name, session) {

    var self = this;

    this.id = id;
    this.name = name;

    this.timeout = null;

    this.resetTimeout = function () {
        if (this.timeout) {
            clearTimeout(this.timeout);
        }

        this.timeout = setTimeout(function () {
            log.debug(self.name + '/' + self.id + ' timed out');
            exports.logout(self.id, session);
        }, 120 * 1000);
    };

    this.toJson = function () {
        return {id: this.id, name: this.name};
    };

}

exports.get = function (id) {
    return users[id];
};

exports.findByName = function (name) {
    if (!name) {
        return null;
    }

    return _.find(users, function (user) {
        return user.name.toLocaleLowerCase() === name.toLocaleLowerCase();
    });
};

exports.login = function (session, name, id) {
    if (session.user) {
        log.trace('User already ' + session.user.name + ' logged in');
        return {error: 'Already logged in'};
    }

    var existing = exports.findByName(name);
    if (existing) {
        log.trace('Name ' + existing.name + ' already in use');
        return {error: 'Name already taken. If that\'s you, please wait two minutes and try again.'};
    }

    if (!name) {
        return {error: 'You have to specify a name'};
    } else if (name.length > 24) {
        return {error: 'Your name is too long'};
    } else if (!/^[\w\-\_]+$/.exec(name)) {
        return {error: 'Your name can only contain letters from a-z, underscores and numbers'}
    }

    var user = new User(id ? id : userId++, name, session);

    user.resetTimeout();
    users[user.id] = user;

    session.user = {
        id: user.id,
        name: user.name
    };

    log.debug('Logged in ' + user.name + '/' + user.id);
    return {success: 'Logged in!'};
};

exports.logout = function (id, session) {
    var user = exports.get(id);
    if (!user) {
        return;
    }

    delete users[user.id];

    clearTimeout(user.timeout);

    if (session) {
        session.user = null;
    }

    var games = _.filter(game.listGames(), function (g) {
        return _.find(g.players, function (player) {
            return player.user.id == user.id;
        });
    });

    if (games.length > 0) {
        _.each(games, function (g) {
            g.removePlayer(user, 'Timeout');
        });

        log.trace('Removed user from games: ' + _.map(games, function (g) {
            return g.id;
        }));
    }

    log.debug('Logged out ' + user.name + '/' + user.id);
};

exports.users = users;
