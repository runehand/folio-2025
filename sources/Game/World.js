import * as THREE from 'three/webgpu'
import { uniform, color, rangeFog } from 'three/webgpu'
import { Game } from './Game.js'
import MeshGridMaterial, { MeshGridMaterialLine } from './Materials/MeshGridMaterial.js'

export class World
{
    constructor()
    {
        this.game = new Game()

        this.scene = new THREE.Scene()
        this.scene.fogNode = rangeFog(color(0x1b191f), 50, 100)

        this.setGround()
        this.setDummy()

        // const axesHelper = new THREE.AxesHelper()
        // this.scene.add(axesHelper)

        this.game.time.events.on('tick', () =>
        {
            this.update()
        }, 4)
    }

    setGround()
    {
        const lines = [
            // new MeshGridMaterialLine(0x444444, 0.1, 0.04),
            new MeshGridMaterialLine(0x705df2, 1, 0.01),
            new MeshGridMaterialLine(0xffffff, 10, 0.002),
        ]

        const uvGridMaterial = new MeshGridMaterial({
            color: 0x1b191f,
            scale: 0.001,
            antialiased: true,
            reference: 'uv', // uv | world
            side: THREE.DoubleSide,
            lines
        })

        const ground = new THREE.Mesh(
            new THREE.PlaneGeometry(1000, 1000),
            uvGridMaterial
        )
        ground.rotation.x = - Math.PI * 0.5
        this.scene.add(ground)

        // Physical ground
        this.game.physics.addEntity({
            type: 'fixed',
            colliders: [ { shape: 'cuboid', parameters: [ 10, 1, 10 ], position: { x: 0, y: - 1.01, z: 0 } } ]
        })
    }
    
    setDummy()
    {
        const dummy = new THREE.Mesh(
            new THREE.BoxGeometry(1, 1, 1),
            new THREE.MeshNormalMaterial()
        )
        this.scene.add(dummy)

        this.game.physics.addEntity(
            {
                type: 'dynamic',
                position: { x: 0, y: 3, z: 0 },
                colliders: [ { shape: 'cuboid', parameters: [ 0.5, 0.5, 0.5 ] } ]
            },
            dummy
        )
    }

    update()
    {
    }
}