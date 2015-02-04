var Decks = require('../../lib/decks');

function featuredDecks(req, res) {
    res.type('application/json');
    res.send(JSON.stringify(Decks.listFeatured()));
}

module.exports = function (app) {
    app.get('/ajax/data/decks/featured', featuredDecks);
};
