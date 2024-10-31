import BindGroup from '../cores/BindGroup.js'
import BindGroupLayout from '../cores/BindGroupLayout.js'

class BaseMaterial {
    constructor(name) {
        this.name = name
        this.isMaterial = true
        this.isBind = false
        this.uuid = crypto.randomUUID()
        
        this.buffers = []
        this.textures = []
        this.samplers = []

        this.cullMode = "back"
        this.topology = "triangle-list"
        this.fragmentEnabled = true
        this.depthWriteEnabled = true
        this.depthFormat = "depth24plus-stencil8"
        this.depthCompare = "less"

        this.blend = false
        this.blendColorOp = "add"
        this.blendColorSrcFactor = "one"
        this.blendColorDstFactor = "zero"
        this.blendAlphaOp = "add"
        this.blendAlphaSrcFactor = "one"
        this.blendAlphaDstFactor = "zero"

        this.bindGroup = new BindGroup()
        this.bindGroupLayout = new BindGroupLayout()

        this.shader = null
        this.shaderModule = null
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