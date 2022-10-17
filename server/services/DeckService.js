const logger = require('../log');
const util = require('../util');
const db = require('../db');
const { expand, flatten } = require('../Array');
const uuidGen = require('uuid');

class DeckService {
    constructor(configService) {
        this.configService = configService;
        this.houseCache = {};
    }

    // pods shape { "1234-abcd": { houses: ["brobnar", "dis"] }, "432abcd": { houses: ["logos"] } }
    podsHousesValid(pods) {
        const validationResult = (valid, message) => ({ valid, message });
        const allHouses = [];
        Object.values(pods).forEach((pod) => {
            if (!pod.houses) return validationResult(false, 'Invalid request');
            if (pod.houses.length === 0) return validationResult(false, 'Invalid request');
            allHouses.push(...pod.houses);
        });
        if (allHouses.length !== 3) return validationResult(false, 'Invalid request');
        if (new Set(allHouses).size !== allHouses.length)
            return validationResult(false, 'Duplicate houses between pods.');
        return validationResult(true, '');
    }

    async getHouseIdFromName(house) {
        if (this.houseCache[house]) {
            return this.houseCache[house];
        }

        let houses;
        try {
            houses = await db.query('SELECT "Id", "Code" FROM "Houses"', []);
        } catch (err) {
            logger.error('Failed to retrieve houses', err);

            return undefined;
        }

        if (!houses || houses.length == 0) {
            logger.error('Could not find any houses');

            return undefined;
        }

        for (let house of houses) {
            this.houseCache[house.Code] = house.Id;
        }

        return this.houseCache[house];
    }

    async getById(id) {
        let deck;

        try {
            deck = await db.query(
                'SELECT d.*, u."Username", e."ExpansionId" as "Expansion", (SELECT COUNT(*) FROM "Decks" WHERE "Name" = d."Name") AS DeckCount, ' +
                    '(SELECT COUNT(*) FROM "Games" g JOIN "GamePlayers" gp ON gp."GameId" = g."Id" WHERE g."WinnerId" = $1 AND gp."DeckId" = d."Id") AS "WinCount", ' +
                    '(SELECT COUNT(*) FROM "Games" g JOIN "GamePlayers" gp ON gp."GameId" = g."Id" WHERE g."WinnerId" != $1 AND g."WinnerId" IS NOT NULL AND gp."PlayerId" = $1 AND gp."DeckId" = d."Id") AS "LoseCount" ' +
                    'FROM "Decks" d ' +
                    'JOIN "Users" u ON u."Id" = "UserId" ' +
                    'JOIN "Expansions" e on e."Id" = d."ExpansionId" ' +
                    'WHERE d."Id" = $1 ',
                [id]
            );
        } catch (err) {
            logger.error(`Failed to retrieve deck: ${id}`, err);

            throw new Error('Unable to fetch deck: ' + id);
        }

        if (!deck || deck.length === 0) {
            logger.warn(`Failed to retrieve deck: ${id} as it was not found`);

            return undefined;
        }

        let retDeck = this.mapDeck(deck[0]);

        await this.getDeckCardsAndHouses(retDeck);

        return retDeck;
    }

    // deckPods shape { "1234-abcd": { houses: ["brobnar", "dis"], data: {...} }, "432abcd": { houses: ["logos"], data: {...} } }
    async deckExistsForUser(user, deckPods) {
        let podsByDeck;
        try {
            podsByDeck = await db.query(
                'SELECT ARRAY_AGG(sd."Uuid" || \' \' || h."Code") "Pods" FROM "Decks" AS d ' +
                    'INNER JOIN "SourcePods" AS sp ON d."Id" = sp."DeckId" ' +
                    'INNER JOIN "SourceDecks" AS sd ON sp."SourceDeckId" = sd."Id" ' +
                    'INNER JOIN "Houses" AS h ON sp."HouseId" = h."Id" ' +
                    'WHERE d."UserId" = $1 ' +
                    'GROUP BY "DeckId"',
                [user.id]
            );
        } catch (err) {
            logger.error(`Failed to check deck pods existence.`, err);

            return false;
        }

        if (!podsByDeck) return false;
        for (const deck of podsByDeck) {
            let samePodComposition = true;
            Object.keys(deckPods).forEach((sourceDeckId) => {
                deckPods[sourceDeckId].houses.forEach((house) => {
                    if (!deck.Pods.includes(`${sourceDeckId} ${house}`)) {
                        samePodComposition = false;
                    }
                });
            });
            if (samePodComposition) return true;
        }
        return false;
    }

