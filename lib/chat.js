var log = require('logule').init(module);

var events = require('events');
var util = require('util');

var MessageType = require('./constants').Chat;

var _ = require('underscore');

var systemUser = {
    id: -1,
    name: '<system>',
    toJson: function () {
        return null;
    }
};

function Message(user, type, message) {

    this.time = Date.now();

    this.user = user;
    this.type = type;
    this.message = message;

    this.toJSON = function () {
        return {
            time: this.time,
            user: this.user.toJson(),
            type: this.type,
            message: this.message
        };
    };
}

function Channel() {

    this.users = [systemUser];

    this.history = [];
    this.maxHistory = 20;

    this.addUser = function (user) {
        if (!_.contains(this.users, user)) {
            this.users.push(user);
            this.emit('join', user);
        }
    };

    this.removeUser = function (user) {
        var index = this.users.indexOf(user);
        if (index >= 0) {
            this.users.splice(index, 1);
            this.emit('leave', user);
        }
    };

    this.sendMessage = function (message) {
        if (message.user && !_.contains(this.users, message.user)) {
            return;
        }

        this.history.push(message);
        if (this.history.length > this.maxHistory) {
            this.history.splice(0, this.history.length - this.maxHistory);
        }

        this.emit('message', message);
    };

    events.EventEmitter.call(this);
}

util.inherits(Channel, events.EventEmitter);

var global = new Channel();

global.messages = {};
global.requests = {};

global.sendSystemMessage = function (text) {
    global.sendMessage(new Message(systemUser, MessageType.GAME_MESSAGE, text));
};

global.addRequest = function (user, request) {
    global.requests[user.id].push(request);
};

global.removeRequest = function (user, request) {
    var requests = global.requests[user.id];
    if (requests) {
        var i = requests.indexOf(request);
        if (i >= 0) {
            requests.splice(i, 1);
        }
    }
};

global.send = function () {
    _.each(global.requests, function (requests) {
        if (!requests) {
            return;
        }

        var userId = -1;
        _.each(requests, function (req) {
            var data = JSON.stringify(global.messages[req.userId]);

            try {
                req.response.send(data);

                log.trace('Sent messages to pending request of ' + req.userId);

                clearTimeout(req.timeoutId);
            } catch (e) {
                log.error('Global chat failed to send messages for ' + req.userId + ': ' + e);
            }

            userId = req.userId;
        });

        if (userId != -1) {
            global.messages[userId] = [];
            global.requests[userId] = [];
        }
    });
};

global.on('join', function (user) {
    global.sendSystemMessage(user.name + ' connected');

    global.messages[user.id] = [];
    global.requests[user.id] = [];
});

global.on('leave', function (user) {
    delete global.messages[user.id];
    delete global.requests[user.id];

    global.sendSystemMessage(user.name + ' disconnected');
});

global.on('message', function (message) {
    _.each(global.messages, function (queue, userId) {
        if (!message.user || userId != message.user.id) {
            queue.push(message);
        }
    });

    global.send();
});

module.exports = {
    Channel: Channel,
    Message: Message,
    global: global,
    systemUser: systemUser
};
