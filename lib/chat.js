var events = require('events');
var util = require('util');

var _ = require('underscore');

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

    this.users = [];

    this.history = [];
    this.maxHistory = 8;

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
        if (!_.contains(this.users, message.user)) {
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

module.exports = {
    Channel: Channel,
    Message: Message
};