    async getStandaloneDeckById(standaloneId) {
        let deck;

        try {
            deck = await db.query(
                'SELECT d.*, e."ExpansionId" as "Expansion" ' +
                    'FROM "StandaloneDecks" d ' +
                    'JOIN "Expansions" e on e."Id" = d."ExpansionId" ' +
                    'WHERE d."Id" = $1 ',
                [standaloneId]
            );
        } catch (err) {
            logger.error(`Failed to retrieve deck: ${standaloneId}`, err);

            throw new Error('Unable to fetch deck: ' + standaloneId);
        }

        if (!deck || deck.length === 0) {
            logger.warn(`Failed to retrieve deck: ${standaloneId} as it was not found`);

            return undefined;
        }

        let retDeck = this.mapDeck(deck[0]);

        await this.getDeckCardsAndHouses(retDeck, true);

        return retDeck;
    }

    async getStandaloneDecks() {
        let decks;

        try {
            decks = await db.query(
                'SELECT d.*, e."ExpansionId" as "Expansion" ' +
                    'FROM "StandaloneDecks" d ' +
                    'JOIN "Expansions" e on e."Id" = d."ExpansionId"'
            );
        } catch (err) {
            logger.error('Failed to retrieve standalone decks', err);

            throw new Error('Unable to fetch standalone decks');
        }

        if (!decks || decks.length === 0) {
            logger.warn('Failed to retrieve standalone decks, none found');

            return undefined;
        }

        let retDecks = [];
        for (const deck of decks) {
            let retDeck = this.mapDeck(deck);

            retDeck.verified = true;

            await this.getDeckCardsAndHouses(retDeck, true);

            retDecks.push(retDeck);
        }

        return retDecks;
    }

    async createStandalone(deck) {
        return this.insertDeck(deck);
    }

    async getSealedDeck(expansions) {
        let dbExpansions = [];

        if (expansions.aoa) {
            dbExpansions.push(435);
        }

        if (expansions.cota) {
            dbExpansions.push(341);
        }

        if (expansions.wc) {
            dbExpansions.push(452);
        }

        if (expansions.mm) {
            dbExpansions.push(479);
        }

        if (expansions.dt) {
            dbExpansions.push(496);
        }

        let deck;
        let expansionStr = dbExpansions.join(',');
        try {
            deck = await db.query(
                `SELECT d.*, e."ExpansionId" AS "Expansion" from "Decks" d JOIN "Expansions" e on e."Id" = d."ExpansionId" WHERE d."ExpansionId" IN (SELECT "Id" FROM "Expansions" WHERE "ExpansionId" IN(${expansionStr})) AND "IncludeInSealed" = True ORDER BY random() LIMIT 1`
            );
        } catch (err) {
            logger.error('Failed to fetch random deck', err);
            throw new Error('Failed to fetch random deck');
        }

        if (!deck || deck.length === 0) {
            logger.warn('Could not find any sealed decks!');
            return undefined;
        }

        let retDeck = this.mapDeck(deck[0]);

        await this.getDeckCardsAndHouses(retDeck);

        return retDeck;
    }

    async getNumDecksForUser(user, options) {
        let ret;
        let params = [user.id];
        let index = 2;
        const filter = this.processFilter(index, params, options.filter);

        try {
            ret = await db.query(
                'SELECT COUNT(*) AS "NumDecks" FROM "Decks" d JOIN "Expansions" e ON e."Id" = d."ExpansionId" WHERE "UserId" = $1 ' +
                    filter,
                params
            );
        } catch (err) {
            logger.error('Failed to count users decks');

            throw new Error('Failed to count decks');
        }

        return ret && ret.length > 0 ? ret[0].NumDecks : 0;
    }

    mapColumn(column, isSort = false) {
        switch (column) {
            case 'lastUpdated':
                return '"LastUpdated"';
            case 'name':
                return isSort ? 'lower("Name")' : 'lower(d."Name")';
            case 'expansion':
                return isSort ? '"Expansion"' : 'e."ExpansionId"';
            case 'winRate':
                return '"WinRate"';
            default:
                return '"LastUpdated"';
        }
    }

