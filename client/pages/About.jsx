import React from 'react';
import PropTypes from 'prop-types';
import { withTranslation, Trans } from 'react-i18next';
import { Col } from 'react-bootstrap';

import Panel from '../Components/Site/Panel';

class About extends React.Component {
    render() {
        let t = this.props.t;

        return (
            <Col className='full-height' xs='12'>
                <Panel title={t('About Sloppy Alliance')}>
                    <Trans i18nKey='about.addnotes'>
                        <h3>Additional Notes</h3>
                        <p>
                            The Keyforge Unique Deck Game, the artwork and many other things are all
                            copyright Fantasy Flight Games and I make no claims of ownership or
                            otherwise of any of the artwork or trademarks. This site exists for
                            passionate fans to play a game they enjoy and augment, rather than
                            replace, the in person LCG. FFG does not endorse, support, and is not
                            involved with, this site in any way.
                        </p>
                    </Trans>
                    <h3>Source code</h3>
                    <p>
                        This is a modification of the{' '}
                        <a href='https://github.com/keyteki/keyteki'>keyteki</a> code base. The
                        modified source may be found{' '}
                        <a href='https://github.com/bkij/keyteki'>here</a>.
                    </p>
                </Panel>
            </Col>
        );
    }
}

About.displayName = 'About';
About.propTypes = {
    i18n: PropTypes.object,
    t: PropTypes.func
};

export default withTranslation()(About);
