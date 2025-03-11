import GeometryLibs from "./GeometryLibs.js"
import Mesh from "./Mesh.js"
import RenderPassDescriptor from "../cores/RenderPassDescriptor.js"

class PostProcessing {
    constructor(material) {
        material.cullMode = "none"
        material.depthWriteEnabled = false

        const geometry = GeometryLibs.createPlane(2, 2)
        geometry.attributes.splice(1, 1)
        geometry.createVertexBufferLayout()

        this.mesh = new Mesh(geometry, material)
        this.rpDescriptor = new RenderPassDescriptor()
        this.rpDescriptor.disableDepthStencilAttachment()
        this.pipeline = null
    }

    render(encoder, textureView) {
        this.rpDescriptor.setCAView(textureView)
        const pass = encoder.beginRenderPass(this.rpDescriptor.get())

        pass.setPipeline(this.pipeline)
        pass.setBindGroup(0, this.mesh.material.bindGroup.GPUBindGroup)
        pass.setVertexBuffer(0, this.mesh.geometry.attributes[0].GPUBuffer)
        pass.setVertexBuffer(1, this.mesh.geometry.attributes[1].GPUBuffer)
        pass.setIndexBuffer(
            this.mesh.geometry.index.GPUBuffer,
            this.mesh.geometry.index.format
        )
        pass.drawIndexed(this.mesh.geometry.index.length)
        pass.end()
    }
}

export default PostProcessing