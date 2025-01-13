import * as THREE from 'three/webgpu'
import { Game } from '../Game.js'
import { attribute, cameraNormalMatrix, cameraPosition, cameraProjectionMatrix, cameraViewMatrix, color, cross, float, floor, Fn, If, modelNormalMatrix, modelViewMatrix, modelWorldMatrix, mul, normalLocal, normalWorld, positionGeometry, positionLocal, positionWorld, uniform, vec2, vec3, vec4, vertexIndex, viewport } from 'three/tsl'
import gsap from 'gsap'

class WindLineGeometry extends THREE.BufferGeometry
{
    constructor(length = 10, handlesCount = 4, amplitude = 1, divisions = 30)
    {
        super()

        this.type = 'LatheGeometry'

        this.parameters = {
            length,
            handlesCount,
            amplitude,
            divisions
        };

        // Handles
        const halfExtent = length / 2
        const handleSpan = length / (handlesCount - 1)
        const handles = []

        for(let i = 0; i < handlesCount; i++)
        {
            handles.push(new THREE.Vector3(
                0,
                i % 2 - 0.5 * amplitude,
                - halfExtent + i * handleSpan
            ))
        }

        // Curve
        const curve = new THREE.CatmullRomCurve3(handles)
        const points = curve.getPoints(divisions)
        
        const positions = new Float32Array(divisions * 3 * 2)
        const directions = new Float32Array(divisions * 3 * 2)
        const ratios = new Float32Array(divisions * 2)
        const indices = new Uint16Array((divisions - 1) * 2 * 3)
        
        for(let i = 0; i < divisions; i++)
        {
            const i2 = i * 2
            const i6 = i * 6

            const point = points[i]
            const nextPoint = points[Math.min(i + 1, divisions - 1)]
            // TODO: handle latest point

            // Position
            positions[i6 + 0] = point.x
            positions[i6 + 1] = point.y
            positions[i6 + 2] = point.z

            positions[i6 + 3] = point.x
            positions[i6 + 4] = point.y
            positions[i6 + 5] = point.z

            // Direction
            const direction = nextPoint.clone().sub(point).normalize()

            directions[i6 + 0] = direction.x
            directions[i6 + 1] = direction.y
            directions[i6 + 2] = direction.z

            directions[i6 + 3] = direction.x
            directions[i6 + 4] = direction.y
            directions[i6 + 5] = direction.z

            // Progress
            ratios[i2 + 0] = i / (divisions - 1)
            ratios[i2 + 1] = i / (divisions - 1)

            // Index
            indices[i6 + 0] = i2 + 2
            indices[i6 + 1] = i2
            indices[i6 + 2] = i2 + 1
            indices[i6 + 3] = i2 + 1
            indices[i6 + 4] = i2 + 3
            indices[i6 + 5] = i2 + 2
        }

        // Attributes
        this.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
        this.setAttribute('direction', new THREE.Float32BufferAttribute(directions, 3))
        this.setAttribute('ratio', new THREE.Float32BufferAttribute(ratios, 1))
        this.setIndex(new THREE.BufferAttribute(indices, 1))
    }
}

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

        material.outputNode = this.game.lighting.lightOutputNodeBuilder(color('#ffffff'), this.game.lighting.addTotalShadowToMaterial(material))

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

        this.intervalRange = { min: 300, max: 2000 }
        this.duration = 2
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


        if(this.game.debug.active)
        {
            this.debugPanel = this.game.debug.panel.addFolder({
                title: '⌇ Wind lines',
                expanded: true,
            })

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