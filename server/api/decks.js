const passport = require('passport');

const ConfigService = require('../services/ConfigService');
const DeckService = require('../services/DeckService.js');
const { wrapAsync } = require('../util.js');
const logger = require('../log.js');
const ServiceFactory = require('../services/ServiceFactory');
const configService = new ConfigService();
const cardService = ServiceFactory.cardService(configService);

const deckService = new DeckService(configService);

module.exports.init = function (server) {
    server.get(
        '/api/standalone-decks',
        wrapAsync(async function (req, res) {
            let decks;

            try {
                decks = await deckService.getStandaloneDecks();
            } catch (err) {
                logger.error('Failed to get standalone decks', err);

                throw new Error('Failed to get standalone decks');
            }

            res.send({ success: true, decks: decks });
        })
    );

    server.get(
        '/api/decks/:id',
        passport.authenticate('jwt', { session: false }),
        wrapAsync(async function (req, res) {
            if (!req.params.id || req.params.id === '') {
                return res.status(404).send({ message: 'No such deck' });
            }

            let deck = await deckService.getById(req.params.id);

            if (!deck) {
                return res.status(404).send({ message: 'No such deck' });
            }

            if (deck.username !== req.user.username) {
                return res.status(401).send({ message: 'Unauthorized' });
            }

            res.send({ success: true, deck: deck });
        })
    );

    server.get(
        '/api/decks',
        passport.authenticate('jwt', { session: false }),
        wrapAsync(async function (req, res) {
            let numDecks = await deckService.getNumDecksForUser(req.user, req.query);
            let decks = [];

            if (numDecks > 0) {
                decks = (await deckService.findForUser(req.user, req.query)).map((deck) => {
                    let deckUsageLevel = 0;
                    if (
                        deck.usageCount >
                        configService.getValueForSection('lobby', 'lowerDeckThreshold')
                    ) {
                        deckUsageLevel = 1;
                    }

                    if (
                        deck.usageCount >
                        configService.getValueForSection('lobby', 'middleDeckThreshold')
                    ) {
                        deckUsageLevel = 2;
                    }

                    if (
                        deck.usageCount >
                        configService.getValueForSection('lobby', 'upperDeckThreshold')
                    ) {
                        deckUsageLevel = 3;
                    }

                    deck.usageLevel = deckUsageLevel;
                    deck.usageCount = undefined;

                    return deck;
                });
            }

            res.send({ success: true, numDecks: numDecks, decks: decks });
        })
    );
    server.get(
        '/api/decks/podData/:id',
        passport.authenticate('jwt', { session: false }),
        wrapAsync(async function (req, res) {
            if (!req.params.id || req.params.id === '') {
                return res.status(404).send({ message: 'No such deck' });
            }

            let deck = await deckService.getDeckDataAndSave(req.params.id);

            if (!deck) {
                return res.status(404).send({ message: 'No such deck' });
            }

            const deckResponse = {
                id: deck.data.id,
                name: deck.data.name,
                houses: deck._linked.houses.map((house) => house.id.toLowerCase().replace(' ', '')) // TODO: util
            };

            res.send({ success: true, deck: deckResponse });
        })
    );

    // req shape { "pods": { "1234-abcd": { houses: ["brobnar", "dis"] }, "432abcd": { houses: ["logos"] } } }
    server.post(
        '/api/decks',
        passport.authenticate('jwt', { session: false }),
        wrapAsync(async function (req, res) {
            if (!req.body.pods || !Object.keys(req.body.pods).length) {
                return res.send({ success: false, message: 'invalid request' });
            }

            // TODO: more pods validation
            const deckPods = Object.assign({}, req.body.pods);
            const decksData = await Promise.all(
                Object.keys(req.body.pods).map((deckId) => deckService.getDeckDataAndSave(deckId))
            );
            decksData.forEach((deckData) => {
                deckPods[deckData['data']['id']]['data'] = deckData;
            });

            let savedDeck;

            try {
                savedDeck = await deckService.create(req.user, deckPods);
            } catch (error) {
                return res.send({
                    success: false,
                    message: error.message
                });
            }

            if (!savedDeck) {
                return res.send({
                    success: false,
                    message:
                        'An error occurred importing your deck.  Please check the Url or try again later.'
                });
            }

            res.send({ success: true, deck: savedDeck });
        })
    );

    server.delete(
        '/api/decks/:id',
        passport.authenticate('jwt', { session: false }),
        wrapAsync(async function (req, res) {
            let id = req.params.id;

            let deck = await deckService.getById(id);

            if (!deck) {
                return res.status(404).send({ success: false, message: 'No such deck' });
            }

            if (deck.username !== req.user.username) {
                return res.status(401).send({ message: 'Unauthorized' });
            }

            await deckService.delete(id);
            res.send({ success: true, message: 'Deck deleted successfully', deckId: id });
        })
    );

    server.post(
        '/api/decks/:id/verify',
        passport.authenticate('jwt', { session: false }),
        wrapAsync(async function (req, res) {
            if (!req.user.permissions || !req.user.permissions.canVerifyDecks) {
                return res.status(403);
            }

            let id = req.params.id;

            let deck = await deckService.getById(id);

            if (!deck) {
                return res.status(404).send({ success: false, message: 'No such deck' });
            }

            deck.verified = true;
            deck.id = id;

            await deckService.update(deck);
            res.send({ success: true, message: 'Deck verified successfully', deckId: id });
        })
    );

    server.post(
        '/api/decks/:id/enhancements',
        passport.authenticate('jwt', { session: false }),
        wrapAsync(async function (req, res) {
            let id = req.params.id;

            let deck = await deckService.getById(id);
            if (!deck) {
                return res.status(404).send({ success: false, message: 'No such deck' });
            }

            if (deck.username !== req.user.username) {
                return res.status(401).send({ message: 'Unauthorized' });
            }

            const enhancementRegex = /Enhance (.+?)\./;
            let totalEnhancements = 0;
            let totalUsed = 0;
            const EnhancementLookup = {
                P: 'capture',
                D: 'damage',
                R: 'draw',
                A: 'amber',
                '\uf565': 'capture',
                '\uf361': 'damage',
                '\uf36e': 'draw',
                '\uf360': 'amber'
            };

            let cards = await cardService.getAllCards();

            let cardsWithEnhancements = deck.cards.filter((c) => c.enhancements).length;
            let enhancedCards = Object.values(req.body.enhancements).length;
            for (let deckCard of deck.cards.filter(
                (c) => cards[c.id] && cards[c.id].text && cards[c.id].text.includes('Enhance')
            )) {
                let matches = cards[deckCard.id].text.match(enhancementRegex);
                if (!matches || matches.length === 1) {
                    continue;
                }

                let enhancementString = matches[1];
                for (let char of enhancementString) {
                    let enhancement = EnhancementLookup[char];
                    if (enhancement) {
                        for (let i = 0; i < deckCard.count; i++) {
                            totalEnhancements++;
                        }
                    }
                }
            }

            for (const [id, enhancements] of Object.entries(req.body.enhancements)) {
                let card = deck.cards.find((c) => c.dbId == id);
                let newEnhancements = [];

                for (let [enhancement, count] of Object.entries(enhancements)) {
                    for (let i = 0; i < count; i++) {
                        newEnhancements.push(enhancement);
                        totalUsed++;
                    }
                }

                card.enhancements = newEnhancements;
            }

            if (totalUsed < totalEnhancements || enhancedCards < cardsWithEnhancements) {
                return res.send({ success: false, message: 'Enhancements incorrectly assigned' });
            }

            await deckService.update(deck);
            res.send({ success: true, message: 'Enhancements added successfully', deckId: id });
        })
    );
};