    processFilter(index, params, filterOptions) {
        let filter = '';

        for (let filterObject of filterOptions || []) {
            if (filterObject.name === 'expansion') {
                filter += `AND ${this.mapColumn(filterObject.name)} IN ${expand(
                    1,
                    filterObject.value.length,
                    index
                )} `;
                params.push(...filterObject.value.map((v) => v.value));
            } else {
                filter += `AND ${this.mapColumn(filterObject.name)} LIKE $${index++} `;
                params.push(`%${filterObject.value}%`);
            }
        }

        return filter;
    }

    async findForUser(
        user,
        options = { page: 1, pageSize: 10, sort: 'lastUpdated', sortDir: 'desc', filter: [] }
    ) {
        let retDecks = [];
        let decks;
        let pageSize = options.pageSize;
        let page = options.page;
        let sortColumn = this.mapColumn(options.sort, true);
        let sortDir = options.sortDir === 'desc' ? 'DESC' : 'ASC';
        let params = [user.id, pageSize, (page - 1) * pageSize];

        let index = 4;
        const filter = this.processFilter(index, params, options.filter);

        try {
            decks = await db.query(
                'SELECT *, CASE WHEN "WinCount" + "LoseCount" = 0 THEN 0 ELSE (CAST("WinCount" AS FLOAT) / ("WinCount" + "LoseCount")) * 100 END AS "WinRate" FROM ( ' +
                    'SELECT d.*, u."Username", e."ExpansionId" as "Expansion", (SELECT COUNT(*) FROM "Decks" WHERE "Name" = d."Name") AS DeckCount, ' +
                    '(SELECT COUNT(*) FROM "Games" g JOIN "GamePlayers" gp ON gp."GameId" = g."Id" WHERE g."WinnerId" = $1 AND gp."DeckId" = d."Id") AS "WinCount", ' +
                    '(SELECT COUNT(*) FROM "Games" g JOIN "GamePlayers" gp ON gp."GameId" = g."Id" WHERE g."WinnerId" != $1 AND g."WinnerId" IS NOT NULL AND gp."PlayerId" = $1 AND gp."DeckId" = d."Id") AS "LoseCount" ' +
                    'FROM "Decks" d ' +
                    'JOIN "Users" u ON u."Id" = "UserId" ' +
                    'JOIN "Expansions" e on e."Id" = d."ExpansionId" ' +
                    'WHERE "UserId" = $1 ' +
                    filter +
                    ') sq ' +
                    `ORDER BY ${sortColumn} ${sortDir} ` +
                    'LIMIT $2 ' +
                    'OFFSET $3',
                params
            );
        } catch (err) {
            logger.error('Failed to retrieve decks', err);
        }

        for (let deck of decks) {
            let retDeck = this.mapDeck(deck);

            await this.getDeckCardsAndHouses(retDeck);

            retDecks.push(retDeck);
        }

        return retDecks;
    }

