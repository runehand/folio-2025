import * as THREE from 'three/webgpu'
import { Game } from '../Game.js'
import { color, dot, Fn, max, mix, normalGeometry, smoothstep, uniform, vec3, vec4 } from 'three/tsl'
import { normalWorld } from 'three/tsl'

export class Scenery
{
    constructor()
    {
        this.game = Game.getInstance()

        if(this.game.debug.active)
        {
            this.debugPanel = this.game.debug.panel.addFolder({
                title: '🛋️ Scenery',
                expanded: false,
            })
        }

        this.setStoneMaterial()

        this.setStatic()
        this.setDynamics()
    }

    setStoneMaterial()
    {
        const test = new THREE.MeshBasicNodeMaterial()
        test.shadowSide = THREE.BackSide

        const stoneColor = uniform(color('#ffe9d7'))
        const mossColor = uniform(color('#d4d56d'))

        test.outputNode = Fn(() =>
        {
            const upDot = dot(vec3(0.2, 1, 0.4).normalize(), normalGeometry).toVar()

            const baseColor = mix(stoneColor, mossColor, max(0, upDot))
            return this.game.lighting.lightOutputNodeBuilder(baseColor, normalWorld, this.game.lighting.addTotalShadowToMaterial(test))
        })()
        this.game.materials.save('stoneWhite', test)

        // Debug
        if(this.game.debug.active)
        {
            const debugPanel = this.debugPanel.addFolder({
                title: 'Stone material',
                expanded: false,
            })

            this.game.debug.addThreeColorBinding(debugPanel, stoneColor.value, 'stoneColor')
            this.game.debug.addThreeColorBinding(debugPanel, mossColor.value, 'mossColor')
        }
    }

    setStatic()
    {
        const visualModel = this.game.resources.sceneryStaticVisualModel
        
        this.game.materials.updateObject(visualModel.scene)
        visualModel.scene.traverse(_child =>
        {
            if(_child.isMesh)
            {
                _child.castShadow = true
                _child.receiveShadow = true
            }
        })

        this.game.scene.add(visualModel.scene)
    }

    setDynamics()
    {
        
    }
}