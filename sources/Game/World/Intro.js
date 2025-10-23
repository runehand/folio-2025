import { Game } from '../Game.js'
import { InteractivePoints } from '../InteractivePoints.js'

export class Intro
{
    constructor(references)
    {
        this.game = Game.getInstance()
        
        this.references = references

        this.setInteractivePoint()
    }

    setInteractivePoint()
    {
        this.interactivePoint = this.game.interactivePoints.create(
            this.references.get('interactivePoint')[0].position,
            'Read me!',
            InteractivePoints.ALIGN_RIGHT,
            InteractivePoints.STATE_CONCEALED,
            () =>
            {
                this.game.inputs.interactiveButtons.clearItems()
                this.game.modals.open('intro')
                this.interactivePoint.hide()
            },
            () =>
            {
                this.game.inputs.interactiveButtons.addItems(['interact'])
            },
            () =>
            {
                this.game.inputs.interactiveButtons.removeItems(['interact'])
            },
            () =>
            {
                this.game.inputs.interactiveButtons.removeItems(['interact'])
            }
        )

        this.game.modals.items.get('intro').events.on('close', () =>
        {
            this.interactivePoint.reveal()
        })
    }
}