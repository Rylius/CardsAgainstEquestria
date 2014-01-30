var Model = require('./model');

module.exports.load = function (cb) {

    Model.Permission.find({name: 'admin'}, 1, function (err, result) {
        if (err) {
            console.error(err);
            return;
        }

        exports.Admin = result[0];

        if (!exports.Admin) {
            throw 'Admin permission entry not found';
        }

        cb();
    });

};
