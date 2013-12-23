var _ = require('underscore');
var hbs;

var text = function (id, label, helpText, attributes) {
    var help = '';
    if (typeof helpText === 'string') {
        help = '<span class="help-block">' + helpText + '</span>';
    }

    var attrs = '';
    if (attributes) {
        attrs = attributes;
    }

    var html = '<div class="form-group">' +
        '<label for="' + id + '" class="col-md-3 control-label">' + label + '</label>' +
        '<div class="col-md-9">' +
        '<input type="text" id="' + id + '" name="' + id + '" class="form-control" ' + attrs + '>' + help + '</div></div>';
    return new hbs.handlebars.SafeString(html);
};

var password = function (id, label, helpText, attributes) {
    var help = '';
    if (typeof helpText === 'string') {
        help = '<span class="help-block">' + helpText + '</span>';
    }

    var attrs = '';
    if (attributes) {
        attrs = attributes;
    }

    var html = '<div class="form-group">' +
        '<label for="' + id + '" class="col-md-3 control-label">' + label + '</label>' +
        '<div class="col-md-9">' +
        '<input type="password" id="' + id + '" name="' + id + '" class="form-control" ' + attrs + '>' + help + '</div></div>';
    return new hbs.handlebars.SafeString(html);
};

var dropdown = function (id, source, selected, label, helpText, attributes) {
    var help = '';
    if (typeof helpText === 'string') {
        help = '<span class="help-block">' + helpText + '</span>';
    }

    var options = '';
    _.each(source, function (key, value) {
        options += '<option ' + (selected == key ? 'selected="selected"' : '') +
            ' id="' + key + '">' +
            ((typeof value === 'string') ? value : key)
            + '</option>\n';
    });

    var attrs = '';
    if (attributes) {
        attrs = attributes;
    }

    var html = '<div class="form-group">' +
        '<label for="' + id + '" class="col-md-3 control-label">' + label + '</label>' +
        '<div class="col-md-9">' +
        '<select id="' + id + '" name="' + id + '" ' + attrs + '>' +
        options + '</select>' +
        help + '</div></div>';
    return new hbs.handlebars.SafeString(html);
};

module.exports = function (handlebars) {
    hbs = handlebars;

    hbs.registerHelper('input:text', text);
    hbs.registerHelper('input:password', password);
    hbs.registerHelper('input:dropdown', dropdown);
};
