const _ = require('underscore');

const PlotCard = require('../../../plotcard.js');

class SupportingTheFaith extends PlotCard {
    onBeginChallengePhase() {
        _.each(this.game.getPlayers(), player => {
            player.gold = 0;
        });

        this.game.addMessage('{0} uses {1} to make both players return their gold to the treasury', this.owner, this);
    }
}

SupportingTheFaith.code = '01023';

module.exports = SupportingTheFaith;
