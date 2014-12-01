var log = require('logule').init(module);
var _ = require('underscore');

var config = null;

var exec = require('child_process').exec;

var Settings = require('../../lib/settings');
var Games = require('../../lib/game');

var Chat = require('../../lib/chat');
var MessageType = require('../../lib/constants').Chat;

var motd = function (req, res) {
    var text = req.body.message;
    if (text == '') {
        text = null;
    }

    log.debug(req.session.user.name + '/' + req.session.user.id + ' changed MOTD: ' + text);

    Settings.motd = text;

    res.send(200);
};

var broadcast = function (req, res) {
    var text = req.body.message;
    if (!text) {
        res.send(400);
        return;
    }

    log.debug(req.session.user.name + '/' + req.session.user.id + ' sent broadcast: ' + text);

    Chat.global.sendSystemMessage(text);

    _.each(Games.listGames(), function (game) {
        game.chat.sendMessage(new Chat.Message(Chat.systemUser, MessageType.GAME_MESSAGE, text));
    });

    res.send(200);
};

var restart = function (req, res) {
    log.info(req.session.user.name + '/' + req.session.user.id + ' triggered application restart');

    res.send(200);

    var doRestart = function () {
        var doExit = function () {
            log.info('Shutting down');
            process.exit();
        };

        if (req.body.update == 'true' && config.updateCommand) {
            exec(config.updateCommand, function (error, stdout, stderr) {
                if (error) {
                    log.warn(error);
                }

                doExit();
            });
        } else {
            doExit();
        }
    };

    if (req.body.wait == 'true' && Games.listGames().length > 0) {
        Settings.restart = doRestart;
        Settings.restarting = true;
    } else {
        doRestart();
    }
};

var settings = function (req, res) {
    log.debug(req.session.user.name + '/' + req.session.user.id + ' updated settings: ' + JSON.stringify(req.body));

    Settings.load(req.body);

    res.send(200);
};

module.exports = function (app, appConfig) {
    config = appConfig;

    app.post('/ajax/admin/motd', motd);
    app.post('/ajax/admin/broadcast', broadcast);
    app.post('/ajax/admin/restart', restart);
    app.post('/ajax/admin/settings', settings);
};
