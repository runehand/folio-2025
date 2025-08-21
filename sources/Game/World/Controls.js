import { Game } from '../Game.js'
import { InteractiveAreas } from '../InteractiveAreas.js'

export class Controls
{
    constructor(references)
    {
        this.game = Game.getInstance()
        
        this.references = references

        this.setInteractiveArea()

        this.game.modals.items.get('controls').events.on('close', () =>
        {
            this.interactiveArea.reveal()
        })
    }

    setInteractiveArea()
    {
        this.interactiveArea = this.game.interactiveAreas.create(
            this.references.get('interactiveArea')[0].position,
            'Controls',
            InteractiveAreas.ALIGN_RIGHT,
            () =>
            {
                this.game.modals.open('controls')
                this.interactiveArea.hide()
            },
            () =>
            {
                this.game.inputs.touchButtons.updateItems(['interact'])
            },
            () =>
            {
                this.game.inputs.touchButtons.updateItems([])
            },
            () =>
            {
                this.game.inputs.touchButtons.updateItems([])
            }
        )
    }
}