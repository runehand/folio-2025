import * as THREE from 'three/webgpu'
import { Game } from '../Game.js'
import { color, float, Fn, instance, instancedBufferAttribute, instanceIndex, luminance, mix, positionLocal, texture, uniform, uniformArray, uv, vec3, vec4 } from 'three/tsl'
import { remap, smoothstep } from '../utilities/maths.js'

export class PoleLights
{
    constructor()
    {
        this.game = Game.getInstance()

        this.model = this.game.resources.poleLightsModel.scene

        // Debug
        if(this.game.debug.active)
        {
            this.debugPanel = this.game.debug.panel.addFolder({
                title: '🏮 Pole lights',
                expanded: false,
            })
        }

        this.setBase()
        this.setEmissives()

        this.game.time.events.on('tick', () =>
        {
            this.update()
        })
    }

    setBase()
    {
        this.game.materials.updateObject(this.model)
        this.game.scene.add(this.model)

        this.model.traverse(_child =>
        {
            if(_child.isMesh)
            {
                _child.castShadow = true
                _child.receiveShadow = _child.name.startsWith('poleLightEmissive') ? false : true
            }
        })
    }

    setEmissives()
    {
        this.emissives = {}
        this.emissives.items = []
        this.model.traverse(_child =>
        {
            if(_child.isMesh && _child.name.startsWith('poleLightEmissive'))
                this.emissives.items.push(_child)
        })

        this.emissives.offMaterial = this.emissives.items[0].material
        this.emissives.onMaterial = this.game.materials.createEmissive('emissivePoleLight', '#ff8641', 3, this.debugPanel)

        this.game.dayCycles.addIntervalEvent('poleLightsOn', 0.25, 0.7)

        this.game.dayCycles.events.on('poleLightsOn', (inInverval) =>
        {
            if(inInverval)
            {
                for(const emissive of this.emissives.items)
                    emissive.material = this.emissives.onMaterial
            }
            else
            {
                for(const emissive of this.emissives.items)
                    emissive.material = this.emissives.offMaterial
            }
        })
    }

    update()
    {
        
    }
}