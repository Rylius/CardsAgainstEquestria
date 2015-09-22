var _ = require('underscore');
var changesData = _.first(require('../changes.json'), 3);
var Settings = require('../lib/settings');

var Cards = require('../lib/cards');

var valentineDeckId = 0;
var valentineDeck = Cards.expansions[valentineDeckId];
var valentineBlackCards = _.filter(valentineDeck.blackCards, function (card, i) {
    return card.pick == 2 && i < 3;
});
var valentineDay = new Date(2015, 1, 14);

var index = function (req, res) {
    var cards = [];
    if (valentineDay <= new Date()) {
        _.times(3, function (i) {
            var blackCard = _.sample(valentineBlackCards).text;
            var whiteCardA = _.sample(valentineDeck.whiteCards).text;
            var whiteCardB = null;
            while (!whiteCardB || whiteCardB == whiteCardA) {
                whiteCardB = _.sample(valentineDeck.whiteCards).text;
            }

            var valentineText = blackCard.split('______');
            valentineText.splice(0, 0, '<span class="inserted">' + whiteCardA + '</span>');
            valentineText.splice(-1, 0, '<span class="inserted">' + whiteCardB + '</span>');

            cards.push(valentineText.join(''));
        });
    }

    res.render('index', {
        changes: changesData, motd: Settings.motd/*,
        valentine: {
            deckId: valentineDeckId,
            cards: cards
        }*/
    });
};

module.exports = function (app) {
    app.get('/', index);
};
