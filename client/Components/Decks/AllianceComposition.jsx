import { Button, Col } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCircleNotch } from '@fortawesome/free-solid-svg-icons';
import React from 'react';
import { chooseSourceDeckHouse, saveDeck } from '../../redux/actions';

import './AllianceComposition.scss';

const AllianceComposition = ({ sourceDecks, dispatch, apiState }) => {
    const allHousesChosen = sourceDecks.reduce(
        (allPreviousChosen, sourceDeck) => allPreviousChosen && !!sourceDeck.chosenHouse,
        true
    );

    return (
        <div>
            <div className='source-decks'>
                {sourceDecks.map((deck, idx) => (
                    <div key={idx} className='source-deck-row'>
                        <div>{deck.name}</div>
                        <div className='import-house-icon-row'>
                            {deck.houses.map((house) => {
                                let classNames = `button-icon icon-${house}`;
                                if (house !== deck.chosenHouse) classNames += ' disabled';
                                return (
                                    <div
                                        title={house}
                                        className={classNames}
                                        key={house}
                                        onClick={() => dispatch(chooseSourceDeckHouse(idx, house))}
                                    />
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
            <Col className='text-center'>
                <Button
                    variant='secondary'
                    type='submit'
                    disabled={sourceDecks.length === 0 || !allHousesChosen}
                    onClick={() => dispatch(saveDeck())}
                >
                    Save Alliance
                    {apiState && apiState.loading && <FontAwesomeIcon icon={faCircleNotch} spin />}
                </Button>
            </Col>
        </div>
    );
};

export default AllianceComposition;
