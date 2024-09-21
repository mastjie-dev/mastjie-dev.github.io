import BindGroup from "../cores/BindGroup"
import BindGroupLayout from "../cores/BindGroupLayout"

class Compute {
    constructor() {
        this.name = ""
        this.textures = []
        this.buffers = []

        this.shader = null
        this.shaderModule = null

        this.pipeline = null
        this.workgroups = [1, 1, 1]

        this.bindGroup = new BindGroup()
        this.bindGroupLayout = new BindGroupLayout()
    }

    setWorkgroups(x, y = 1, z = 1) {
        this.workgroups = [x, y, z]
    }

    setPipeline(pipeline) {
        this.pipeline = pipeline
    }

    addTexture(texture) {
        this.textures.push(texture)
    }

    addBuffer(buffer) {
        this.buffers.push(buffer)
    }
}

export default Compute