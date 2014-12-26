var fs = require('fs');
var _ = require('underscore');
var _s = require('underscore.string');

var log = require('logule').init(module);

// TODO properly wrap config
var config = require('../config.json');

var Deck = require('./deck');

/**
 * Number of digits for a CardCast deck code.
 * @type {number}
 * @constant
 */
var CODE_LENGTH = 5;

var loadedDecks = [];

var featuredDeckCodes = [];

/**
 * Load all decks on the file system, overriding any already loaded.
 * @param {function(Error, Deck[])} callback Called after completing loading, err will be set if loading failed
 * @see load
 */
function loadAll(callback) {
    var decks = [];
    var codes = listCached();

    log.debug('Loading ' + codes.length + ' decks (' + codes.join(', ') + ')');

    var filesLeft = codes.length;

    _.each(codes, function (code) {
        load(code, function (err, deck) {
            if (err) {
                callback(err, null);
                return;
            }

            decks.push(deck);
            filesLeft--;

            if (filesLeft <= 0) {
                log.debug('Finished loading decks');
                callback(null, decks);
            }
        });
    });
}

/**
 * Load a single cached deck specified by its code from the file system, overriding it if it has been loaded already.
 * @param {string} code The code of the deck
 * @param {function(Error, Deck)} callback Called after completing loading, err will be set if loading failed
 * @see loadAll
 */
function load(code, callback) {
    var existing = find(code);

    log.debug('Loading deck ' + code + ' (exists: ' + !!existing + ')');
    fs.readFile(config.files.cache + '/' + code + '.json', 'utf8', function (err, data) {
        if (err) {
            log.warn('Failed to load deck ' + code + ': ' + err);
            callback(err, null);
            return;
        }

        var json = JSON.parse(data);

        if (existing) {
            existing.update(json);
            log.debug('Updated existing deck ' + code);
            callback(null, existing);
        } else {
            var deck = new Deck(json);
            loadedDecks.push(deck);
            log.debug('Loaded new deck ' + code);
            callback(null, deck);
        }
    });
}

/**
 * Remove all loaded decks from memory, effectively rendering a lobby unusable until decks are loaded again.
 * Running games are not affected.
 * Does not remove any decks from the file system cache.
 *
 * <b>Breaks all currently opened lobbies.</b>
 * @see evict
 */
function evictAll() {
    // TODO
}

/**
 * Removes a single loaded deck from memory, breaking all currently opened lobbies. Running games are not affected.
 * Does not remove the deck from the file system cache.
 *
 * Does not do anything if the deck is not loaded.
 *
 * <b>Breaks all currently opened lobbies.</b>
 * @param {Deck} deck The deck to remove from memory
 * @see evictAll
 * @see isLoaded
 */
function evict(deck) {
    log.debug('Evicting ' + deck.code + ' from memory cache');

    loadedDecks.splice(loadedDecks.indexOf(deck), 1);
}

/**
 * Check if the deck with the given code is in the file system cache.
 * A cached deck may not have been loaded yet.
 * @param {string} code The code of the deck
 * @returns {boolean} Whether the deck is cached
 * @see isLoaded
 * @see listCached
 */
function isCached(code) {
    // TODO check fs
}

/**
 * Check if the deck with the given code is loaded into memory.
 * A loaded deck may not exist in the file system cache.
 * @param {string} code The code of the deck
 * @returns {boolean} Whether the deck is loaded
 * @see isCached
 * @see listLoaded
 */
function isLoaded(code) {
    return find(code) !== undefined;
}

/**
 * List all decks in memory.
 * @returns {Deck[]} List of decks
 * @see isLoaded
 */
function listLoaded() {
    // TODO
    return [];
}

/**
 * List all decks in the file system cache.
 * @returns {string[]} List of deck codes
 * @see isCached
 */
function listCached() {
    var codes = [];

    _.each(fs.readdirSync(config.files.cache), function (file) {
        if (!_s.endsWith(file, '.json')) {
            return;
        }

        codes.push(file.substr(0, CODE_LENGTH));
    });

    return codes;
}

/**
 * List all decks in the file system cache, but not in memory.
 * @returns {string[]} List of deck codes
 */
function listNotLoaded() {
    // TODO
    return [];
}

/**
 * Return all featured and loaded decks.
 * @returns {Deck[]} list of decks
 */
function listFeatured() {
    // TODO
    return [];
}

/**
 * Return the deck for the given code if it is loaded, <code>null</code> otherwise.
 * @param {string} code The deck code to find
 * @returns {Deck} Deck or null
 */
function find(code) {
    return _.find(loadedDecks, function (deck) {
        return deck.code == code;
    });
}

/**
 * Download a deck and add it to the file system cache.
 * The deck has to be loaded separately afterwards.
 * @param code {string} the code of the deck to download
 * @param callback {function(Error)} called after completing the download, err will be set if there was an error
 * @see load
 */
function cache(code, callback) {
    // TODO
}

module.exports = {
    loadAll: loadAll,
    load: load,
    evictAll: evictAll,
    evict: evict,
    isCached: isCached,
    isLoaded: isLoaded,
    listLoaded: listLoaded,
    listCached: listCached,
    listNotLoaded: listNotLoaded,
    listFeatured: listFeatured,
    find: find,
    cache: cache,
    CODE_LENGTH: CODE_LENGTH
};
