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
        },
        {
            methods: {},
            validations: {}
        }
    );

    exports.Permission = db.define('permission',
        {
            name: {type: 'text', required: true, size: 256, unique: true}
        },
        {
            methods: {},
            validations: {}
        }
    );

    exports.User.hasMany('permissions', exports.Permission, {}, {autoFetch: true});

    exports.Deck = db.define('deck',
        {
            name: {type: 'text', required: true, size: 256},
            description: {type: 'text', required: true},
            expansion: {type: 'boolean', required: true},
            index: {type: 'number', required: true}
        },
        {
            methods: {},
            validations: {}
        });

    exports.BlackCard = db.define('black_card',
        {
            text: {type: 'text', required: true, size: 1024},
            pick: {type: 'number', required: true}
        },
        {
            methods: {},
            validations: {}
        });
    exports.BlackCard.hasOne('deck', exports.Deck);

    exports.WhiteCard = db.define('white_card',
        {
            text: {type: 'text', required: true, size: 1024}
        },
        {
            methods: {},
            validations: {}
        });
    exports.WhiteCard.hasOne('deck', exports.Deck);
};
