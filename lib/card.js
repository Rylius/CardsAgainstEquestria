var _ = require('underscore');

/**
 * Created a new card.
 * @param {string} id An unique identifier for this card. Uniqueness is not checked.
 * @param {(string[]|string)} text List of text pieces or an entire text string
 * @param {boolean} blackCard Whether this is a black card
 * @param {{source: string, createdAt: Date}} [options]
 * @constructor
 */
function Card(id, text, blackCard, options) {

    options = options || {};

    this.id = id;

    this.text = '';
    if (_.isArray(text)) {
        // TODO move blank string into config
        this.text = text.join('______');
    } else {
        this.text = text;
    }

    this.isBlackCard = blackCard;
    this.isWhiteCard = !blackCard;

    this.source = options.source ? options.source : 'unknown';

    this.createdAt = options.createdAt ? options.createdAt : new Date();

}

module.exports = Card;
