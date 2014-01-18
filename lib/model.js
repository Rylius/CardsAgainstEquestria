var orm = require('orm');

module.exports = function (db, models) {

    models.User = db.define('user',
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

    models.Deck = db.define('deck',
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

    models.BlackCard = db.define('black_card',
        {
            text: {type: 'text', required: true, size: 1024},
            pick: {type: 'number', required: true}
        },
        {
            methods: {},
            validations: {}
        });
    models.BlackCard.hasOne('deck', models.Deck);

    models.WhiteCard = db.define('white_card',
        {
            text: {type: 'text', required: true, size: 1024}
        },
        {
            methods: {},
            validations: {}
        });
    models.WhiteCard.hasOne('deck', models.Deck);
};
