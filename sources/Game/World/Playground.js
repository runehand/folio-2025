import * as THREE from 'three'
import { Game } from '../Game.js'
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

export class Playground
{
    constructor()
    {
        this.game = new Game()

        this.game.entities.addFromModels(
            this.game.resources.playgroundPhysical.scene,
            this.game.resources.playgroundVisual.scene,
            {
                type: 'fixed',
                friction: 0
            }
        )
    }
}