    async getDeckCardsAndHouses(deck, standalone = false) {
        let cardTableQuery;

        if (standalone) {
            cardTableQuery = 'SELECT * FROM "StandaloneDeckCards" WHERE "DeckId" = $1';
        } else {
            cardTableQuery =
                'SELECT dc.*, h."Code" as "House" FROM "DeckCards" dc LEFT JOIN "Houses" h ON h."Id" = dc."HouseId" WHERE "DeckId" = $1';
        }

        let cards = await db.query(cardTableQuery, [deck.id]);

        deck.cards = cards.map((card) => ({
            dbId: card.Id,
            id: card.CardId,
            count: card.Count,
            maverick: card.Maverick || undefined,
            anomaly: card.Anomaly || undefined,
            image: card.ImageUrl || undefined,
            house: card.House || undefined,
            enhancements: card.Enhancements
                ? card.Enhancements.replace(/[[{}"\]]/gi, '')
                      .split(',')
                      .filter((c) => c.length > 0)
                      .sort()
                : undefined
        }));

        let houseTable = standalone ? 'StandaloneDeckHouses' : 'DeckHouses';
        let houses = await db.query(
            `SELECT * FROM "${houseTable}" dh JOIN "Houses" h ON h."Id" = dh."HouseId" WHERE "DeckId" = $1`,
            [deck.id]
        );
        deck.houses = houses.map((house) => house.Code);

        deck.isStandalone = standalone;
    }

    // deckPods shape { "1234-abcd": { houses: ["brobnar", "dis"], data: {...} }, "432abcd": { houses: ["logos"], data: {...} } }
    async create(user, deckPods) {
        const expansions = Object.values(deckPods).map(
            (deckData) => deckData['data']['data']['expansion']
        );
        if (new Set(expansions).size !== 1) {
            throw new Error('Multiple sets not allowed.');
        }

        let newDeck = this.parseDeckResponse(user.username, deckPods, expansions[0]);

        let validExpansion = await this.checkValidDeckExpansion(newDeck);
        if (!validExpansion) {
            throw new Error('This deck is from a future expansion and not currently supported');
        }

        let deckExists = await this.deckExistsForUser(user, deckPods);
        if (deckExists) {
            throw new Error('Deck already exists.');
        }

        let response = await this.insertDeck(newDeck, deckPods, user);

        return this.getById(response.id);
    }

    async checkValidDeckExpansion(deck) {
        let ret;
        try {
            ret = await db.query('SELECT 1 FROM "Expansions" WHERE "ExpansionId" = $1', [
                deck.expansion
            ]);
        } catch (err) {
            logger.error('Failed to check expansion', err);

            return false;
        }

        return ret && ret.length > 0;
    }

    async insertDeck(deck, deckPods, user) {
        let ret;

        try {
            await db.query('BEGIN');

            if (user) {
                ret = await db.query(
                    'INSERT INTO "Decks" ("UserId", "Uuid", "Identity", "Name", "IncludeInSealed", "LastUpdated", "Verified", "ExpansionId", "Flagged", "Banned") ' +
                        'VALUES ($1, $2, $3, $4, $5, $6, false, (SELECT "Id" FROM "Expansions" WHERE "ExpansionId" = $7), false, false) RETURNING "Id"',
                    [
                        user.id,
                        deck.uuid,
                        deck.identity,
                        deck.name,
                        false,
                        deck.lastUpdated,
                        deck.expansion
                    ]
                );
            } else {
                ret = await db.query(
                    'INSERT INTO "StandaloneDecks" ("Identity", "Name", "LastUpdated", "ExpansionId") ' +
                        'VALUES ($1, $2, $3, (SELECT "Id" FROM "Expansions" WHERE "ExpansionId" = $4)) RETURNING "Id"',
                    [deck.identity, deck.name, deck.lastUpdated || new Date(), deck.expansion]
                );
            }
        } catch (err) {
            logger.error('Failed to add deck', err);

            await db.query('ROLLBACK');

            throw new Error('Failed to import deck');
        }

        deck.id = ret[0].Id;

        let params = [];
        for (let card of deck.cards) {
            params.push(card.id);
            params.push(card.count);
            params.push(card.maverick);
            params.push(card.anomaly);
            if (user) {
                params.push(card.image);
                params.push(await this.getHouseIdFromName(card.house));
                params.push(card.enhancements ? JSON.stringify(card.enhancements) : undefined);
            }

            params.push(deck.id);
            if (!user) {
                params.push(card.enhancements);
            }
        }

        try {
            if (user) {
                await db.query(
                    `INSERT INTO "DeckCards" ("CardId", "Count", "Maverick", "Anomaly", "ImageUrl", "HouseId", "Enhancements", "DeckId") VALUES ${expand(
                        deck.cards.length,
                        8
                    )}`,
                    params
                );
            } else {
                await db.query(
                    `INSERT INTO "StandaloneDeckCards" ("CardId", "Count", "Maverick", "Anomaly", "DeckId", "Enhancements") VALUES ${expand(
                        deck.cards.length,
                        6
                    )}`,
                    params
                );
            }
        } catch (err) {
            logger.error('Failed to add deck', err);

            await db.query('ROLLBACK');

            throw new Error('Failed to import deck');
        }

        let deckHouseTable = user ? '"DeckHouses"' : '"StandaloneDeckHouses"';
        try {
            await db.query(
                `INSERT INTO ${deckHouseTable} ("DeckId", "HouseId") VALUES ($1, (SELECT "Id" FROM "Houses" WHERE "Code" = $2)), ` +
                    '($1, (SELECT "Id" FROM "Houses" WHERE "Code" = $3)), ($1, (SELECT "Id" FROM "Houses" WHERE "Code" = $4))',
                flatten([deck.id, deck.houses])
            );

            await db.query('COMMIT');
        } catch (err) {
            logger.error('Failed to add deck', err);

            await db.query('ROLLBACK');

            throw new Error('Failed to import deck');
        }

        const deckHousePairs = [];
        Object.keys(deckPods).forEach((deckId) =>
            deckPods[deckId].houses.forEach((house) => deckHousePairs.push([deckId, house]))
        );
        try {
            await db.query(
                'INSERT INTO "SourcePods" ("DeckId", "HouseId", "SourceDeckId") VALUES ' +
                    '($1, (SELECT "Id" FROM "Houses" WHERE "Code" = $3), (SELECT "Id" FROM "SourceDecks" WHERE "Uuid" = $2)),' +
                    '($1, (SELECT "Id" FROM "Houses" WHERE "Code" = $5), (SELECT "Id" FROM "SourceDecks" WHERE "Uuid" = $4)),' +
                    '($1, (SELECT "Id" FROM "Houses" WHERE "Code" = $7), (SELECT "Id" FROM "SourceDecks" WHERE "Uuid" = $6))',
                flatten([deck.id, deckHousePairs])
            );
        } catch (err) {
            logger.error('Failed to add deck', err);

            await db.query('ROLLBACK');

            throw new Error('Failed to import deck');
        }

        return deck;
    }

    async update(deck) {
        if (deck.verified) {
            try {
                await db.query(
                    'UPDATE "Decks" SET "Verified" = true, "LastUpdated" = $2 WHERE "Id" = $1',
                    [deck.id, new Date()]
                );
            } catch (err) {
                logger.error('Failed to update deck', err);

                throw new Error('Failed to update deck');
            }
        }

        for (let card of deck.cards) {
            if (card.enhancements) {
                try {
                    await db.query('UPDATE "DeckCards" SET "Enhancements" = $2 WHERE "Id" = $1', [
                        card.dbId,
                        card.enhancements
                    ]);
                } catch (err) {
                    logger.error('Failed to update deck enhancements', err);

                    throw new Error('Failed to update deck');
                }
            }
        }
    }

    async delete(id) {
        try {
            await db.query('DELETE FROM "Decks" WHERE "Id" = $1', [id]);
        } catch (err) {
            logger.error('Failed to delete deck', err);

            throw new Error('Failed to delete deck');
        }
    }

    async getFlaggedUnverifiedDecksForUser(user) {
        let retDecks = [];
        let decks;

        try {
            decks = await db.query(
                'SELECT d.*, u."Username", e."ExpansionId" as "Expansion", (SELECT COUNT(*) FROM "Decks" WHERE "Name" = d."Name") AS "DeckCount", ' +
                    '(SELECT COUNT(*) FROM "Games" g JOIN "GamePlayers" gp ON gp."GameId" = g."Id" WHERE g."WinnerId" = $1 AND gp."DeckId" = d."Id") AS "WinCount", ' +
                    '(SELECT COUNT(*) FROM "Games" g JOIN "GamePlayers" gp ON gp."GameId" = g."Id" WHERE g."WinnerId" != $1 AND g."WinnerId" IS NOT NULL AND gp."PlayerId" = $1 AND gp."DeckId" = d."Id") AS "LoseCount" ' +
                    'FROM "Decks" d ' +
                    'JOIN "Users" u ON u."Id" = "UserId" ' +
                    'JOIN "Expansions" e on e."Id" = d."ExpansionId" ' +
                    'WHERE u."Id" = $1 AND d."Verified" = False AND (SELECT COUNT(*) FROM "Decks" WHERE "Name" = d."Name") > $2',
                [user.id, this.configService.getValueForSection('lobby', 'lowerDeckThreshold')]
            );
        } catch (err) {
            logger.error(`Failed to retrieve unverified decks: ${user.id}`, err);

            throw new Error(`Unable to fetch unverified decks: ${user.id}`);
        }

        for (let deck of decks) {
            let retDeck = this.mapDeck(deck);

            await this.getDeckCardsAndHouses(deck);

            retDecks.push(retDeck);
        }

        return retDecks;
    }

    async verifyDecksForUser(user) {
        try {
            await db.query(
                'UPDATE "Decks" SET "Verified" = True WHERE "UserId" = $1 AND "Verified" = False',
                [user.id]
            );
        } catch (err) {
            logger.error(`Failed to verify decks: ${user.id}`, err);

            throw new Error(`Unable to unverify decks: ${user.id}`);
        }
    }

    countEnhancements(list, deckCards) {
        const cards = list.map((c) => deckCards.find((x) => x.id === c)).filter(Boolean);
        const enhancementRegex = /Enhance (.+?)\./;
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

        let enhancements = {};

        for (let card of cards.filter((c) => c.card_text.includes('Enhance'))) {
            let matches = card.card_text.match(enhancementRegex);
            if (!matches || matches.length === 1) {
                continue;
            }

            let enhancementString = matches[1];
            for (let char of enhancementString) {
                let enhancement = EnhancementLookup[char];
                if (enhancement) {
                    enhancements[enhancement] = enhancements[enhancement]
                        ? enhancements[enhancement] + 1
                        : 1;
                }
            }
        }

        return enhancements;
    }

    assignEnhancements(cards, enhancements) {
        let totalEnhancements = Object.keys(enhancements).reduce((a, b) => a + enhancements[b], 0);
        let totalEnhancedCards = cards.filter((x) => x.enhancements).length;
        let types = Object.keys(enhancements);

        if (totalEnhancements === totalEnhancedCards && types.length === 1) {
            for (const [index, card] of cards.entries()) {
                if (card.enhancements) cards[index] = { ...card, enhancements: types };
            }
        } else if (totalEnhancedCards === 1) {
            let pips = [];
            for (const type in enhancements) {
                for (let i = 0; i < enhancements[type]; i++) {
                    pips.push(type);
                }
            }
            for (const [index, card] of cards.entries()) {
                if (card.enhancements) cards[index] = { ...card, enhancements: pips.sort() };
            }
        }

        return cards;
    }

    normalizeHouseName(houseName) {
        return houseName.toLowerCase().replace(' ', '');
    }

    // deckPods shape { "1234-abcd": { houses: ["brobnar", "dis"], data: {...} }, "432abcd": { houses: ["logos"], data: {...} } }
    parseDeckResponse(username, deckPods, expansion) {
        let specialCards = {
            479: { 'dark-æmber-vault': true, 'it-s-coming': true }
        };

        let anomalies = {
            'orb-of-wonder': { anomalySet: 453, house: 'sanctum' },
            valoocanth: { anomalySet: 453, house: 'unfathomable' }
        };

        const deckHouses = flatten(Object.values(deckPods).map((pod) => pod['houses']));

        const deckCards = flatten(
            Object.values(deckPods).map((podData) =>
                podData['data']._linked.cards.filter(
                    (c) =>
                        !c.is_non_deck &&
                        podData['houses'].includes(this.normalizeHouseName(c.house))
                )
            )
        );
        const deckCardsIds = new Set(deckCards.map((deckCard) => deckCard.id));
        const allCardsIds = flatten(
            Object.values(deckPods).map((podData) =>
                podData['data']['data']._links.cards.filter((id) => deckCardsIds.has(id))
            )
        );

        // let enhancements = {};

        // TODO: enhancements per pod
        // if (deckCards.some((card) => card.is_enhanced)) {
        //     enhancements = this.countEnhancements(allCardsIds, deckCards);
        // }
        let cards = deckCards.map((card) => {
            let id = card.card_title
                .toLowerCase()
                .replace(/[,?.!"„“”]/gi, '')
                .replace(/[ '’]/gi, '-');

            if (card.rarity === 'Evil Twin') {
                id += '-evil-twin';
            }

            let retCard;
            let count = allCardsIds.filter((uuid) => uuid === card.id).length;
            if (card.is_maverick) {
                retCard = {
                    id: id,
                    count: count,
                    maverick: card.house.replace(' ', '').toLowerCase()
                };
            } else if (card.is_anomaly) {
                retCard = {
                    id: id,
                    count: count,
                    anomaly: card.house.replace(' ', '').toLowerCase()
                };
            } else {
                retCard = {
                    id: id,
                    count: count
                };
            }

            // if (card.is_enhanced) {
            //     retCard.enhancements = [];
            // }

            if (card.card_type === 'Creature2') {
                retCard.id += '2';
            }

            // If this is one of the cards that has an entry for every house, get the correct house image
            if (specialCards[card.expansion] && specialCards[card.expansion][id]) {
                retCard.house = card.house.toLowerCase().replace(' ', '');
                retCard.image = `${retCard.id}-${retCard.house}`;
            }

            if (anomalies[id] && anomalies[id].anomalySet !== card.expansion) {
                // anomaly cards' real house
                retCard.house = anomalies[id].house;
                retCard.image = `${retCard.id}-${retCard.house}`;
            }

            return retCard;
        });

        // TODO: enhancements per pod
        // let toAdd = [];
        // for (let card of cards) {
        //     if (card.enhancements && card.count > 1) {
        //         for (let i = 0; i < card.count - 1; i++) {
        //             let cardToAdd = Object.assign({}, card);
        //
        //             cardToAdd.count = 1;
        //             toAdd.push(cardToAdd);
        //         }
        //
        //         card.count = 1;
        //     }
        // }
        //
        // cards = cards.concat(toAdd);

        // if (cards.some((card) => card.enhancements)) {
        //     cards = this.assignEnhancements(cards, enhancements);
        // }

        let uuid = uuidGen.v4();
        let anyIllegalCards = cards.find(
            (card) =>
                !card.id
                    .split('')
                    .every((char) => 'æabcdefghijklmnoöpqrstuvwxyz0123456789-[]'.includes(char))
        );
        if (anyIllegalCards) {
            logger.error(
                `DECK IMPORT ERROR: ${anyIllegalCards.id
                    .split('')
                    .map((char) => char.charCodeAt(0))}`
            );

            return undefined;
        }

        return {
            expansion: expansion,
            username: username,
            uuid: uuid,
            identity: uuid,
            cardback: '',
            name:
                'Alliance of ' +
                Object.values(deckPods).map((pod) =>
                    pod.data.data.name.split(' ')[0].replace(',', '')
                ),
            houses: deckHouses,
            cards: cards,
            lastUpdated: new Date()
        };
    }

    mapDeck(deck) {
        return {
            expansion: deck.Expansion,
            id: deck.Id,
            identity: deck.Identity,
            name: deck.Name,
            lastUpdated: deck.LastUpdated,
            losses: deck.LoseCount,
            usageCount: deck.DeckCount,
            username: deck.Username,
            uuid: deck.Uuid,
            verified: deck.Verified,
            wins: deck.WinCount,
            winRate: deck.WinRate
        };
    }

    async getDeckDataAndSave(deckId) {
        try {
            const dbDeck = await db.query('SELECT "ApiData" FROM "SourceDecks" WHERE "Uuid" = $1', [
                deckId
            ]);
            if (dbDeck && dbDeck.length > 0) return JSON.parse(dbDeck[0].ApiData);
        } catch (err) {
            logger.error(err);
            // Error message goes through to the client
            throw new Error('Invalid response from Api. Please try again later.');
        }

        try {
            const mvResponse = await util.httpRequest(
                `https://www.keyforgegame.com/api/decks/${deckId}/?links=cards`,
                {
                    headers: {
                        'X-Forwarded-For': '127.0.0.' + Math.floor(Math.random() * 254)
                    }
                }
            );

            if (mvResponse[0] === '<') {
                logger.error('Deck failed to import: %s %s', deckId, mvResponse);

                throw new Error('Invalid response from Api. Please try again later.');
            }

            const parsedData = JSON.parse(mvResponse);
            if (!parsedData || !parsedData._linked || !parsedData.data) {
                throw new Error('Invalid response from Api. Please try again later.');
            }

            await db.query('INSERT INTO "SourceDecks"("Uuid", "ApiData") VALUES($1, $2)', [
                deckId,
                mvResponse
            ]);

            return parsedData;
        } catch (err) {
            logger.error(`Unable to get MV data for deck ${deckId}`, err);
            throw new Error('Invalid response from Api. Please try again later.');
        }
    }
}

module.exports = DeckService;
