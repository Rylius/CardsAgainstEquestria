var sql = require('sql');


/**
 * SQL definition for public.black_card
 */
exports.BlackCard = sql.define({
    name: 'black_card',
    columns: [
        { name: 'id' },
        { name: 'deck_id' },
        { name: 'text' },
        { name: 'pick' },
        { name: 'draw' }
    ]
});


/**
 * SQL definition for public.deck
 */
exports.Deck = sql.define({
    name: 'deck',
    columns: [
        { name: 'id' },
        { name: 'name' },
        { name: 'description' },
        { name: 'expansion' },
        { name: 'index' },
        { name: 'hidden' }
    ]
});


/**
 * SQL definition for public.deck_permissions
 */
exports.DeckPermissions = sql.define({
    name: 'deck_permissions',
    columns: [
        { name: 'permission_id' },
        { name: 'deck_id' }
    ]
});


/**
 * SQL definition for public.permission
 */
exports.Permission = sql.define({
    name: 'permission',
    columns: [
        { name: 'id' },
        { name: 'name' }
    ]
});


/**
 * SQL definition for public.site_permissions
 */
exports.SitePermissions = sql.define({
    name: 'site_permissions',
    columns: [
        { name: 'permission_id' },
        { name: 'site_permission' }
    ]
});


/**
 * SQL definition for public.user
 */
exports.User = sql.define({
    name: 'user',
    columns: [
        { name: 'id' },
        { name: 'name' },
        { name: 'email' },
        { name: 'password' },
        { name: 'password_salt' },
        { name: 'allow_emails' },
        { name: 'date_registered' },
        { name: 'last_login' }
    ]
});


/**
 * SQL definition for public.user_permissions
 */
exports.UserPermissions = sql.define({
    name: 'user_permissions',
    columns: [
        { name: 'user_id' },
        { name: 'permission_id' }
    ]
});


/**
 * SQL definition for public.white_card
 */
exports.WhiteCard = sql.define({
    name: 'white_card',
    columns: [
        { name: 'id' },
        { name: 'deck_id' },
        { name: 'text' }
    ]
});
