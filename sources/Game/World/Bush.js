import * as THREE from 'three'
import { Game } from '../Game.js'
import { texture } from 'three'
import { vec2 } from 'three'
import { vec4 } from 'three'
import { Fn } from 'three'
import { positionGeometry } from 'three'
import { positionLocal } from 'three'
import { vec3 } from 'three'
import { transformNormalToView } from 'three'
import { positionViewDirection } from 'three'
import { sin } from 'three'
import { positionWorld } from 'three'
import { time } from 'three'
import getWind from '../tsl/getWind.js'

export class Bush
{
    constructor()
    {
        this.game = new Game()

        this.game.resources.load(
            [
                { path: 'bush/bushLeaves.png', type: 'texture', name: 'bushLeaves' },
                { path: 'bush/bush.glb', type: 'gltf', name: 'bushModel' },
                { path: 'matcaps/bushOnGreen.png', type: 'texture', name: 'matcapBushOnGreen' },
                { path: 'perlin.png', type: 'texture', name: 'noisesTexture' },
            ],
            (resources) =>
            {
                this.resources = resources
                this.resources.matcapBushOnGreen.colorSpace = THREE.SRGBColorSpace
                this.init()
            }
        )
    }

    init()
    {
        const geometry = this.resources.bushModel.scene.children[0].geometry

        const material = new THREE.MeshBasicNodeMaterial({ side: THREE.DoubleSide })
        // const material = new THREE.MeshNormalNodeMaterial({ side: THREE.DoubleSide })
        // const material = new THREE.MeshMatcapNodeMaterial({ side: THREE.DoubleSide, matcap: this.resources.matcapBushOnGreen })
    
        material.positionNode = Fn(() =>
        {
            // const wind = getWind(this.resources.noisesTexture, positionWorld.xz)
            const wind = getWind([this.resources.noisesTexture, positionWorld.xz])
            const windX = sin(time)
            const windZ = sin(time.mul(1.2))
            const multiplier = positionWorld.y.mul(0.05)
            const windPosition = positionLocal.add(vec3(wind.x, 0, wind.y).mul(multiplier))
            return windPosition
        })()

        material.colorNode = Fn(() =>
        {
            const x = vec3(positionViewDirection.z, 0, positionViewDirection.x.negate()).normalize()
            const y = positionViewDirection.cross(x)

            const customTransformedNormalView = transformNormalToView(positionGeometry.normalize())
            const customMatcapUv = vec2(x.dot(customTransformedNormalView), y.dot(customTransformedNormalView) ).mul(0.495).add(0.5)

            const matcapColor = texture(this.resources.matcapBushOnGreen, customMatcapUv)
            const leavesColor = texture(this.resources.bushLeaves)

            leavesColor.r.lessThan(0.5).discard()

            return vec4(matcapColor.rgb, 1)
        })()

        const mesh = new THREE.Mesh(geometry, material)
        mesh.position.set(2, 1, 2)
        mesh.scale.setScalar(1.5)
        this.game.scene.add(mesh)

        // const testSphere = new THREE.Mesh(
        //     new THREE.IcosahedronGeometry(1, 3),
        //     material
        // )
        // testSphere.position.set(2, 1, - 2)
        // this.game.scene.add(testSphere)
    }
}