import React from 'react';
import { Col, Form } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';

import Panel from '../Site/Panel';

import './ProfileMain.scss';

/**
 * @typedef { import('./Profile').ProfileDetails } ProfileDetails
 */

/**
 * @typedef ProfileMainProps
 * @property {import('formik').FormikProps<ProfileDetails>} formProps
 * @property {User} user
 */

/**
 * @param {ProfileMainProps} props
 */
const ProfileMain = ({ formProps }) => {
    const { t } = useTranslation();

    return (
        <Panel title={t('Profile')}>
            <Form.Row>
                <Form.Group as={Col} md='6' controlId='formGridUsername'>
                    <Form.Label>{t('Username')}</Form.Label>
                    <Form.Control
                        name='username'
                        type='text'
                        placeholder={t('Enter a username')}
                        value={formProps.values.username}
                        onChange={formProps.handleChange}
                        onBlur={formProps.handleBlur}
                        isInvalid={formProps.touched.username && !!formProps.errors.username}
                    />
                    <Form.Control.Feedback type='invalid'>
                        {formProps.errors.username}
                    </Form.Control.Feedback>
                </Form.Group>
                <Form.Group as={Col} md='6' controlId='formGridEmail'>
                    <Form.Label>{t('Email')}</Form.Label>
                    <Form.Control
                        name='email'
                        type='text'
                        placeholder={t('Enter an email address')}
                        value={formProps.values.email}
                        onChange={formProps.handleChange}
                        onBlur={formProps.handleBlur}
                        isInvalid={formProps.touched.email && !!formProps.errors.email}
                    />
                    <Form.Control.Feedback type='invalid'>
                        {formProps.errors.email}
                    </Form.Control.Feedback>
                </Form.Group>
            </Form.Row>
            <Form.Row>
                <Form.Group as={Col} md='6' controlId='formGridPassword'>
                    <Form.Label>{t('Password')}</Form.Label>
                    <Form.Control
                        name='password'
                        type='password'
                        placeholder={t('Enter a password')}
                        value={formProps.values.password}
                        onChange={formProps.handleChange}
                        onBlur={formProps.handleBlur}
                        isInvalid={formProps.touched.password && !!formProps.errors.password}
                    />
                    <Form.Control.Feedback type='invalid'>
                        {formProps.errors.password}
                    </Form.Control.Feedback>
                </Form.Group>
                <Form.Group as={Col} md='6' controlId='formGridPassword1'>
                    <Form.Label>{t('Password (again)')}</Form.Label>
                    <Form.Control
                        name='passwordAgain'
                        type='password'
                        placeholder={t('Enter the same password')}
                        value={formProps.values.passwordAgain}
                        onChange={formProps.handleChange}
                        onBlur={formProps.handleBlur}
                        isInvalid={
                            formProps.touched.passwordAgain && !!formProps.errors.passwordAgain
                        }
                    />
                    <Form.Control.Feedback type='invalid'>
                        {formProps.errors.passwordAgain}
                    </Form.Control.Feedback>
                </Form.Group>
            </Form.Row>
            <Form.Row>
                <Form.Group as={Col} md='6' controlId='formGridChallongeKey'>
                    <Form.Label>{t('Challonge API Key')}</Form.Label>
                    <Form.Control
                        name='challongeApiKey'
                        type='password'
                        placeholder={t('Enter challonge API key')}
                        value={formProps.values.challongeApiKey}
                        onChange={formProps.handleChange}
                        onBlur={formProps.handleBlur}
                        isInvalid={
                            formProps.touched.challongeApiKey && !!formProps.errors.challongeApiKey
                        }
                    />
                    <Form.Control.Feedback type='invalid'>
                        {formProps.errors.challongeApiKey}
                    </Form.Control.Feedback>
                </Form.Group>
                <Form.Group as={Col} md='6' controlId='formGridChallongeDomain'>
                    <Form.Label>{t('Challonge API Subdomain')}</Form.Label>
                    <Form.Control
                        name='challongeApiSubdomain'
                        type='password'
                        placeholder={t('Enter challonge API subdomain')}
                        value={formProps.values.challongeApiSubdomain}
                        onChange={formProps.handleChange}
                        onBlur={formProps.handleBlur}
                        isInvalid={
                            formProps.touched.challongeApiSubdomain &&
                            !!formProps.errors.challongeApiSubdomain
                        }
                    />
                    <Form.Control.Feedback type='invalid'>
                        {formProps.errors.challongeApiSubdomain}
                    </Form.Control.Feedback>
                </Form.Group>
            </Form.Row>
        </Panel>
    );
};

export default ProfileMain;
