import WebGPUInstance from '../cores/WebGPUInstance.js'
import { DepthTexture } from '../cores/TextureCore.js'
import { RenderPassDescriptorBuilder } from '../cores/Builder.js'

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
    mainCamera.position.set(5, 10, 20)

    const boxGeo = GeometryLibs.createBox(2, 2, 2, 1, 1, 1)
    const sphereGeo = GeometryLibs.createSphereCube(1.5, 12)
    const gridGeo = GeometryLibs.createGrid(100, 5)

    const unlitMaterial = MaterialLibs.unlit({ color: new Vector3(0, 0, 1) })
    const lineMaterial = MaterialLibs.line()

    const box = new Mesh(boxGeo, unlitMaterial, "box")
    const left = new Mesh(sphereGeo, unlitMaterial, "left")
    const right = new Mesh(sphereGeo, unlitMaterial, "right")
    const grid = new Mesh(gridGeo, lineMaterial, "grid")

    const gltfLoader = new GLTFLoader()
    const gltf = await gltfLoader.load("../public/gltf", "helmet.gltf")
    // const robot = gltf[0]
    // robot.scale.setUniform(2)

    right.position.set(5, 5, 0)
    left.position.set(-5, 5, 0)
    box.addChild(left)
    box.addChild(right)

    const scene = new Scene()
    scene.add(box)
    scene.add(grid)

    const renderObjects = instance.bindScene(scene, mainCamera)
    console.log(renderObjects)

    const depthTexture = new DepthTexture(width, height)
    instance.createTexture(depthTexture)

    const rpd = RenderPassDescriptorBuilder.start().end()
    rpd.colorAttachments[0].clearValue = [.5, .5, .5, 1]

    const render = () => {
        const encoder = instance.createCommandEncoder()

        rpd.colorAttachments[0].view = context.getCurrentTexture().createView()
        rpd.depthStencilAttachment.view = depthTexture.GPUTexture.createView()

        const pass = encoder.beginRenderPass(rpd)
        pass.setBindGroup(1, mainCamera.bindGroup.GPUBindGroup)

        for (let obj of renderObjects) {
            pass.setPipeline(obj.instance)
            pass.setBindGroup(0, obj.material.bindGroup.GPUBindGroup)

            for (let primitive of obj.primitives) {
                let i = 0
                for (let attr of primitive.geometry.attributes) {
                    pass.setVertexBuffer(i, attr.GPUBuffer)
                    i++
                }

                pass.setIndexBuffer(primitive.geometry.index.GPUBuffer,
                    primitive.geometry.index.format)
                
                for (let mesh of primitive.meshes) {
                    pass.setBindGroup(2, mesh.bindGroup.GPUBindGroup)
                    pass.drawIndexed(primitive.geometry.index.length)
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

