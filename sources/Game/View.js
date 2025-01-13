import * as THREE from 'three/webgpu'
import CameraControls from 'camera-controls'
import { Game } from './Game.js'
import { clamp, lerp, smoothstep } from './utilities/maths.js'
import { mix, uniform, time, vec4, Fn, positionGeometry, attribute } from 'three/tsl'

CameraControls.install( { THREE: THREE } )

export class View
{
    static DEFAULT_MODE = 1
    static FREE_MODE = 2

    constructor()
    {
        this.game = Game.getInstance()
        
        this.mode = View.DEFAULT_MODE
        this.position = new THREE.Vector3()

        if(this.game.debug.active)
        {
            this.debugPanel = this.game.debug.panel.addFolder({
                title: '📷 View',
                expanded: false,
            })

            this.debugPanel.addBinding(
                this,
                'mode',
                {
                    options:
                    {
                        default: View.DEFAULT_MODE,
                        free: View.FREE_MODE,
                    }
                }
            ).on('change', () => 
            {
                this.focusPoint.smoothedPosition.copy(this.focusPoint.position)

                this.freeMode.enabled = this.mode === View.FREE_MODE
                this.freeMode.setTarget(this.focusPoint.position.x, this.focusPoint.position.y, this.focusPoint.position.z)
                this.freeMode.setPosition(this.camera.position.x, this.camera.position.y, this.camera.position.z)
            })
        }

        this.setFocusPoint()
        this.setZoom()
        this.setSpherical()
        this.setCameras()
        this.setOptimalArea()
        this.setFree()
        this.setSpeedLines()

        this.game.time.events.on('tick', () =>
        {
            this.update()
        }, 4)

        this.update()

        this.game.viewport.events.on('change', () =>
        {
            this.resize()
        })
    }

