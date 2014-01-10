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

app.set('views', __dirname + '/views');
app.set('view engine', 'hbs');

var hbs = require('hbs');
require('handlebars-layouts')(hbs.handlebars);

if (config.analytics) {
    hbs.handlebars.registerPartial('util/analytics', fs.readFileSync(__dirname + '/views/util/analytics.hbs', 'utf8'));
    app.locals.useAnalytics = true;
}

hbs.handlebars.registerPartial('layouts/default', fs.readFileSync(__dirname + '/views/layouts/default.hbs', 'utf8'));
hbs.handlebars.registerPartial('derp1', fs.readFileSync(__dirname + '/views/util/derp.hbs', 'utf8'));
hbs.handlebars.registerPartial('derp2', fs.readFileSync(__dirname + '/views/util/derp2.hbs', 'utf8'));

hbs.handlebars.registerPartial('globalChat', fs.readFileSync(__dirname + '/views/chat/chat.hbs', 'utf8'));
hbs.handlebars.registerPartial('chatMessage', fs.readFileSync(__dirname + '/views/chat/message.hbs', 'utf8'));

require('./lib/helpers/input')(hbs);
require('./lib/helpers/util')(hbs);

var versionString = 'v' + require('./package.json').version;
hbs.registerHelper('version', function () {
    return versionString;
});

hbs.registerHelper('ajaxLoader', function () {
    return new hbs.handlebars.SafeString('<img src="/img/ajax-loader.gif" alt="Loading...">');
});

hbs.registerHelper('ifCond', function (v1, operator, v2, options) {
    switch (operator) {
        case '==':
            return (v1 == v2) ? options.fn(this) : options.inverse(this);
        case '===':
            return (v1 === v2) ? options.fn(this) : options.inverse(this);
        case '<':
            return (v1 < v2) ? options.fn(this) : options.inverse(this);
        case '<=':
            return (v1 <= v2) ? options.fn(this) : options.inverse(this);
        case '>':
            return (v1 > v2) ? options.fn(this) : options.inverse(this);
        case '>=':
            return (v1 >= v2) ? options.fn(this) : options.inverse(this);
        case '||':
            return (v1 || v2) ? options.fn(this) : options.inverse(this);
        case '&&':
            return (v1 && v2) ? options.fn(this) : options.inverse(this);
        default:
            return options.inverse(this);
    }
});

var minIfProduction = '';
if (config.env != 'development') {
    minIfProduction = '.min';
}
hbs.registerHelper('minIfDev', function () {
    return minIfDev;
});

app.use(express.urlencoded());
app.use(express.json());

app.use(express.methodOverride());

app.use(express.cookieParser());
app.use(express.session({secret: config.sessionSecret}));
app.use(flash());

//app.use(express.favicon());

app.use(express.static(path.join(__dirname, 'dist')));

app.locals.themes = config.themes;

var themeIds = _.pluck(config.themes, 'id');
app.use(function (req, res, next) {
    var themeId = req.cookies.theme;
    if (!themeId || !_.contains(themeIds, themeId)) {
        themeId = config.defaultTheme;
    }

    res.locals.theme = _.find(config.themes,function (theme) {
        return theme.id == themeId;
    }).file;

    next();
});

var ajaxAuth = function (req, res, next) {
    if (req.path != '/ajax/user/login' && req.path.indexOf('/ajax/') == 0 && !req.session.user) {
        res.send(403);
        return;
    }

    next();
};

var auth = function (req, res, next) {
    if (!req.session.user
        && !_.contains(['/', '/user/login', '/ajax/user/login'], req.path)
        && !(/^\/info\/.+/.test(req.path) && req.method == 'GET')
        && !(/^\/game\/join\/\d+/.test(req.path) && req.method == 'GET')
        && !(/^\/game\/lobby\/\d+/.test(req.path) && req.method == 'GET')
        && !(/^\/game\/play\/\d+/.test(req.path) && req.method == 'GET')) {

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

    res.locals.user = req.session.user;

    next();
};

app.use(ajaxAuth);
app.use(auth);

app.use(function (req, res, next) {
    res.locals(req.flash());

    next();
});

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
require('./routes/ajax/chat')(app);
require('./routes/ajax/game')(app, game);

http.createServer(app).listen(config.port, function () {
    log.info('Server listening on port ' + config.port);
});
