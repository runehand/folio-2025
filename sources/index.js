import * as THREE from 'three/webgpu'
import CameraControls from 'camera-controls'
CameraControls.install( { THREE: THREE } )

const scene = new THREE.Scene()
const renderer = new THREE.WebGPURenderer()
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.domElement.classList.add('experience')
document.body.append(renderer.domElement)

const dummy = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshBasicMaterial({ color: 0xff0000 })
)
scene.add(dummy)

const camera = new THREE.PerspectiveCamera(25, window.innerWidth / window.innerHeight, 0.1, 100)
camera.position.set(1, 2, 3)
scene.add(camera)

const cameraControls = new CameraControls(camera, renderer.domElement)

let lastTime = 0
const tick = (time) =>
{
    const delta = time - lastTime
    lastTime = time
    
    cameraControls.update(delta / 1000)
    renderer.renderAsync(scene, camera)

    requestAnimationFrame(tick)
}

tick()