const Card = require('../../Card.js');

class Poke extends Card {
    setupCardAbilities(ability) {
        this.play({
            target: {
                cardType: 'creature',
                controller: 'opponent',
                gameAction: ability.actions.dealDamage({ amount: 1 })
            },
            then: {
                condition: (context) =>
                    context.preThenEvent.destroyEvent &&
                    context.preThenEvent.destroyEvent.destroyedByDamageDealt &&
                    context.preThenEvent.destroyEvent.resolved,
                message: '{0} uses {1} to draw a card',
                gameAction: ability.actions.draw()
            }
        });
    }
}

Poke.id = 'poke';

module.exports = Poke;
