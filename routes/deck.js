var log = require('logule').init(module);
var _ = require('underscore');

var users = require('../lib/users');
var cards = require('../lib/cards');

var model = require('../lib/model');

var suggest = function (req, res) {
    var user = users.get(req.session.user.id);
    if (!user.registered) {
        req.flash('error', 'You have to be registered to suggest cards.');
        res.redirect('/user/register');
        return;
    }

    var selectedDeck = null;
    if (req.query.deck !== undefined) {
        var deckId = parseInt(req.query.deck);
        var expansion = !!parseInt(req.query.expansion);
        var active = !!parseInt(req.query.active);

        console.log(deckId + ' ' + expansion + ' ' + active);

        if (active) {
            var deck = null;

            if (expansion) {
                deck = cards.expansions[deckId];
            } else {
                deck = cards.sets[deckId];
            }

            if (!deck) {
                req.flash('error', 'That deck does not exist');
                res.redirect('/deck/suggest');
                return;
            }

            res.render('deck/suggest_cards', {
                title: 'Suggest cards for ' + deck.name,
                deck: deck
            });
            return;
        } else {
            model.DeckSuggestion.get(deckId, function (err, deck) {
                if (err) {
                    log.debug('Failed to load deck ' + deckId + ': ' + err);
                    req.flash('error', 'That deck does not exist');
                    res.redirect('/deck/suggest');
                    return;
                }

                res.render('deck/suggest_cards', {
                    title: 'Suggest cards for ' + deck.name,
                    deck: deck
                });
            });
            return;
        }
    }

    var decks = {
        sets: cards.sets,
        expansions: cards.expansions
    };

    model.DeckSuggestion.find({}, 'id', function (err, suggestedDecks) {
        if (err) {
            log.warn('Failed to load deck suggestions: ' + err);
            var message = 'Internal error occured while retrieving list of suggested decks';
            if (res.locals.error) {
                res.locals.push(message);
            } else {
                res.locals.error = [message];
            }
            suggestedDecks = [];
        }

        var deckSuggestions = {
            sets: _.select(suggestedDecks, function (deck) {
                return deck.expansion
            }),
            expansions: _.select(suggestedDecks, function (deck) {
                return !deck.expansion
            })
        };

        res.render('deck/suggest',
            {
                title: 'Suggestions',
                decks: decks, suggestedDecks: deckSuggestions
            });
    });
};

module.exports = function (app) {
    app.get('/deck/suggest', suggest);
};
