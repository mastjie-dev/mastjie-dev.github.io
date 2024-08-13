import BindGroup from '../cores/BindGroup.js'
import BindGroupLayout from '../cores/BindGroupLayout.js'

class BaseMaterial {
    constructor(name) {
        this.name = name
        this.isMaterial = true
        
        this.buffers = []
        this.textures = []
        this.samplers = []

        this.cullMode = "back"
        this.topology = "triangle-list"
        this.fragmentEnabled = true
        this.depthWriteEnabled = true
        this.depthFormat = "depth24plus-stencil8"
        this.depthCompare = "less"

        this.bindGroup = new BindGroup()
        this.bindGroupLayout = new BindGroupLayout()
    }

    addBuffer(bufferCore) {
        this.buffers.push(bufferCore)
    }

    addTexture(textureCore) {
        this.textures.push(textureCore)
    }

    addSampler(sampler) {
        this.samplers.push(sampler)
    }
}

export default BaseMaterial