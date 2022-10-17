import React from 'react';
import { useTranslation } from 'react-i18next';
import { Col, Form, Button } from 'react-bootstrap';
import { useSelector, useDispatch } from 'react-redux';
import { Formik } from 'formik';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCircleNotch } from '@fortawesome/free-solid-svg-icons';
import * as yup from 'yup';

import Panel from '../Site/Panel';
import ApiStatus from '../Site/ApiStatus';
import { Decks } from '../../redux/types';
import { clearApiStatus, getSourceDecks, navigate } from '../../redux/actions';
import AllianceComposition from './AllianceComposition';

const ImportDeck = () => {
    const { t } = useTranslation();
    const dispatch = useDispatch();
    const selectedDeck = useSelector((state) => state.cards.selectedDeck);
    const sourceDecks = useSelector((state) => state.cards.sourceDecks);
    const apiSaveState = useSelector((state) => {
        const retState = state.api[Decks.SaveDeck];

        if (retState && retState.success) {
            retState.message = t('Deck added successfully');
            const enhancedCards = selectedDeck.cards.filter(
                (c) => c.enhancements && c.enhancements.length > 0
            );
            if (selectedDeck.cards.some((c) => c.enhancements) && enhancedCards.length === 0) {
                retState.message = t(
                    'Deck added successfully but the deck has enhancements. It is not possible for us to determine which cards are enhanced. You will be redirected to a page that allows you to assign them.'
                );
                setTimeout(() => {
                    dispatch(clearApiStatus(Decks.SaveDeck));
                    dispatch(navigate('/decks/enhancements'));
                }, 3000);
            } else {
                setTimeout(() => {
                    dispatch(clearApiStatus(Decks.SaveDeck));
                    dispatch(navigate('/decks'));
                }, 1000);
            }
        }

        return retState;
    });
    const apiSourceDeckState = useSelector((state) => {
        const retState = state.api[Decks.AddSourceDecks];
        if (retState && retState.success) {
            retState.message = 'Decks fetched successfully';
            setTimeout(() => {
                dispatch(clearApiStatus(Decks.AddSourceDecks));
            }, 1000);
        }
        return retState;
    });

    const yupValidator = yup
        .string()
        .required(t('You must specify the deck link'))
        .notOneOf(
            ['https://www.keyforgegame.com/deck-details/00000000-0000-0000-0000-000000000000'],
            t('The URL you entered is invalid.  Please check it and try again.')
        )
        .matches(
            /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/,
            t('The URL you entered is invalid.  Please check it and try again.')
        );
    const schema = yup.object({
        ['deckLink-0']: yupValidator,
        ['deckLink-1']: yupValidator,
        ['deckLink-2']: yupValidator
    });

    const initialValues = {
        deckLink: ''
    };

    const onSubmit = (values) => {
        const regex = /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/;

        const deckIds = [];
        [...Array(3).keys()].map((idx) => {
            const uuid = values[`deckLink-${idx}`].match(regex);
            deckIds.push(uuid[0]);
        });

        dispatch(getSourceDecks(deckIds));
    };

    return (
        <div>
            <Col md={{ span: 8, offset: 2 }} className='profile full-height'>
                <ApiStatus
                    state={apiSaveState}
                    onClose={() => dispatch(clearApiStatus(Decks.SaveDeck))}
                />
                <ApiStatus
                    state={apiSourceDeckState}
                    onClose={() => dispatch(clearApiStatus(Decks.AddSourceDecks))}
                />
                <Panel title={t('Import Deck')}>
                    <p>
                        Enter 3 deck links from the&nbsp;
                        <a
                            href='https://keyforgegame.com'
                            target='_blank'
                            rel='noopener noreferrer'
                        >
                            keyforge website.
                        </a>
                        &nbsp;Then, choose a house pod for each deck and save.
                    </p>
                    <Formik
                        validationSchema={schema}
                        onSubmit={onSubmit}
                        initialValues={initialValues}
                    >
                        {(formProps) => (
                            <Form
                                onSubmit={(event) => {
                                    event.preventDefault();
                                    formProps.handleSubmit(event);
                                }}
                            >
                                {[...Array(3).keys()].map((idx) => (
                                    <Form.Row key={idx}>
                                        <Form.Group as={Col} xs='9' controlId='formGridDeckLink'>
                                            <Form.Control
                                                name={`deckLink-${idx}`}
                                                type='text'
                                                placeholder={t('Enter the deck link')}
                                                value={formProps.values[`deckLink-${idx}`]}
                                                onChange={formProps.handleChange}
                                                onBlur={formProps.handleBlur}
                                                isInvalid={
                                                    formProps.touched[`deckLink-${idx}`] &&
                                                    !!formProps.errors[`deckLink-${idx}`]
                                                }
                                            />
                                            <Form.Control.Feedback type='invalid'>
                                                {formProps.errors[`deckLink-${idx}`]}
                                            </Form.Control.Feedback>
                                        </Form.Group>
                                    </Form.Row>
                                ))}

                                <Col className='text-center'>
                                    <Button variant='secondary' type='submit'>
                                        {t('Add decks')}
                                        &nbsp;
                                        {apiSourceDeckState && apiSourceDeckState.loading && (
                                            <FontAwesomeIcon icon={faCircleNotch} spin />
                                        )}
                                    </Button>
                                </Col>
                            </Form>
                        )}
                    </Formik>
                    {sourceDecks.length !== 0 && (
                        <AllianceComposition
                            sourceDecks={sourceDecks}
                            dispatch={dispatch}
                            apiState={apiSaveState}
                        />
                    )}
                </Panel>
            </Col>
        </div>
    );
};

ImportDeck.displayName = 'ImportDeck';

export default ImportDeck;
