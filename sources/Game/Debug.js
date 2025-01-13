import * as THREE from 'three'
import { Pane } from 'tweakpane'
import * as EssentialsPlugin from '@tweakpane/plugin-essentials'
import { Game } from './Game.js'

export class Debug
{
    constructor()
    {
        this.game = Game.getInstance()
        
        this.active = location.hash.indexOf('debug') !== -1

        if(this.active)
        {
            this.panel = new Pane()
            this.panel.registerPlugin(EssentialsPlugin)
        }
    }

    addThreeColorBinding(panel, object, label)
    {
        return panel.addBinding({ color: object.getHex(THREE.SRGBColorSpace) }, 'color', { label: label, view: 'color' })
                    .on('change', tweak => { object.set(tweak.value) })
    }
}