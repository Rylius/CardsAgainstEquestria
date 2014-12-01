var log = require('logule').init(module);
var _ = require('underscore');

var https = require('https');

var config = null;

var probeDeck = function (req, res) {
    res.type('application/json');

    var code = req.body.code;
    if (!code || code.length != 5) {
        res.send(400);
        return;
    }

    var options = {
        host: config.cardcast.host,
        port: config.cardcast.port,
        method: 'GET',
        path: _.template(config.cardcast.deckInfo)({deck: code})
    };
    console.log(options);

    var importReq = https.request(options, function (importRes) {
        log.debug('Importing CardCast deck: ' + importRes.statusCode);
        if (importRes.statusCode != 200) {
            res.send(JSON.stringify({response: {id: 'not_found', message: 'Deck not found'}}));
            return;
        }

        importRes.setEncoding('utf-8');
        importRes.on('data', function (chunk) {
            log.trace('Deck metadata successfully imported');
            res.send(JSON.stringify({response: JSON.parse(chunk)}));
        });
    });

    importReq.on('error', function (err) {
        log.info('Failed to import CardCast deck (options: ' + JSON.stringify(options) + '): ' + err.message);
        res.send(500);
    });

    importReq.end();
};

var importDeck = function (req, res) {
    // TODO
    res.send(500);
};

module.exports = function (app, appConfig) {
    config = appConfig;

    app.post('/ajax/admin/cardcast/probe', probeDeck);
    app.post('/ajax/admin/cardcast/import', importDeck);
};
