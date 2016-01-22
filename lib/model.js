var orm = require('orm');

module.exports.load = function (db) {
    exports.db = db;

    exports.User = db.define('user',
        {
            name: {type: 'text', required: true, size: 32, unique: true},
            email: {type: 'text', required: true, size: 256},
            password: {type: 'text', required: true, size: 512},
            password_salt: {type: 'text', required: true, size: 512},
            allow_emails: {type: 'boolean', required: true},
            date_registered: Date,
            last_login: Date
        }
    );

    exports.Permission = db.define('permission',
        {
            name: {type: 'text', required: true, size: 256, unique: true}
        }
    );

    exports.User.hasMany('permissions', exports.Permission);

};
