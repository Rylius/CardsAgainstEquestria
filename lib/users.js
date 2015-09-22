var log = require('logule').init(module);
var _ = require('underscore');

var crypto = require('crypto');

var Chat = require('./chat');

var game = require('./game');

var model = require('./model');

var Permissions = require('./permissions');

var users = {};

function ClientData() {
    this.ip = 'unknown';
    this.userAgent = 'unknown';
}

function User(id, name, session) {

    var self = this;

    this.id = id;
    this.name = name;

    this.registered = false;

    this.permissions = [];

    this.clientData = new ClientData();

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

// TODO This entire API is ugly and needs a rewrite

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

    model.User.find({name: name}, 1, function (err, result) {
        if (err) {
            log.warn('Failed to search for user: ' + err);
            callback({error: 'Internal error, try again or complain'});
            return;
        }

        // can skip password check if we're regaining a session
        if (!id && result.length) {
            var row = result[0];
            if (!password || crypto.pbkdf2Sync(password, row.password_salt, 10000, 256).toString('base64') != row.password) {
                callback({error: 'Wrong password'});
                return;
            }

            id = row.id;
            row.last_login = new Date();

            // workaround for https://github.com/dresende/node-orm2/issues/398
            if (row.permissions && !row.permissions[0]) {
                delete row.permissions;
            }

            row.save(function (err) {
                if (err) {
                    log.warn('Failed to save user: ' + err);
                    callback({error: 'Internal error, try again or complain'});
                }
            });
        }

        var doLogin = function (userId) {
            var user = new User(userId, name, session);
            user.registered = !!result.length;

            if (user.registered) {
                user.permissions = result[0].permissions;
            }

            user.resetTimeout();
            users[user.id] = user;

            var permissionIds = _.pluck(user.permissions, 'id');
            session.user = {
                id: user.id,
                name: user.name,
                registered: user.registered,
                admin: _.contains(permissionIds, Permissions.Admin.id),
                permissions: permissionIds
            };

            Chat.global.addUser(user);

            log.debug('Logged in ' + user.id + '/' + user.name);
            callback({success: 'Logged in!'});
        };

        if (id) {
            doLogin(id);
        } else {
            model.db.driver.execQuery('SELECT nextval(\'object_id_seq\');', function (err, nextval) {
                if (err) {
                    log.warn('Failed to get next user ID: ' + err);
                    callback({error: 'Internal error, try again or complain'});
                    return;
                }

                doLogin(nextval[0].nextval);
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
