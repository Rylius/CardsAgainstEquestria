var _ = require('underscore');
var hbs;

var join = function (list, separator) {
    var sep = ', ';
    if (separator) {
        sep = separator;
    }

    return new hbs.handlebars.SafeString(list.join(sep));
};

module.exports = function (handlebars) {
    hbs = handlebars;

    hbs.registerHelper('util:join', join);
};
