import * as THREE from 'three/webgpu'
import { Game } from '../Game.js'
import { attribute, color, float, Fn, instance, instancedBufferAttribute, instanceIndex, luminance, mix, normalWorld, positionLocal, texture, uniform, uniformArray, uv, vec3, vec4 } from 'three/tsl'
import { remap, smoothstep } from '../utilities/maths.js'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

export class Flowers
{
    constructor()
    {
        this.game = Game.getInstance()

        // Debug
        if(this.game.debug.active)
        {
            this.debugPanel = this.game.debug.panel.addFolder({
                title: '🌸 Flowers',
                expanded: false,
            })
        }

        this.setColors()
        // this.setOne()
        this.setClusters()
        
        this.setGeometry()
        this.setMaterial()
        this.setInstancedMesh()

        this.game.ticker.events.on('tick', () =>
        {
            this.update()
        })
    }

    setColors()
    {
        this.colors = {}
        this.colors.presets = [
            new THREE.Color('#ffffff'),
            new THREE.Color('#cc99ff'),
            new THREE.Color('#ffb037'),
            new THREE.Color('#a0d5d3'),
            new THREE.Color('#cef582'),
        ]

        this.colors.array = []

        for(const _preset of this.colors.presets)
        {
            if(this.game.debug.active)
                this.game.debug.addThreeColorBinding(this.debugPanel, _preset, 'color').on('change', () => { this.colors.updateArray() })
        }

        this.colors.updateArray = () =>
        {
            let i = 0
            for(const _preset of this.colors.presets)
            {
                _preset.toArray(this.colors.array, i * 3)
                i++
            }
        }

        this.colors.updateArray()

        this.colors.uniform = uniformArray(this.colors.array)

        this.colors.emissiveIntensity = uniform(float(0))
    }

    setOne()
    {
        this.transformMatrices = []
        const object = new THREE.Object3D()
        object.position.set(0, 0.4, 4)
        object.scale.set(1, 1, 1)
        
        object.updateMatrix()

        this.transformMatrices.push(object.matrix)
    }

    setClusters()
    {
        this.transformMatrices = []

        this.colorIndices = []

        let i = 0
        for(const reference of this.game.resources.flowersReferencesModel.scene.children)
        {
            const clusterPosition = reference.position

            const colorIndex = i % this.colors.presets.length

            const clusterCount = 3 + Math.floor(Math.random() * 8)
            // const clusterCount = 1
            for(let j = 0; j < clusterCount; j++)
            {
                // Transform matrix
                const object = new THREE.Object3D()
                
                object.rotation.y = Math.PI * 2 * Math.random()

                object.position.set(
                    clusterPosition.x + (Math.random() - 0.5) * 3,
                    clusterPosition.y,
                    clusterPosition.z + (Math.random() - 0.5) * 3
                )

                const scale = 0.6 + Math.random() * 0.4
                object.scale.setScalar(scale)
                
                object.updateMatrix()

                this.transformMatrices.push(object.matrix)

                // Color index
                this.colorIndices.push(colorIndex)
            }
            i++
        }
    }

    setGeometry()
    {
        const count = 6
        const planes = []

        const emissiveMultiplierArray = new Float32Array(count * 4)

        for(let i = 0; i < count; i++)
        {
            const plane = new THREE.PlaneGeometry(0.2, 0.2)

            // Position
            const spherical = new THREE.Spherical(
                1 - Math.pow(Math.random(), 3),
                Math.PI * 0.5 * Math.random(),
                Math.PI * 2 * Math.random()
            )
            const position = new THREE.Vector3().setFromSpherical(spherical)

            plane.rotateX(Math.random() * 9999)
            plane.rotateY(Math.random() * 9999)
            plane.rotateZ(Math.random() * 9999)
            plane.translate(
                position.x,
                position.y * 0.5,
                position.z
            )

            // Emissiveness
            const emissiveMultiplier = 0.5 + (i / count) * 0.5
            emissiveMultiplierArray[i * 4 + 0] = emissiveMultiplier
            emissiveMultiplierArray[i * 4 + 1] = emissiveMultiplier
            emissiveMultiplierArray[i * 4 + 2] = emissiveMultiplier
            emissiveMultiplierArray[i * 4 + 3] = emissiveMultiplier

            // Save
            planes.push(plane)
        }

        // Merge all planes
        this.geometry = mergeGeometries(planes)

        // Remove unsused attributes
        this.geometry.deleteAttribute('uv')

        // Add attribute
        this.geometry.setAttribute('emissiveMultiplier', new THREE.Float32BufferAttribute(emissiveMultiplierArray, 1))
    
    }

