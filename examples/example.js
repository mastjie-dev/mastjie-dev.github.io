import WebGPUInstance from '../cores/WebGPUInstance.js'
import { DepthTexture } from '../cores/TextureCore.js'
import RenderPassDescriptor from '../cores/RenderPassDescriptor.js'

import Scene from '../scenes/Scene.js'
import Mesh from '../scenes/Mesh.js'
import GeometryLibs from '../scenes/GeometryLibs.js'
import MaterialLibs from '../scenes/MaterialLibs.js'
import { PerspectiveCamera } from '../scenes/Camera.js'
import Vector3 from '../math/Vector3.js'
import Vector2 from '../math/Vector2.js'
import Helper from '../scenes/Helper.js'
import GLTFLoader from '../loader/gltf.js'
import CameraControl from '../scenes/Controls.js'

import GUI from 'https://cdn.jsdelivr.net/npm/lil-gui@0.20/+esm';

async function main() {
    const width = window.innerWidth
    const height = window.innerHeight
    const canvas = document.createElement("canvas")
    canvas.width = width
    canvas.height = height
    canvas.style.display = "block"
    const canvasFormat = navigator.gpu.getPreferredCanvasFormat()

    const instance = new WebGPUInstance()
    await instance.init()

    const context = canvas.getContext("webgpu")
    context.configure({
        device: instance.device,
        format: canvasFormat
    })

    const mainCamera = new PerspectiveCamera(50, width / height, .1, 1000)
    mainCamera.position.set(10, 20, 20)

    const boxGeo = GeometryLibs.createBox(2, 2, 2, 1, 1, 1)
    const sphereGeo = GeometryLibs.createSphereCube(3, 24)

    const unlitMaterial = MaterialLibs.unlit({ color: new Vector3(0, 0, 1) })

    const box = new Mesh(boxGeo, unlitMaterial, "box")
    const sphere = new Mesh(sphereGeo, unlitMaterial, "sphere")
    const grid = Helper.grid(100, 5)

    const gltfLoader = new GLTFLoader()
    const gltf = await gltfLoader.load("../public/gltf", "monkey.gltf")
    const robot = gltf[0]
    
    box.scale.setUniform(2)

    const scene = new Scene()
    scene.addNode(box)
    scene.addNode(grid)

    const groups = instance.bindScene(scene, mainCamera)

    const control = new CameraControl(mainCamera)

    const depthTexture = new DepthTexture(width, height)
    instance.createTexture(depthTexture)

    const descriptor = new RenderPassDescriptor()
    descriptor.setClearValue(.12, .14, .26, 1)
    descriptor.setDSAView(depthTexture.GPUTexture.createView())

    const render = () => {
        mainCamera.updateViewMatrix()
        instance.writeBuffer(mainCamera.buffer)

        const encoder = instance.createCommandEncoder()

        descriptor.setCAView(context.getCurrentTexture().createView())

        const pass = encoder.beginRenderPass(descriptor.get())
        pass.setBindGroup(2, mainCamera.bindGroup.GPUBindGroup)
        pass.setBindGroup(1, scene.bindGroup.GPUBindGroup)

        for (let group of groups) {
            pass.setPipeline(group.pipeline)
            pass.setBindGroup(0, group.material)

            for (let primitive of group.primitives) {
                let i = 0
                for (let attr of primitive.attributes) {
                    pass.setVertexBuffer(i, attr)
                    ++i
                }

                pass.setIndexBuffer(primitive.indexBuffer, primitive.indexFormat)

                for (let instance of primitive.instances) {
                    pass.setBindGroup(3, instance.transform)
                    pass.drawIndexed(primitive.indexLength, instance.instanceCount)
                }
            }
        }

        pass.end()

        instance.submitEncoder([encoder.finish()])
        // requestAnimationFrame(render)
    }
    requestAnimationFrame(render)

    document.body.appendChild(canvas)

    window.addEventListener("resize", () => {
        const w = window.innerWidth
        const h = window.innerHeight

        canvas.width = w
        canvas.height = h

        mainCamera.aspect = w / h
        mainCamera.updateProjectionMatrix()

        depthTexture.destroy()
        depthTexture.width = w
        depthTexture.height = h

        instance.writeBuffer(mainCamera.buffer).createTexture(depthTexture)

        descriptor.setDSAView(depthTexture.GPUTexture.createView())

        render()
    })

    let mousePress = false
    window.addEventListener("mousedown", () => {
        mousePress = true
    })

    window.addEventListener("mouseup", () => {
        mousePress = false
    })

    const old = new Vector2()
    const dir = new Vector2()
    let zoom = 0
    window.addEventListener("mousemove", e => {
        if (mousePress) {
            const dirX = e.clientX - old.x
            const dirY = e.clientY - old.y

            if (Math.abs(dirX) > 2 || Math.abs(dirY) > 2) {
                dir.set(dirX, dirY).normalize()
                control.update(dir, zoom)
            }

            old.set(e.clientX, e.clientY)
            render()
        }
    })

    window.addEventListener("wheel", e => {
        zoom = Math.sign(e.deltaY)
        control.update(dir, zoom)
        zoom = 0
        render()
    })
}

main()

