import * as THREE from 'three'
import { Game } from './Game.js'
import { output, color, sin, time, smoothstep, mix, matcapUV, float, mod, texture, transformNormalToView, uniformArray, varying, vertexIndex, rotateUV, cameraPosition, vec4, atan2, vec3, vec2, modelWorldMatrix, Fn, attribute, uniform } from 'three'

export class Lighting
{
    constructor()
    {
        this.game = new Game()

        this.spherical = new THREE.Spherical(50, 1.44, 1.31)
        this.count = 2
        this.lights = []
        this.mapSizeMin = 128
        this.shadowAmplitude = 20
        this.near = 1
        this.depth = 100

        for(let i = 0; i < this.count; i++)
        {
            const light = new THREE.DirectionalLight(0xffffff, 1)
            light.position.setFromSpherical(this.spherical)
            light.castShadow = true
            
            this.game.scene.add(light)
            this.game.scene.add(light.target)

            this.lights.push(light)
        }

        this.updateLights()

        this.game.time.events.on('tick', () =>
        {
            this.update()
        })

        // Debug
        if(this.game.debug.active)
        {
            const debugPanel = this.game.debug.panel.addFolder({
                title: '💡 Lights',
                expanded: true,
            })

            debugPanel.addBinding(this.spherical, 'phi', { min: 0, max: Math.PI * 0.5 })
            debugPanel.addBinding(this.spherical, 'theta', { min: - Math.PI, max: Math.PI })
            debugPanel.addBinding(this.spherical, 'radius', { min: 0, max: 100 })
            debugPanel.addBlade({ view: 'separator' })
            debugPanel.addBinding(this, 'near', { min: 0.1, max: 50, step: 0.1 }).on('change', () => this.updateLights())
            debugPanel.addBinding(this, 'depth', { min: 0.1, max: 100, step: 0.1 }).on('change', () => this.updateLights())
            debugPanel.addBinding(this, 'shadowAmplitude', { min: 1, max: 50 }).on('change', () => this.updateLights())

            const mapSizes = {}
            for(let i = 0; i < 12; i++)
            {
                const size = Math.pow(2, i + 1)
                mapSizes[size] = size
            }
            debugPanel.addBinding(this, 'mapSizeMin', { options: mapSizes }).on('change', () => this.updateLights())
        }
    }

    updateLights()
    {
        let i = 0
        for(const light of this.lights)
        {
            light.shadow.camera.top = this.shadowAmplitude
            light.shadow.camera.right = this.shadowAmplitude
            light.shadow.camera.bottom = - this.shadowAmplitude
            light.shadow.camera.left = - this.shadowAmplitude
            light.shadow.camera.near = this.near
            light.shadow.camera.far = this.near + this.depth

            light.shadow.camera.updateProjectionMatrix()

            const mapSize = this.mapSizeMin * Math.pow(2, i)
            light.shadow.mapSize.set(mapSize, mapSize)

            i++
        }
    }

    update()
    {
        for(const light of this.lights)
        {
            light.position.setFromSpherical(this.spherical).add(this.game.view.focusPoint.position)
            light.target.position.copy(this.game.view.focusPoint.position)
        }
    }
}