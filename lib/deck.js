var _ = require('underscore');

var Card = require('./card');

/**
 * Represents a CardCast deck.
 * @param {{}} json Valid CardCast JSON to construct this object from
 * @constructor
 */
function Deck(json) {

    this.update(json);

    this.cacheUpdatedAt = json.cache_updated_at;

}

/**
 * Updates this deck with the given JSON data.
 * Every value is overwritten.
 * @param {{}} json Valid CardCast JSON
 */
Deck.prototype.update = function (json) {

    var self = this;

    this.name = json.name;
    this.code = json.code;

    this.description = json.description;
    this.category = json.category;
    this.rating = json.rating;
    this.unlisted = json.unlisted;

    this.expansion = !!json.expansion;
    this.recommendedDecks = json.recommendedDecks || [];

    this.createdAt = json.created_at;
    this.updatedAt = json.updated_at;

    this.externalCopyright = json.external_copyright;
    this.copyrightHolderUrl = json.copyright_holder_url;

    this.authorId = json.author.id;
    this.authorUsername = json.author.username;

    this.blackCards = [];
    this.whiteCards = [];

    _.each(json.black_cards, function (blackCard) {
        self.blackCards.push(
            new Card(blackCard.id, blackCard.text, true, {
                source: 'cardcast',
                createdAt: blackCard.created_at
            })
        );
    });

    _.each(json.white_cards, function (whiteCard) {
        self.whiteCards.push(
            new Card(whiteCard.id, whiteCard.text, false, {
                source: 'cardcast',
                createdAt: whiteCard.created_at
            })
        );
    });

    this.cacheUpdatedAt = json.cache_updated_at;

};

/**
 * @returns {Number} the number of black cards in this deck
 */
Deck.prototype.numBlackCards = function () {
    return this.blackCards.length;
};

/**
 * @returns {Number} the number of white cards in this deck
 */
Deck.prototype.numWhiteCards = function () {
    return this.whiteCards.length;
};

Deck.prototype.toJSON = function () {
    return {
        name: this.name,
        code: this.code,
        description: this.description,
        category: this.category,
        rating: this.rating,
        unlisted: this.unlisted,
        createdAt: this.createdAt,
        updatedAt: this.updatedAt,
        cacheUpdatedAt: this.cacheUpdatedAt,
        externalCopyright: this.externalCopyright,
        copyrightHolderUrl: this.copyrightHolderUrl,
        authorId: this.authorId,
        authorUsername: this.authorUsername,
        numBlackCards: this.numBlackCards(),
        numWhiteCards: this.numWhiteCards()
    };
};

module.exports = Deck;
