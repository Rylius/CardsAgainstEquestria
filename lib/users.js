var log = require('logule').init(module);
var _ = require('underscore');

var crypto = require('crypto');

var Model = require('./db/model');
var database = require('./db/database');
var sql = require('sql');

var Chat = require('./chat');

var game = require('./game');

var users = {};

function User(id, name, session) {

    var self = this;

    this.id = id;
    this.name = name;

    this.registered = false;

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
        return {id: this.id, name: this.name, registered: this.registered};
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

exports.login = function (session, name, password, id, callback) {
    if (session.user) {
        log.trace('User already ' + session.user.name + ' logged in');
        callback({error: 'Already logged in'});
        return;
    }

    var existing = exports.findByName(name);
    if (existing) {
        log.trace('Name ' + existing.name + ' already in use');
        callback({error: 'Name already taken. If that\'s you, please wait two minutes and try again.'});
        return;
    }

    if (!name) {
        callback({error: 'You have to specify a name'});
        return;
    } else if (name.length > 24) {
        callback({error: 'Your name is too long'});
        return;
    } else if (!/^[\w\-\_]+$/.exec(name)) {
        callback({error: 'Your name can only contain letters from a-z, underscores and numbers'});
        return;
    }

    var query = Model.User.select(Model.User.star()).from(Model.User)
        .where(Model.User.name.equals(name))
        .limit(1)
        .toQuery();

    database.pool.query(query.text, query.values, function (err, result) {
        if (err) {
            log.warn('Failed to search for user: ' + err);
            callback({error: 'Internal error, try again or complain'});
            return;
        }

        // can skip password check if we're regaining a session
        if (!id && result.rowCount) {
            var row = result.rows[0];
            if (!password || crypto.pbkdf2Sync(password, row.password_salt, 10000, 256).toString('base64') != row.password) {
                callback({error: 'Wrong password'});
                return;
            }

            id = row.id;
        }

        var doLogin = function (userId) {
            var user = new User(userId, name, session);
            user.registered = !!result.rowCount;

            user.resetTimeout();
            users[user.id] = user;

            session.user = {
                id: user.id,
                name: user.name,
                registered: user.registered
            };

            Chat.global.addUser(user);

            log.debug('Logged in ' + user.name + '/' + user.id);
            callback({success: 'Logged in!'});
        };

        if (id) {
            doLogin(id);
        } else {
            database.pool.query('SELECT NEXTVAL(\'object_id_seq\');', function (err, nextval) {
                if (err) {
                    log.warn('Failed to get next user ID: ' + err);
                    callback({error: 'Internal error, try again or complain'});
                    return;
                }

                doLogin(nextval.rows[0].nextval);
            });
        }
    });
};

exports.logout = function (id, session) {
    var user = exports.get(id);
    if (!user) {
        return;
    }

    Chat.global.removeUser(user);

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
