var _ = require('underscore');
var changesData = _.first(require('../changes.json'), 3);

var index = function (req, res) {
    res.render('index', {
        changes: changesData
    });
};

module.exports = function (app) {
    app.get('/', index);
};
