import { Game } from '../Game.js'
import { InteractiveAreas } from '../InteractiveAreas.js'

export class Intro
{
    constructor(references)
    {
        this.game = Game.getInstance()
        
        this.references = references

        this.setInteractiveArea()

        let firstTimeIntro = true

        this.game.modals.items.get('intro').events.on('close', () =>
        {
            if(firstTimeIntro)
                this.game.audio.music.play()
            
            firstTimeIntro = false
            this.interactiveArea.reveal()
        })
    }

    setInteractiveArea()
    {
        this.interactiveArea = this.game.interactiveAreas.create(
            this.references.get('interactiveArea')[0].position,
            'Read me!',
            InteractiveAreas.ALIGN_RIGHT,
            () =>
            {
                this.game.modals.open('intro')
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