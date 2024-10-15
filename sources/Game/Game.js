import { Controls } from './Controls.js'
import { Physics } from './Physics/Physics.js'
import { PhysicsDebug } from './Physics/PhysicsDebug.js'
import { Rendering } from './Rendering.js'
import { Time } from './Time.js'
import { Vehicle } from './Vehicle.js'
import { View } from './View.js'
import { Viewport } from './Viewport.js'
import { World } from './World.js'

export class Game
{
    constructor()
    {
        // Singleton
        if(Game._instance)
            return Game._instance

        Game._instance = this

        // Setup
        this.domElement = document.querySelector('.game')

        this.controls = new Controls()
        this.time = new Time()
        this.viewport = new Viewport(this.domElement)
        this.physics = new Physics()
        this.world = new World()
        this.physicsDebug = new PhysicsDebug()
        this.view = new View()
        this.rendering = new Rendering()
        this.vehicle = new Vehicle()
    }
}

