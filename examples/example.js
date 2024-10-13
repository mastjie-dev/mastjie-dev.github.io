import WebGPUInstance from '../cores/WebGPUInstance.js'
import { DepthTexture } from '../cores/TextureCore.js'
import PipelineCore from '../cores/PipelineCore.js'
import { RenderPassDescriptorBuilder } from '../cores/Builder.js'

import Mesh from '../scenes/Mesh.js'
import GeometryLibs from '../scenes/GeometryLibs.js'
import MaterialLibs from '../scenes/MaterialLibs.js'
import { PerspectiveCamera } from '../scenes/Camera.js'
import Vector3 from '../math/Vector3.js'

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
    mainCamera.position.set(5, -10, -20)

    const boxGeo = GeometryLibs.createBox(2, 2, 2, 1, 1, 1)
    const gridGeo = GeometryLibs.createGrid(100, 5)

    const unlitMaterial = MaterialLibs.unlit({ color: new Vector3(0, 0, 1) })
    const lineMaterial = MaterialLibs.line()

    const box = new Mesh(boxGeo, unlitMaterial)
    const grid = new Mesh(gridGeo, lineMaterial)

    const pipelineA = new PipelineCore("pipeline A")
    pipelineA.setCamera(mainCamera)
    pipelineA.addMesh(box)

    const pipelineB = new PipelineCore("pipeline B")
    pipelineB.setCamera(mainCamera)
    pipelineB.addMesh(grid)

    instance.bindCamera(mainCamera)
    instance.bindMesh(box, grid)
    instance.createRenderPipeline(pipelineA)
    instance.createRenderPipeline(pipelineB)

    const rpd = RenderPassDescriptorBuilder.start().end()
    const depthTexture = new DepthTexture(width, height)
    instance.createTexture(depthTexture)

    const render = () => {
        const encoder = instance.createCommandEncoder()

        rpd.colorAttachments[0].view = context.getCurrentTexture().createView()
        rpd.depthStencilAttachment.view = depthTexture.GPUTexture.createView()

        const _pass = encoder.beginRenderPass(rpd)

        _pass.setPipeline(pipelineA.instance)
        _pass.setBindGroup(0, unlitMaterial.bindGroup.GPUBindGroup)
        _pass.setBindGroup(1, mainCamera.bindGroup.GPUBindGroup)

        for (let r of pipelineA.primitives) {
            let i = 0
            for (let a of r.geometry.attributes) {
                _pass.setVertexBuffer(i, a.GPUBuffer)
                ++i
            }
            _pass.setIndexBuffer(r.geometry.index.GPUBuffer,
                r.geometry.index.format)

            for (let q of r.meshes) {
                _pass.setBindGroup(2, q.bindGroup.GPUBindGroup)
                _pass.drawIndexed(r.geometry.index.length)
            }
        }

        _pass.setPipeline(pipelineB.instance)
        _pass.setBindGroup(0, lineMaterial.bindGroup.GPUBindGroup)
        for (let l of pipelineB.primitives) {
            let i = 0
            for (let a of l.geometry.attributes) {
                _pass.setVertexBuffer(i, a.GPUBuffer)
                ++i
            }

            _pass.setIndexBuffer(l.geometry.index.GPUBuffer,
                l.geometry.index.format)

            for (let m of l.meshes) {
                _pass.setBindGroup(2, m.bindGroup.GPUBindGroup)
                _pass.drawIndexed(l.geometry.index.length)
            }            
        }

        _pass.end()

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

