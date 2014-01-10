var log = require('logule').init(module);

var Chat = require('../../lib/chat');
var Users = require('../../lib/users');

var post = function (req, res) {
    var user = req.session.user ? Users.get(req.session.user.id) : null;
    if (!user) {
        res.send(403);
        return;
    }

    // TODO clean up validation

    var type = parseInt(req.body.type);
    if (type < 0 || type > 1) {
        res.send(400);
        return;
    }

    var text = req.body.message;
    if (!text || text.length == 0 || text.length > 8192) {
        res.send(400);
        return;
    }

    var message = new Chat.Message(user, type, text);

    log.trace('Global chat message from ' + user.id + '/' + user.name + ': ' + JSON.stringify(message));

    Chat.global.sendMessage(message);

    res.send(200);
};

var listen = function (req, res) {
    var user = req.session.user ? Users.get(req.session.user.id) : null;
    if (!user) {
        res.send(403);
        return;
    }

    res.type('application/json');

    var messages = Chat.global.messages[user.id];
    if (messages && messages.length > 0) {
        var data = JSON.stringify(messages);
        res.send(data);

        log.trace('Sent buffered messages to ' + user.id + '/' + user.name + ': ' + data);
        return;
    }

    var request = Chat.global.requests[user.id];
    if (request) {
        clearTimeout(request.timeoutId);
        log.trace('Removed previous listen request for ' + user.id + '/' + user.name);
    }

    Chat.global.requests[user.id] = {
        timeoutId: setTimeout(function () {
            res.send(JSON.stringify([]));

            delete Chat.global.requests[user.id];

            log.trace('Chat listen request by ' + user.id + '/' + user.name + ' returned empty');
        }, 90000),
        userId: user.id,
        response: res
    };

    log.trace('Holding back messages response for ' + user.id + '/' + user.name);
};

module.exports = function (app) {
    app.post('/ajax/chat/post', post);
    app.get('/ajax/chat/listen', listen);
};
