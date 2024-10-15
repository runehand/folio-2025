import * as THREE from 'three/webgpu'
import { Game } from './Game.js'

export class Vehicle
{
    constructor()
    {
        this.game = new Game()

        this.setChassis()

        this.controller = this.game.physics.world.createVehicleController(this.chassis.physical.body)

        this.setWheels()

        this.game.time.events.on('tick', () =>
        {
            this.updatePrePhysics()
        }, 1)
        this.game.time.events.on('tick', () =>
        {
            this.updatePostPhysics()
        }, 3)
    }

    setChassis()
    {
        const visual = new THREE.Mesh(
            new THREE.BoxGeometry(1 * 2, 0.5 * 2, 1.5 * 2),
            new THREE.MeshNormalMaterial({ wireframe: true })
        )
        this.game.world.scene.add(visual)
        this.chassis = this.game.physics.addEntity(
            {
                type: 'dynamic',
                shape: 'cuboid',
                position: { x: 0, y: 1, z: 0 },
                colliders: [ { shape: 'cuboid', parameters: [ 1, 0.5, 1.5 ] } ],
                canSleep: false,
                // linearDamping: 0.2
            },
            visual
        )
    }

    setWheels()
    {
        const wheelsSetting = {
            directionCs: new THREE.Vector3(0, -1, 0), // Suspension direction
            axleCs: new THREE.Vector3(-1, 0, 0),      // Rotation axis
            frictionSlip: 4,             // 10.5
            maxSuspensionForce: 6000,    // 6000
            maxSuspensionTravel: 5,      // 5
            radius: 0.5,                 // No default
            sideFrictionStiffness: 0.6,  // 1
            suspensionCompression: 2,    // 0.83
            suspensionRelaxation: 1.88,  // 0.88
            suspensionRestLength: 0.125, // No default
            suspensionStiffness: 30,     // 5.88
            offset: new THREE.Vector3(0.75, -0.2,  0.8), // No default
        }
        const wheelsPositions = [
            new THREE.Vector3(  wheelsSetting.offset.x, wheelsSetting.offset.y,   wheelsSetting.offset.z),
            new THREE.Vector3(  wheelsSetting.offset.x, wheelsSetting.offset.y, - wheelsSetting.offset.z),
            new THREE.Vector3(- wheelsSetting.offset.x, wheelsSetting.offset.y,   wheelsSetting.offset.z),
            new THREE.Vector3(- wheelsSetting.offset.x, wheelsSetting.offset.y, - wheelsSetting.offset.z),
        ]

        this.wheels = {}
        this.wheels.items = []
        this.wheels.engineForce = 0
        this.wheels.steering = 0
        this.wheels.visualSteering = 0

        for(let i = 0; i < 4; i++)
        {
            const basePosition = wheelsPositions[i]
            this.controller.addWheel(basePosition, wheelsSetting.directionCs, wheelsSetting.axleCs, wheelsSetting.suspensionRestLength, wheelsSetting.radius)

            // Don't change
            // this.controller.setWheelAxleCs(i, wheelsSetting.axleCs)
            // this.controller.setWheelDirectionCs(i, wheelsSetting.directionCs)

            // Player controlled
            // this.controller.setWheelBrake(i, )
            // this.controller.setWheelEngineForce(i, )
            // this.controller.setWheelSteering(i, )

            // Can be tweaked
            this.controller.setWheelChassisConnectionPointCs(i, basePosition)
            this.controller.setWheelFrictionSlip(i, wheelsSetting.frictionSlip)
            this.controller.setWheelMaxSuspensionForce(i, wheelsSetting.maxSuspensionForce)
            this.controller.setWheelMaxSuspensionTravel(i, wheelsSetting.maxSuspensionTravel)
            this.controller.setWheelRadius(i, wheelsSetting.radius)
            this.controller.setWheelSideFrictionStiffness(i, wheelsSetting.sideFrictionStiffness)
            this.controller.setWheelSuspensionCompression(i, wheelsSetting.suspensionCompression)
            this.controller.setWheelSuspensionRelaxation(i, wheelsSetting.suspensionRelaxation)
            this.controller.setWheelSuspensionRestLength(i, wheelsSetting.suspensionRestLength)
            this.controller.setWheelSuspensionStiffness(i, wheelsSetting.suspensionStiffness)

            // Visual
            const visual = new THREE.Mesh(
                new THREE.CylinderGeometry(wheelsSetting.radius, wheelsSetting.radius, 0.5, 8),
                new THREE.MeshNormalMaterial({ flatShading: true })
            )
            visual.geometry.rotateZ(Math.PI * 0.5)
            visual.rotation.reorder('YXZ')
            visual.position.copy(basePosition)
            this.chassis.visual.add(visual)
            this.wheels.items.push({ visual, basePosition })
        }
    }

    updatePrePhysics()
    {
        this.wheels.engineForce = 0
        if(this.game.controls.keys.up)
            this.wheels.engineForce = 10
        if(this.game.controls.keys.down)
            this.wheels.engineForce = -10

        this.wheels.steering = 0
        if(this.game.controls.keys.right)
            this.wheels.steering = -0.5
        if(this.game.controls.keys.left)
            this.wheels.steering = 0.5
        this.controller.setWheelSteering(0, this.wheels.steering)
        this.controller.setWheelSteering(2, this.wheels.steering)

        for(let i = 0; i < 4; i++)
        {
            this.controller.setWheelEngineForce(i, this.wheels.engineForce)
            this.controller.setWheelBrake(i, 0.04)
        }
    }

    updatePostPhysics()
    {
        this.wheels.visualSteering += (this.wheels.steering - this.wheels.visualSteering) * this.game.time.delta * 16

        for(let i = 0; i < 4; i++)
        {
            const wheel = this.wheels.items[i]

            wheel.visual.rotation.x += this.wheels.engineForce * 0.01
            wheel.visual.rotation.y = this.wheels.visualSteering

            wheel.visual.position.y = wheel.basePosition.y - this.controller.wheelSuspensionLength(i)
        }
    }
}