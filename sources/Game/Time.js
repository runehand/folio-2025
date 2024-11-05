import { Events } from './Events.js'
import { Game } from './Game.js'

export class Time
{
    constructor()
    {
        this.game = new Game()

        this.elapsed = 0
        this.delta = 1 / 60
        this.maxDelta = 1 / 30
        this.scale = 2
        this.deltaScaled = this.delta * this.scale
        this.elapsedScaled = 0

        this.events = new Events()
        this.setTick()

        console.log(this.game.debug)
        if(this.game.debug.active)
        {
            this.debugPanel = this.game.debug.panel.addFolder({
                title: '⏱️ Time',
                expanded: false,
            })
            this.debugPanel.addBinding(this, 'scale', { min: 0, max: 5, step: 0.01 })
        }
    }

    setTick()
    {
        const tick = (elapsed) =>
        {
            const elapsedSeconds = elapsed / 1000
            this.delta = Math.min(elapsedSeconds - this.elapsed, this.maxDelta)
            this.elapsed = elapsedSeconds
            this.deltaScaled = this.delta * this.scale
            this.elapsedScaled += this.deltaScaled

            this.events.trigger('tick')

            requestAnimationFrame(tick)
        }
        requestAnimationFrame(tick)
    }
}