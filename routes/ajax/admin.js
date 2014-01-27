var log = require('logule').init(module);
var _ = require('underscore');

var Settings = require('../../lib/settings');
var Games = require('../../lib/game');

var Chat = require('../../lib/chat');
var MessageType = require('../../lib/constants').Chat;

var broadcast = function (req, res) {
    var text = req.body.message;
    if (!text) {
        res.send(400);
        return;
    }

    Chat.global.sendSystemMessage(text);

    _.each(Games.listGames(), function (game) {
        game.chat.sendMessage(new Chat.Message(Chat.systemUser, MessageType.GAME_MESSAGE, text));
    });

    res.send(200);
};

var restart = function (req, res) {
    // TODO
    res.send(200);
};

var settings = function (req, res) {
    log.debug(req.session.user.name + '/' + req.session.user.id + ' updated settings: ' + JSON.stringify(req.body));

    Settings.load(req.body);

    res.send(200);
};

module.exports = function (app) {
    app.post('/ajax/admin/broadcast', broadcast);
    app.post('/ajax/admin/restart', restart);
    app.post('/ajax/admin/settings', settings);
};
