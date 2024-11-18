import * as THREE from 'three'
import { Game } from '../Game.js'
import getWind from '../tsl/getWind.js'
import { mix, output, instance, smoothstep, vec4, PI, vertexIndex, rotateUV, time, sin, uv, texture, float, Fn, positionLocal, vec3, transformNormalToView, normalWorld, positionWorld, frontFacing, If } from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { remap } from '../utilities/maths.js'

export class Bushes
{
    constructor(_items)
    {
        this.game = new Game()

        this.items = _items

        this.game.resources.load(
            [
                { path: 'bush/bush-leaves-3.png', type: 'texture', name: 'bushLeaves' },
                { path: 'matcaps/bushOnGreen.png', type: 'texture', name: 'matcapBushOnGreen' },
                { path: 'noises-256x256.png', type: 'texture', name: 'noisesTexture' },
            ],
            (resources) =>
            {
                this.resources = resources
                this.resources.matcapBushOnGreen.colorSpace = THREE.SRGBColorSpace
                this.resources.noisesTexture.wrapS = THREE.RepeatWrapping
                this.resources.noisesTexture.wrapT = THREE.RepeatWrapping
                this.init()
            }
        )
    }

    init()
    {
        this.setGeometry()
        this.setMaterial()
        this.setInstancedMesh()
    }

    setGeometry()
    {
        const count = 80
        const planes = []

        for(let i = 0; i < count; i++)
        {
            const plane = new THREE.PlaneGeometry(0.8, 0.8)

            // Position
            const spherical = new THREE.Spherical(
                1 - Math.pow(Math.random(), 3),
                Math.PI * 2 * Math.random(),
                Math.PI * Math.random()
            )
            const position = new THREE.Vector3().setFromSpherical(spherical)

            plane.rotateZ(Math.random() * 9999)
            plane.rotateY(0)
            plane.translate(
                position.x,
                position.y,
                position.z
            )

            // Normal
            const normal = position.clone().normalize()
            const normalArray = new Float32Array(12)
            for(let i = 0; i < 4; i++)
            {
                const i3 = i * 3

                const position = new THREE.Vector3(
                    plane.attributes.position.array[i3    ],
                    plane.attributes.position.array[i3 + 1],
                    plane.attributes.position.array[i3 + 2],
                )

                const mixedNormal = position.lerp(normal, 0.75)
                
                normalArray[i3    ] = mixedNormal.x
                normalArray[i3 + 1] = mixedNormal.y
                normalArray[i3 + 2] = mixedNormal.z
            }
            
            plane.setAttribute('normal', new THREE.BufferAttribute(normalArray, 3))

            // Save
            planes.push(plane)
        }

        // Merge all planes
        this.geometry = mergeGeometries(planes)
    }

    setMaterial()
    {
        this.material = new THREE.MeshMatcapNodeMaterial({
            // side: THREE.DoubleSide,
            matcap: this.resources.matcapBushOnGreen,
            alphaMap: this.resources.bushLeaves,
            alphaTest: 0.01
        })
    
        const wind = getWind([this.resources.noisesTexture, positionLocal.xz])
        const multiplier = positionLocal.y.clamp(0, 1).mul(1)

        this.material.positionNode = Fn( ( { object } ) =>
        {
            instance(object.count, this.instanceMatrix).append()

            return positionLocal.add(vec3(wind.x, 0, wind.y).mul(multiplier))
        })()


        const totalShadows = float(1).toVar()

        this.material.receivedShadowNode = Fn(([ shadow ]) => 
        {
            totalShadows.mulAssign(shadow)

            return float(1)
        })
        this.material.outputNode = vec4(mix(output.rgb, output.rgb.mul(vec3(0.25, 0.5, 2, 1)), totalShadows.oneMinus()), 1)
    }

    setInstancedMesh()
    {
        this.mesh = new THREE.Mesh(this.geometry, this.material)
        this.mesh.receiveShadow = true
        this.mesh.castShadow = true
        this.mesh.count = this.items.length
        this.mesh.frustumCulled = false
        this.game.scene.add(this.mesh)

        this.instanceMatrix = new THREE.InstancedBufferAttribute(new Float32Array(this.mesh.count * 16), 16)
        this.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
        
        let i = 0
        for(const _item of this.items)
        {
            _item.toArray(this.instanceMatrix.array, i * 16)
            i++
        }
    }
}