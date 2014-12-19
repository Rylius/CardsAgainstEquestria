var fs = require('fs');
var _ = require('underscore');

var decks = [];

var featuredDeckIds = [];

/**
 * Load all cached decks, overriding any already loaded ones.
 * @param callback {function(err, decks)} called after completing loading, err will be set if loading failed
 */
function loadAll(callback) {
    // TODO
}

/**
 * Load a single cached deck specified by its code, overriding it if it has been loaded already.
 * @param code {string} the code of the deck
 * @param callback {function(err, deck)} called after completing loading, err will be set if loading failed
 */
function load(code, callback) {
    // TODO
}

/**
 * Remove all loaded decks, effectively rendering a lobby unusable until decks are loaded again.
 * Running games are not affected.
 * Does not remove any decks from the file system cache.
 *
 * <b>Breaks all currently opened lobbies.</b>
 */
function removeAll() {
    // TODO
}

/**
 * Removes a single loaded deck, breaking all currently opened lobbies. Running games are not affected.
 * Does not remove the deck from the file system cache.
 *
 * Does not do anything if no deck with the given code is loaded.
 *
 * <b>Breaks all currently opened lobbies.</b>
 * @param code {string} the code of the deck to remove from memory
 */
function remove(code) {
    // TODO
}

/**
 * Check if the deck with the given code is in the cache.
 * A cached deck may not have been loaded yet.
 * @param code {string} the code of the deck
 * @returns {boolean} whether the deck is cached
 */
function isCached(code) {
    // TODO check fs
}

/**
 * Check if the deck with the given code is loaded into memory.
 * @param code {string} the code of the deck
 * @returns {boolean} whether the deck is loaded
 */
function isLoaded(code) {
    return _.find(decks, function (deck) {
            return deck.code == code;
        }) !== undefined;
}

/**
 * List all decks in memory.
 * @returns {Array} list of decks
 */
function listLoaded() {
    // TODO
    return [];
}

/**
 * List all decks in the file system cache.
 * @returns {Array} list of decks
 */
function listCached() {
    // TODO
    return [];
}

/**
 * Lists all decks in the file system cache, but not in memory.
 * @returns {Array} list of decks
 */
function listNotLoaded() {
    // TODO
    return [];
}

/**
 * Returns all featured and loaded decks.
 * @returns {Array} list of decks
 */
function listFeatured() {
    // TODO
    return [];
}

/**
 * Downloads a deck and adds it to the file system cache.
 * The deck has to be loaded separately afterwards.
 * @param code {string} the code of the deck to download
 * @param callback {function(err)} called after completing the download, err will be set if there was an error
 * @see load
 */
function cache(code, callback) {
    // TODO
}

module.exports = {
    loadAll: loadAll,
    load: load,
    removeAll: removeAll,
    remove: remove,
    isCached: isCached,
    isLoaded: isLoaded,
    listLoaded: listLoaded,
    listCached: listCached,
    listNotLoaded: listNotLoaded,
    listFeatured: listFeatured,
    cache: cache
};
