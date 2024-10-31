import WebGPUInstance from '../cores/WebGPUInstance.js'
import { DepthTexture } from '../cores/TextureCore.js'
import RenderPassDescriptor from '../cores/RenderPassDescriptor.js'

import Scene from '../scenes/Scene.js'
import Mesh from '../scenes/Mesh.js'
import GeometryLibs from '../scenes/GeometryLibs.js'
import MaterialLibs from '../scenes/MaterialLibs.js'
import { PerspectiveCamera } from '../scenes/Camera.js'
import Vector3 from '../math/Vector3.js'

import GLTFLoader from '../loader/gltf.js'

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
    mainCamera.position.set(0, 10, 20)

    const boxGeo = GeometryLibs.createBox(2, 2, 2, 1, 1, 1)
    const sphereGeo = GeometryLibs.createSphereCube(1.5, 12)
    const gridGeo = GeometryLibs.createGrid(100, 5)

    const unlitMaterial = MaterialLibs.unlit({ color: new Vector3(0, 0, 1) })
    // unlitMaterial.blend = true
    // unlitMaterial.blendColorSrcFactor = "one"
    // unlitMaterial.blendColorDstFactor = "one"

    const lineMaterial = MaterialLibs.line()

    const box = new Mesh(boxGeo, unlitMaterial, "box")
    const left = new Mesh(sphereGeo, unlitMaterial, "left")
    const right = new Mesh(sphereGeo, unlitMaterial, "right")
    const grid = new Mesh(gridGeo, lineMaterial, "grid")

    const gltfLoader = new GLTFLoader()
    const gltf = await gltfLoader.load("../public/gltf", "monkey.gltf")
    const robot = gltf[0]
    robot.scale.setUniform(2)

    right.position.set(5, 5, 0)
    left.position.set(-5, 5, 0)
    box.addChild(left)
    box.addChild(right)

    const scene = new Scene()
    scene.addNode(box)
    scene.addNode(grid)

    const groups = instance.bindScene(scene, mainCamera)

    const depthTexture = new DepthTexture(width, height)
    instance.createTexture(depthTexture)

    const descriptor = new RenderPassDescriptor()
    // descriptor.setClearValue(.6, .3, .3, .5)
    descriptor.setDSAView(depthTexture.GPUTexture.createView())

    const render = () => {
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
    render()
    document.body.appendChild(canvas)

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
        render()
    })
}

main()

