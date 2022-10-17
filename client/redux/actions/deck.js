import { Decks } from '../types';

/**
 * @typedef DeckFilter
 * @property {string} name
 * @property {string} value
 */

/**
 * @typedef PagingOptions
 * @property {number} [pageSize] The number of elements in each page
 * @property {number} [page] The page index
 * @property {string} [sort] The sort column
 * @property {string} [sortDir] The sort direction
 * @property {DeckFilter[]} [filter] The filters
 */

/**
 * @param {PagingOptions} options
 */
export function loadDecks(options = {}) {
    return {
        types: [Decks.RequestDecks, Decks.DecksReceived],
        shouldCallAPI: () => true,
        APIParams: { url: '/api/decks', cache: false, data: options }
    };
}

export function loadDeck(deckId) {
    return {
        types: ['REQUEST_DECK', 'RECEIVE_DECK'],
        shouldCallAPI: (state) => {
            let ret =
                state.cards.decks.length === 0 ||
                !state.cards.decks.some((deck) => {
                    return deck.id === deckId;
                });

            return ret;
        },
        APIParams: { url: `/api/decks/${deckId}`, cache: false }
    };
}

export function selectDeck(deck) {
    return {
        type: 'SELECT_DECK',
        deck: deck
    };
}

export function deleteDeck(deck) {
    return {
        types: [Decks.DeleteDeck, Decks.DeckDeleted],
        shouldCallAPI: () => true,
        APIParams: {
            url: `/api/decks/${deck.id}`,
            type: 'DELETE'
        }
    };
}

export function clearDeckStatus() {
    return {
        type: 'CLEAR_DECK_STATUS'
    };
}

export function loadStandaloneDecks() {
    return {
        types: ['LOAD_STANDALONE_DECKS', 'STANDALONE_DECKS_LOADED'],
        shouldCallAPI: () => true,
        APIParams: {
            url: '/api/standalone-decks',
            type: 'GET'
        }
    };
}

export function saveDeckEnhancements(deck, enhancements) {
    let str = JSON.stringify({ enhancements: enhancements });

    return {
        types: [Decks.SaveEnhancements, Decks.EnhancementsSaved],
        shouldCallAPI: () => true,
        APIParams: {
            url: `/api/decks/${deck.id}/enhancements`,
            type: 'POST',
            data: str
        }
    };
}

export function chooseSourceDeckHouse(sourceDeckIdx, house) {
    return {
        type: 'CHOOSE_SOURCE_DECK_HOUSE',
        sourceDeckIdx,
        house
    };
}

export function removeSourceDecks() {
    return {
        type: 'REMOVE_SOURCE_DECKS'
    };
}

// just add to list after validation
export function getSourceDecks(deckIds) {
    return {
        types: [Decks.AddSourceDecks, Decks.SourceDecksAdded],
        shouldCallAPI: () => true,
        APIParams: {
            url: `/api/source-decks?${deckIds.map((id) => `deckIds=${id}`).join('&')}`,
            type: 'GET'
        }
    };
}

export function saveDeck() {
    return async (dispatch, getState) => {
        const sourceDecks = getState().cards.sourceDecks;
        const pods = {};
        sourceDecks.forEach((deck) => {
            if (!pods[deck.id]) pods[deck.id] = { houses: [] };
            pods[deck.id].houses.push(deck.chosenHouse);
        });

        await dispatch({
            types: [Decks.SaveDeck, Decks.DeckSaved],
            shouldCallAPI: () => true,
            APIParams: {
                url: '/api/decks/',
                type: 'POST',
                data: JSON.stringify({ pods })
            }
        });
        const saveDeckState = getState().api[Decks.SaveDeck];
        if (saveDeckState && saveDeckState.success) {
            dispatch(removeSourceDecks());
        }
    };
}