    setMaterial()
    {
        // this.material = new THREE.MeshNormalNodeMaterial({ wireframe: false })
        // this.material = new THREE.MeshLambertNodeMaterial({ wireframe: true })
        this.material = new THREE.MeshLambertNodeMaterial({ side: THREE.DoubleSide })
    
        // Received shadow position
        const shadowOffset = uniform(0.25)
        this.material.shadowPositionNode = positionLocal.add(this.game.lighting.directionUniform.mul(shadowOffset))

        // Position
        const wind = this.game.wind.offsetNode([positionLocal.xz])
        const multiplier = positionLocal.y.clamp(0, 1).mul(1)

        this.material.positionNode = Fn( ( { object } ) =>
        {
            instance(object.count, this.instanceMatrix).append()

            return positionLocal.add(vec3(wind.x, 0, wind.y).mul(multiplier))
        })()

        // Shadow receive
        const totalShadows = this.game.lighting.addTotalShadowToMaterial(this.material)

        // Output
        this.material.outputNode = Fn(() =>
        {
            const colorIndex = instancedBufferAttribute(this.instanceColorIndex, 'float', 1)
            colorIndex.setUsage(THREE.StaticDrawUsage)
            const baseColor = vec3(
                this.colors.uniform.element(colorIndex.mul(3).add(0)),
                this.colors.uniform.element(colorIndex.mul(3).add(1)),
                this.colors.uniform.element(colorIndex.mul(3).add(2))
            )

            const lightOutputColor = this.game.lighting.lightOutputNodeBuilder(baseColor, normalWorld, totalShadows, true, false)

            const baseLuminance = luminance(baseColor)
            const emissiveMultiplier = attribute('emissiveMultiplier')
            const emissiveColor = baseColor.div(baseLuminance).mul(2)

            return mix(lightOutputColor, emissiveColor, this.colors.emissiveIntensity.mul(emissiveMultiplier))
            // return vec4(vec3(emissiveColor), 1)
        })()
    }

    setInstancedMesh()
    {
        this.mesh = new THREE.Mesh(this.geometry, this.material)
        this.mesh.position.y = - 0.25
        this.mesh.castShadow = true
        this.mesh.receiveShadow = true
        this.mesh.count = this.transformMatrices.length
        this.mesh.frustumCulled = false
        this.game.scene.add(this.mesh)

        this.instanceMatrix = new THREE.InstancedBufferAttribute(new Float32Array(this.mesh.count * 16), 16)
        this.instanceMatrix.setUsage(THREE.StaticDrawUsage)

        this.instanceColorIndex = new THREE.InstancedBufferAttribute(new Float32Array(this.colorIndices), 1)
        this.instanceColorIndex.setUsage(THREE.StaticDrawUsage)
        
        let i = 0
        for(const _transformMatrix of this.transformMatrices)
        {
            _transformMatrix.toArray(this.instanceMatrix.array, i * 16)
            i++
        }
    }

    update()
    {
        const intensityStart = smoothstep(this.game.dayCycles.progress, 0.25, 0.4)
        const intensityEnd = smoothstep(this.game.dayCycles.progress, 0.75, 0.6)

        this.colors.emissiveIntensity.value = Math.min(intensityStart, intensityEnd)
    }
}