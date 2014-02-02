var fs = require('fs');
var _ = require('underscore');
var _s = require('underscore.string');

var blackCards = [];
var whiteCards = [];
var sets = [];
var expansions = [];

exports.loadSets = function (directory) {
    // TODO sort alphabetically
    _.each(fs.readdirSync(directory), function (file) {
        if (!_s.endsWith(file, '.json')) {
            return;
        }

        var data = require(directory + '/' + file);
        if (data.blackCards && data.blackCards.length > 0) {
            data.blackCardsRaw = data.blackCards;
        }
        if (data.whiteCards && data.whiteCards.length > 0) {
            data.whiteCardsRaw = data.whiteCards;
        }

        data.blackCards = [];
        data.whiteCards = [];

        if (data.expansion) {
            data.id = expansions.length;
            expansions.push(data);
        } else {
            data.id = sets.length;
            sets.push(data);
        }

        _.each(data.blackCardsRaw, function (card) {
            card.id = blackCards.length;
            card.set = data;
            card.watermark = data.watermark;
            card.toJSON = function () {
                return {id: card.id, text: card.text, watermark: card.watermark, draw: card.draw, pick: card.pick};
            };
            blackCards.push(card);
            data.blackCards.push(card);
        });

        _.each(data.whiteCardsRaw, function (text) {
            var card = {
                id: whiteCards.length,
                text: text,
                set: data,
                toJSON: function () {
                    return {id: card.id, text: card.text, watermark: data.watermark};
                }
            };
            whiteCards.push(card);
            data.whiteCards.push(card);
        });
    });

    updateJson();
};

var cardSets = [];
var cardExpansions = [];

var updateJson = function () {
    cardSets.length = 0;
    _.each(sets, function (cardSet) {
        cardSets.push({
            id: cardSet.id,
            name: cardSet.name,
            description: cardSet.description
                + ' <a href="/info/cards?set=' + cardSet.id + '#black">'
                + cardSet.blackCards.length + ' black cards</a>, '
                + '<a href="/info/cards?set=' + cardSet.id + '#white">'
                + cardSet.whiteCards.length + ' white cards.'
        });
    });

    cardExpansions.length = 0;
    _.each(expansions, function (cardSet) {
        cardExpansions.push({
            id: cardSet.id,
            name: cardSet.name,
            description: cardSet.description + ' '
                + ' <a href="/info/cards?expansion=' + cardSet.id + '#black">'
                + cardSet.blackCards.length + ' black cards, '
                + '<a href="/info/cards?expansion=' + cardSet.id + '#white">'
                + cardSet.whiteCards.length + ' white cards.'
        });
    });

    exports.setsJson = JSON.stringify({sets: cardSets, expansions: cardExpansions});
};

exports.blackCards = blackCards;
exports.whiteCards = whiteCards;
exports.sets = sets;
exports.expansions = expansions;

exports.setsJson = '{}';
