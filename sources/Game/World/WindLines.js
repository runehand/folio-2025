import * as THREE from 'three/webgpu'
import { Game } from '../Game.js'
import { attribute, cameraNormalMatrix, cameraPosition, cameraProjectionMatrix, cameraViewMatrix, color, cross, float, floor, Fn, If, modelNormalMatrix, modelViewMatrix, modelWorldMatrix, mul, positionGeometry, positionLocal, positionWorld, uniform, vec2, vec3, vec4, vertexIndex, viewport } from 'three/tsl'
import gsap from 'gsap'
import { WindLineGeometry } from '../Geometries/WindLineGeometry.js'
import { remapClamp } from '../utilities/maths.js'

class WindLine
{
    constructor(thickness = 0.1)
    {
        this.game = Game.getInstance()

        this.available = true

        const geometry = new WindLineGeometry()

        const material = new THREE.MeshBasicNodeMaterial({ wireframe: false })

        this.thickness = uniform(thickness)
        this.progress = uniform(0)

        material.vertexNode = Fn(() =>
        {
            const worldPosition = modelWorldMatrix.mul(vec4(positionGeometry, 1))
            const toCamera = worldPosition.xyz.sub(cameraPosition).normalize()

            const nextPosition = positionGeometry.add(attribute('direction'))
            const nextWorldPosition = modelWorldMatrix.mul(vec4(nextPosition, 1))
            const nextDelta = nextWorldPosition.xyz.sub(worldPosition.xyz).normalize()
            const tangent = cross(nextDelta, toCamera).normalize()
            
            const ratio = attribute('ratio')
            const baseThickness = ratio.sub(0.5).abs().mul(2).oneMinus().smoothstep(0, 1)
            const remapedProgress = this.progress.mul(3).sub(1)
            const progressThickness = ratio.sub(remapedProgress).abs().oneMinus().smoothstep(0, 1)
            const finalThickness = mul(this.thickness, baseThickness, progressThickness)

            const sideStep = floor(vertexIndex.toFloat().mul(3).sub(2).div(3).mod(2)).sub(0.5)
            const sideOffset = tangent.mul(sideStep.mul(finalThickness))
            
            worldPosition.addAssign(vec4(sideOffset, 0))

            const viewPosition = cameraViewMatrix.mul(worldPosition)
            return cameraProjectionMatrix.mul(viewPosition)
        })()

        material.outputNode = this.game.lighting.lightOutputNodeBuilder(color('#ffffff'), vec3(0, 1, 0), this.game.lighting.addTotalShadowToMaterial(material))

        this.mesh = new THREE.Mesh(geometry, material)
        this.mesh.position.y = 2
        this.game.scene.add(this.mesh)
    }
}

export class WindLines
{
    constructor()
    {
        this.game = Game.getInstance()

        if(this.game.debug.active)
        {
            this.debugPanel = this.game.debug.panel.addFolder({
                title: '⌇ Wind lines',
                expanded: false,
            })
        }

        this.intervalRange = { min: 300, max: 2000 }
        this.duration = 4
        this.translation = 1
        this.thickness = 0.1

        this.pool = [
            new WindLine(),
            new WindLine(),
            new WindLine(),
            new WindLine()
        ]

        const displayInterval = () =>
        {
            this.display()

            setTimeout(() =>
            {
                displayInterval()
            }, this.intervalRange.min + Math.random() * (this.intervalRange.max - this.intervalRange.min))
        }

        // Debug
        this.durationBinding = this.game.debug.addManualBinding(
            this.debugPanel,
            this,
            'duration',
            { min: 0, max: 8, step: 0.001 },
            () =>
            {
                return remapClamp(this.game.weather.wind.value, 0, 1, 8, 2)
            }
        )

        if(this.game.debug.active)
        {
            this.debugPanel.addBinding(this, 'intervalRange', {
                min: 0,
                max: 4000,
                step: 1,
            })

            this.debugPanel.addBinding(this, 'duration', {
                min: 0,
                max: 4,
                step: 0.001,
            })

            this.debugPanel.addBinding(this, 'translation', {
                min: 0,
                max: 4,
                step: 0.001,
            })

            this.debugPanel.addBinding(this, 'thickness', {
                min: 0,
                max: 1,
                step: 0.001,
            }).on('change', () =>
            {
                for(const windLine of this.pool)
                    windLine.thickness.value = this.thickness
            })
        }

        displayInterval()
    }

    display()
    {
        const windLine = this.pool.find(windLine => windLine.available)

        if(!windLine)
            return

        // Apply weather
        this.durationBinding.update()

        // Setup
        windLine.mesh.visible = true
        windLine.available = false

        // Position and rotation
        const angle = this.game.wind.angle

        windLine.mesh.position.x = this.game.view.focusPoint.position.x + (Math.random() - 0.5) * this.game.view.optimalArea.radius
        windLine.mesh.position.z = this.game.view.focusPoint.position.z + (Math.random() - 0.5) * this.game.view.optimalArea.radius

        windLine.mesh.rotation.y = angle

        // Animate position
        gsap.to(
            windLine.mesh.position,
            {
                x: windLine.mesh.position.x + Math.sin(angle) * this.translation,
                z: windLine.mesh.position.z + Math.cos(angle) * this.translation,
                duration: this.duration
            }
        )

        // Animate progress
        gsap.fromTo(
            windLine.progress,
            {
                value: 0
            },
            {
                value: 1,
                duration: this.duration,
                onComplete: () =>
                {
                    windLine.mesh.visible = false
                    windLine.available = true
                }
            }
        )
        
    }
}