    setFocusPoint()
    {
        this.focusPoint = {}
        this.focusPoint.trackedPosition = new THREE.Vector3()
        this.focusPoint.isTracking = true
        this.focusPoint.position = new THREE.Vector3()
        this.focusPoint.smoothedPosition = new THREE.Vector3()

        this.game.inputs.events.on('keyDown', () =>
        {
            this.focusPoint.isTracking = true
        })

        this.focusPoint.helper = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicNodeMaterial({ color: '#ff0000', wireframe: true }))
        this.focusPoint.helper.visible = false
        this.game.scene.add(this.focusPoint.helper)
    }

    setOptimalArea()
    {
        this.optimalArea = {}
        this.optimalArea.position = new THREE.Vector3()
        this.optimalArea.nearPosition = new THREE.Vector3()
        this.optimalArea.farPosition = new THREE.Vector3()
        this.optimalArea.nearDistance = null
        this.optimalArea.farDistance = null
        this.optimalArea.radius = 0
        this.optimalArea.raycaster = new THREE.Raycaster()

        this.optimalArea.floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)

        this.optimalArea.helpers = {}
        this.optimalArea.helpers.center = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicNodeMaterial({ color: '#00ff00', wireframe: false }))
        this.optimalArea.helpers.near = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicNodeMaterial({ color: '#ff0000', wireframe: false }))
        this.optimalArea.helpers.far = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicNodeMaterial({ color: '#0000ff', wireframe: false }))

        this.optimalArea.helpers.center.visible = false
        this.optimalArea.helpers.near.visible = false
        this.optimalArea.helpers.far.visible = false

        this.game.scene.add(
            this.optimalArea.helpers.center,
            this.optimalArea.helpers.near,
            this.optimalArea.helpers.far
        )

        this.optimalArea.update = () =>
        {
            this.defaultCamera.updateProjectionMatrix()

            // First near/far diagonal
            this.optimalArea.raycaster.setFromCamera(new THREE.Vector2(1, -1), this.defaultCamera)
            this.optimalArea.raycaster.ray.intersectPlane(this.optimalArea.floorPlane, this.optimalArea.nearPosition)
            this.optimalArea.helpers.near.position.copy(this.optimalArea.nearPosition)

            this.optimalArea.raycaster.setFromCamera(new THREE.Vector2(-1, 1), this.defaultCamera)
            this.optimalArea.raycaster.ray.intersectPlane(this.optimalArea.floorPlane, this.optimalArea.farPosition)
            this.optimalArea.helpers.far.position.copy(this.optimalArea.farPosition)

            const centerA = this.optimalArea.nearPosition.clone().lerp(this.optimalArea.farPosition, 0.5)

            // Second near/far diagonal
            this.optimalArea.raycaster.setFromCamera(new THREE.Vector2(-1, -1), this.defaultCamera)
            this.optimalArea.raycaster.ray.intersectPlane(this.optimalArea.floorPlane, this.optimalArea.nearPosition)
            this.optimalArea.helpers.near.position.copy(this.optimalArea.nearPosition)

            this.optimalArea.raycaster.setFromCamera(new THREE.Vector2(1, 1), this.defaultCamera)
            this.optimalArea.raycaster.ray.intersectPlane(this.optimalArea.floorPlane, this.optimalArea.farPosition)
            this.optimalArea.helpers.far.position.copy(this.optimalArea.farPosition)

            const centerB = this.optimalArea.nearPosition.clone().lerp(this.optimalArea.farPosition, 0.5)

            // Center between the two fiagonal centers
            this.optimalArea.position = centerA.clone().lerp(centerB, 0.5)
            this.optimalArea.helpers.center.position.copy(this.optimalArea.position)

            // Radius
            const optimalRadius = this.optimalArea.position.distanceTo(this.optimalArea.farPosition)

            if(optimalRadius > this.optimalArea.radius)
                this.optimalArea.radius = optimalRadius

            // Distances
            if(this.optimalArea.nearDistance == null)
            {
                this.optimalArea.raycaster.setFromCamera(new THREE.Vector2(0, -1), this.defaultCamera)
                this.optimalArea.raycaster.ray.intersectPlane(this.optimalArea.floorPlane, this.optimalArea.nearPosition)

                this.optimalArea.raycaster.setFromCamera(new THREE.Vector2(0, 1), this.defaultCamera)
                this.optimalArea.raycaster.ray.intersectPlane(this.optimalArea.floorPlane, this.optimalArea.farPosition)
                
                this.optimalArea.nearDistance = this.camera.position.distanceTo(this.optimalArea.nearPosition)
                this.optimalArea.farDistance = this.camera.position.distanceTo(this.optimalArea.farPosition)
            }
        }
    }

    setZoom()
    {
        this.zoom = {}
        this.zoom.baseRatio = 0
        this.zoom.ratio = this.zoom.baseRatio
        this.zoom.smoothedRatio = this.zoom.baseRatio
        this.zoom.speedAmplitude = - 0.4
        this.zoom.speedEdgeLow = 5
        this.zoom.speedEdgeHigh = 40
        this.zoom.sensitivity = 0.05

        this.game.inputs.events.on('zoom', (zoomValue) =>
        {
            this.zoom.baseRatio -= zoomValue * this.zoom.sensitivity
            this.zoom.baseRatio = clamp(this.zoom.baseRatio, 0, 1)
        })

        if(this.game.debug.active)
        {
            const zoomDebugPanel = this.debugPanel.addFolder({
                title: 'Zoom',
                expanded: false,
            })
            zoomDebugPanel.addBinding(this.zoom, 'speedAmplitude', { min: 0, max: 1, step: 0.001 })
            zoomDebugPanel.addBinding(this.zoom, 'speedEdgeLow', { min: 0, max: 100, step: 0.001 })
            zoomDebugPanel.addBinding(this.zoom, 'speedEdgeHigh', { min: 0, max: 100, step: 0.001 })
            zoomDebugPanel.addBinding(this.zoom, 'sensitivity', { min: 0, max: 0.5, step: 0.0001 })
        }
    }

    setSpherical()
    {
        this.spherical = {}
        this.spherical.phi = Math.PI * 0.32
        this.spherical.theta = Math.PI * 0.25

        this.spherical.radius = {}
        this.spherical.radius.min = 15
        this.spherical.radius.max = 30
        this.spherical.radius.current = lerp(this.spherical.radius.min, this.spherical.radius.max, 1 - this.zoom.smoothedRatio)

        this.spherical.offset = new THREE.Vector3()
        this.spherical.offset.setFromSphericalCoords(this.spherical.radius.current, this.spherical.phi, this.spherical.theta)

        if(this.game.debug.active)
        {
            const sphericalDebugPanel = this.debugPanel.addFolder({
                title: 'Spherical',
                expanded: false,
            })
            sphericalDebugPanel.addBinding(this.spherical, 'phi', { min: 0, max: Math.PI * 0.5, step: 0.001 })
            sphericalDebugPanel.addBinding(this.spherical, 'theta', { min: - Math.PI, max: Math.PI, step: 0.001 })
            sphericalDebugPanel.addBinding(this.spherical.radius, 'min', { label: 'zoomMin', min: 0, max: 100, step: 0.001 })
            sphericalDebugPanel.addBinding(this.spherical.radius, 'max', { label: 'zoomMax', min: 0, max: 100, step: 0.001 })
        }
    }

    setCameras()
    {
        this.camera = new THREE.PerspectiveCamera(25, this.game.viewport.ratio, 0.1, 1000)
        this.camera.position.setFromSphericalCoords(this.spherical.radius.current, this.spherical.phi, this.spherical.theta)

        this.defaultCamera = this.camera.clone()
        this.freeCamera = this.camera.clone()

        this.game.scene.add(this.camera, this.defaultCamera, this.freeCamera)
    }

    setFree()
    {
        this.freeMode = new CameraControls(this.freeCamera, this.game.domElement)
        this.freeMode.enabled = this.mode === View.FREE_MODE
        this.freeMode.smoothTime = 0.075
        this.freeMode.draggingSmoothTime = 0.075
        this.freeMode.dollySpeed = 0.2
    }

    setSpeedLines()
    {
        this.speedLines = {}
        this.speedLines.strength = 0
        this.speedLines.smoothedStrength = uniform(this.speedLines.strength)
        this.speedLines.worldTarget = new THREE.Vector3()
        this.speedLines.clipSpaceTarget = uniform(new THREE.Vector3())
        this.speedLines.speed = uniform(25)

        const linesCount = 30
        const positionArray = new Float32Array(linesCount * 3 * 3)
        const timeRandomnessArray = new Float32Array(linesCount * 3)
        const distanceArray = new Float32Array(linesCount * 3)
        const tipnessArray = new Float32Array(linesCount * 3)
        const maxDistance = Math.hypot(1, 1)

        for(let i = 0; i < linesCount; i++)
        {
            const i9 = i * 9
            const i3 = i * 3

            // Base vertex
            const vertexMiddle = new THREE.Vector2(0, 1)
            const angle = Math.PI * 2 * Math.random()
            vertexMiddle.rotateAround(new THREE.Vector2(), angle)

            // Side vertices 
            const thickness = Math.random() * 0.01 + 0.002
            const vertexLeft = vertexMiddle.clone().rotateAround(new THREE.Vector2(), thickness)
            const vertexRight = vertexMiddle.clone().rotateAround(new THREE.Vector2(), - thickness)
            
            // Distance to center
            vertexMiddle.multiplyScalar(maxDistance)
            vertexLeft.multiplyScalar(maxDistance)
            vertexRight.multiplyScalar(maxDistance)

            // Position
            positionArray[i9 + 0] = vertexLeft.x
            positionArray[i9 + 1] = vertexLeft.y
            positionArray[i9 + 2] = 0
            
            positionArray[i9 + 3] = vertexMiddle.x
            positionArray[i9 + 4] = vertexMiddle.y
            positionArray[i9 + 5] = 0

            positionArray[i9 + 6] = vertexRight.x
            positionArray[i9 + 7] = vertexRight.y
            positionArray[i9 + 8] = 0

            // Time randomness
            timeRandomnessArray[i3 + 0] = i
            timeRandomnessArray[i3 + 1] = i
            timeRandomnessArray[i3 + 2] = i

            // Distance
            const distance = Math.random() * 0.4 + 0.4
            distanceArray[i3 + 0] = distance
            distanceArray[i3 + 1] = distance
            distanceArray[i3 + 2] = distance

            // Tipness
            tipnessArray[i3 + 0] = 0
            tipnessArray[i3 + 1] = 1
            tipnessArray[i3 + 2] = 0
        }

        this.speedLines.geometry = new THREE.BufferGeometry()
        this.speedLines.geometry.setAttribute('position', new THREE.Float32BufferAttribute(positionArray, 3))
        this.speedLines.geometry.setAttribute('timeRandomness', new THREE.Float32BufferAttribute(timeRandomnessArray, 1))
        this.speedLines.geometry.setAttribute('distance', new THREE.Float32BufferAttribute(distanceArray, 1))
        this.speedLines.geometry.setAttribute('tipness', new THREE.Float32BufferAttribute(tipnessArray, 1))

        this.speedLines.material = new THREE.MeshBasicNodeMaterial({ wireframe: false, depthWrite: false, depthTest: false })
        this.speedLines.material.vertexNode = Fn(() =>
        {
            const timeRandomness = attribute('timeRandomness')
            const distance = attribute('distance')
            const tipness = attribute('tipness')
            
            const osciliation = time.mul(this.speedLines.speed).add(timeRandomness).sin().div(2).add(0.5)
            const newPosition = mix(positionGeometry.xy, this.speedLines.clipSpaceTarget.xy, tipness.mul(osciliation).mul(distance).mul(this.speedLines.smoothedStrength))
            
            return vec4(newPosition, 0, 1)
        })()
        this.speedLines.material.outputNode = vec4(1)

        this.speedLines.mesh = new THREE.Mesh(this.speedLines.geometry, this.speedLines.material)
        this.speedLines.mesh.frustumCulled = false
        this.speedLines.mesh.renderOrder = 10
        this.game.scene.add(this.speedLines.mesh)

        // Debug
        if(this.game.debug.active)
        {
            const folder = this.debugPanel.addFolder({
                title: 'Speed lines',
                expanded: false,
            })
            folder.addBinding(this.speedLines, 'strength', { label: 'strength', min: 0, max: 1, step: 0.001 })
            folder.addBinding(this.speedLines.speed, 'value', { label: 'speed', min: 0, max: 100, step: 0.001 })
        }
    }

    resize()
    {
        this.camera.aspect = this.game.viewport.width / this.game.viewport.height
        this.camera.updateProjectionMatrix()

        this.defaultCamera.aspect = this.game.viewport.width / this.game.viewport.height
        this.defaultCamera.updateProjectionMatrix()

        this.freeCamera.aspect = this.game.viewport.width / this.game.viewport.height
        this.freeCamera.updateProjectionMatrix()
    }

    update()
    {
        // Default mode
        if(this.mode === View.DEFAULT_MODE)
        {
            // Focus point
            if(this.game.inputs.pointer.isDown)
            {
                this.focusPoint.isTracking = false
                
                const mapMovement = new THREE.Vector2(this.game.inputs.pointer.delta.x, this.game.inputs.pointer.delta.y)
                mapMovement.rotateAround(new THREE.Vector2(), -this.spherical.theta)
                mapMovement.multiplyScalar(0.01)
                
                this.focusPoint.position.x -= mapMovement.x
                this.focusPoint.position.z -= mapMovement.y
            }
        }

        // Focus point
        if(this.focusPoint.isTracking)
        {
            this.focusPoint.position.x = this.focusPoint.trackedPosition.x
            this.focusPoint.position.z = this.focusPoint.trackedPosition.z
        }

        const newSmoothFocusPoint = this.focusPoint.smoothedPosition.clone().lerp(this.focusPoint.position, this.game.time.delta * 10)
        const smoothFocusPointDelta = newSmoothFocusPoint.clone().sub(this.focusPoint.smoothedPosition)
        const focusPointSpeed = Math.hypot(smoothFocusPointDelta.x, smoothFocusPointDelta.z) / this.game.time.delta
        this.focusPoint.smoothedPosition.copy(newSmoothFocusPoint)
        
        // Default mode
        if(this.mode === View.DEFAULT_MODE)
        {
            // Zoom
            const zoomSpeedRatio = smoothstep(focusPointSpeed, this.zoom.speedEdgeLow, this.zoom.speedEdgeHigh)
            this.zoom.ratio = this.zoom.baseRatio

            if(this.focusPoint.isTracking)
                this.zoom.ratio += this.zoom.speedAmplitude * zoomSpeedRatio

            this.zoom.smoothedRatio = lerp(this.zoom.smoothedRatio, this.zoom.ratio, this.game.time.delta * 10)
        }

        // Radius
        this.spherical.radius.current = lerp(this.spherical.radius.min, this.spherical.radius.max, 1 - this.zoom.smoothedRatio)
        this.spherical.offset.setFromSphericalCoords(this.spherical.radius.current, this.spherical.phi, this.spherical.theta)

        // Position
        this.position.copy(this.focusPoint.smoothedPosition).add(this.spherical.offset)

        // Default camera
        this.defaultCamera.position.copy(this.position)
        this.defaultCamera.lookAt(this.focusPoint.smoothedPosition)

        if(this.mode === View.DEFAULT_MODE)
        {
            this.camera.position.copy(this.defaultCamera.position)
            this.camera.quaternion.copy(this.defaultCamera.quaternion)
        }
        else if(this.mode === View.FREE_MODE)
        {
            this.freeMode.update(this.game.time.delta)
            this.camera.position.copy(this.freeCamera.position)
            this.camera.quaternion.copy(this.freeCamera.quaternion)
        }

        // Cameras matrices
        this.camera.updateMatrixWorld()
        this.defaultCamera.updateMatrixWorld()
        this.freeCamera.updateMatrixWorld()
        
        // Optimal area
        this.optimalArea.update()

        // Speed lines
        this.speedLines.clipSpaceTarget.value.copy(this.speedLines.worldTarget)
        this.speedLines.clipSpaceTarget.value.project(this.camera)

        this.speedLines.smoothedStrength.value = lerp(this.speedLines.smoothedStrength.value, this.speedLines.strength, this.game.time.delta * 2)
    }
}