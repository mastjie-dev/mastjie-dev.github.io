
import NodeCore from './NodeCore'
import BindGroup from '../cores/BindGroup'
import BindGroupLayout from '../cores/BindGroupLayout'
import BufferCore from '../cores/BufferCore'
import VARS from '../cores/VARS'

class Mesh extends NodeCore {
    constructor(geometry, material, shaderModule) {
        super("mesh")
        this.name = ""
        this.isMesh = true
        this.geometry = geometry
        this.material = material
        this.shaderModule = shaderModule

        this.buffer = new BufferCore("mesh", "uniform", new Float32Array(16), VARS.Buffer.Uniform)

        this.bindGroup = new BindGroup()
        this.bindGroupLayout = new BindGroupLayout
    }

    updateBuffer() {
        this.buffer.data.set(this.worldMatrix.elements)
    }

    update() {
        this.updateLocalMatrix()
        this.updateWorldMatrix()
        // this.updateNormalMatrix()
        this.updateBuffer()
    }
}

export default Mesh