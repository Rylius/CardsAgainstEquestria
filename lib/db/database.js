var anyDB = require('any-db');

function connect(config) {
    connect.pool = anyDB.createPool(config.url, config.pool);
}

connect.pool = null;

module.exports = connect;
