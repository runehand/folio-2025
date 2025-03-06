import * as THREE from 'three/webgpu'
import { Game } from '../Game.js'
import { color, float, Fn, hash, instance, instancedBufferAttribute, instanceIndex, luminance, mix, PI2, positionLocal, sin, storage, texture, uniform, uniformArray, uv, vec3, vec4 } from 'three/tsl'
import { remap, smoothstep } from '../utilities/maths.js'
import gsap from 'gsap'

export class PoleLights
{
    constructor()
    {
        this.game = Game.getInstance()

        // Debug
        if(this.game.debug.active)
        {
            this.debugPanel = this.game.debug.panel.addFolder({
                title: '🏮 Pole lights',
                expanded: false,
            })
        }

        this.visualModel = this.game.resources.poleLightsVisualModel.scene
        this.physicalModel = this.game.resources.poleLightsPhysicalModel.scene

        this.setPhysical()
        this.setBase()
        this.setEmissives()
        this.setFireflies()
        this.setSwitchInterval()
    }

    setPhysical()
    {
        this.game.entities.addFromModels(
            this.physicalModel,
            null,
            {
                type: 'fixed',
            }
        )
    }

    setBase()
    {
        this.game.materials.updateObject(this.visualModel)
        this.game.scene.add(this.visualModel)

        this.visualModel.traverse((_child) =>
        {
            if(_child.isMesh)
            {
                _child.castShadow = true
                _child.receiveShadow = true
            }
        })
    }

    setEmissives()
    {
        this.emissive = {}
        this.emissive.offMaterial = this.game.materials.getFromName('glass')
        this.emissive.onMaterial = this.game.materials.getFromName('emissiveGradientWarm')
        this.emissive.mesh = null

        this.visualModel.traverse((_child) =>
        {
            if(_child.isMesh && _child.name.startsWith('poleLightGlass'))
                this.emissive.mesh = _child
        })
    }

    setFireflies()
    {
        this.firefliesScale = uniform(0)

        const countPerLight = 5
        const count = this.physicalModel.children.length * countPerLight
        const positions = new Float32Array(count * 3)

        let i = 0
        for(const physical of this.physicalModel.children)
        {
            for(let j = 0; j < countPerLight; j++)
            {
                const i3 = i * 3

                const angle = Math.random() * Math.PI * 2
                positions[i3 + 0] = physical.position.x + Math.cos(angle)
                positions[i3 + 1] = physical.position.y + 1
                positions[i3 + 2] = physical.position.z + Math.sin(angle)
                i++
            }
        }

        const positionAttribute = storage(new THREE.StorageInstancedBufferAttribute(positions, 3), 'vec3', count).toAttribute()

        const material = new THREE.SpriteNodeMaterial()
        material.colorNode = this.emissive.onMaterial.colorNode

        const baseTime = this.game.ticker.elapsedScaledUniform.add(hash(instanceIndex).mul(999))
        const flyOffset = vec3(
            sin(baseTime.mul(0.4)).mul(0.5),
            sin(baseTime).mul(0.2),
            sin(baseTime.mul(0.3)).mul(0.5)
        )
        material.positionNode = positionAttribute.add(flyOffset)
        material.scaleNode = this.firefliesScale

        const geometry = new THREE.PlaneGeometry(0.03, 0.03)

        const mesh = new THREE.Mesh(geometry, material)
        mesh.count = count
        mesh.frustumCulled = false
        this.game.scene.add(mesh)
    }

    setSwitchInterval()
    {
        this.game.dayCycles.addIntervalEvent('poleLights', 0.25, 0.7)

        this.game.dayCycles.events.on('poleLights', (inInverval) =>
        {
            if(inInverval)
            {
                this.emissive.mesh.material = this.emissive.onMaterial

                gsap.to(this.firefliesScale, { value: 1, duration: 5 })
            }
            else
            {
                this.emissive.mesh.material = this.emissive.offMaterial

                gsap.to(this.firefliesScale, { value: 0, duration: 5, overwrite: true })
            }
        })
    }
}