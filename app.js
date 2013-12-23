var express = require('express');
var http = require('http');
var path = require('path');
var fs = require('fs');

var flash = require('connect-flash');

var log = require('logule').init(module);

process.title = 'cae';

var app = express();

var _ = require('underscore');
var extend = require('extend');

var config = require('./config');

var users = require('./lib/users');

var less = require('less-middleware');

app.set('views', __dirname + '/views');
app.set('view engine', 'hbs');

var hbs = require('hbs');
require('handlebars-layouts')(hbs.handlebars);

hbs.handlebars.registerPartial('layouts/default', fs.readFileSync(__dirname + '/views/layouts/default.hbs', 'utf8'));
hbs.handlebars.registerPartial('util/analytics', fs.readFileSync(__dirname + '/views/util/analytics.hbs', 'utf8'));
hbs.handlebars.registerPartial('derp1', fs.readFileSync(__dirname + '/views/util/derp.hbs', 'utf8'));
hbs.handlebars.registerPartial('derp2', fs.readFileSync(__dirname + '/views/util/derp2.hbs', 'utf8'));

require('./lib/helpers/input')(hbs);
require('./lib/helpers/util')(hbs);

var versionString = 'v' + require('./package.json').version + ' (';
require('child_process').exec(config.revisionCommand, function (error, stdout) {
    versionString += stdout + ')';
});
hbs.registerHelper('version', function () {
    return versionString;
});

hbs.registerHelper('ajaxLoader', function () {
    return new hbs.handlebars.SafeString('<img src="/img/ajax-loader.gif" alt="Loading...">');
});

app.use(express.urlencoded());
app.use(express.json());

app.use(express.methodOverride());

app.use(express.cookieParser());
app.use(express.session({secret: config.sessionSecret}));
app.use(flash());

app.use(express.favicon());

app.use(less(extend({src: path.join(__dirname, 'public')}, config.less)));
app.use(express.static(path.join(__dirname, 'public')));

var auth = function (req, res, next) {
    if (!req.session.user
        && !_.contains(['/', '/user/login', '/ajax/user/login'], req.path)
        && !(/^\/info\/.+/.test(req.path) && req.method == 'GET')
        && !(/^\/game\/join\/\d+/.test(req.path) && req.method == 'GET')) {

        req.flash('error', 'You need to log in to do that');
        req.flash('loginRedirect', req.path);
        res.redirect('/');
        return;
    }

    if (req.session.user) {
        var user = users.get(req.session.user.id);

        if (user) {
            user.resetTimeout();
        } else {
            var id = req.session.user.id;
            var name = req.session.user.name;
            req.session.user = null;
            log.debug(name + '/' + id + ': Trying to regain previous user');

            user = users.findByName(name);
            if (!user) {
                user = users.get(id);
                if (!user) {
                    users.login(req.session, name, id);
                }
            }
        }
    }

    next();
};

app.use(auth);
app.use(app.router);

if (config.env == 'development') {
    app.use(express.errorHandler());
}

if (config.trustProxy) {
    app.enable('trust proxy');
}

// game

var game = require('./lib/game');
game.load(__dirname, config);

log.info('Loaded game data (' + game.cards.sets.length + ' sets, ' + game.cards.expansions.length + ' expansions, ' +
    game.cards.blackCards.length + ' black cards, ' + game.cards.whiteCards.length + ' white cards' + ')');

// pages

require('./routes/index')(app);
require('./routes/info')(app);
require('./routes/user')(app);
require('./routes/game')(app, game);
require('./routes/admin')(app);

// ajax

require('./routes/ajax/user')(app);
require('./routes/ajax/game')(app, game);

http.createServer(app).listen(config.port, function () {
    log.info('Server listening on port ' + config.port);
});
