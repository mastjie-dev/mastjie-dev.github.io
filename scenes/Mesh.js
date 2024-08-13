
import NodeCore from './NodeCore.js'
import BindGroup from '../cores/BindGroup.js'
import BindGroupLayout from '../cores/BindGroupLayout.js'
import BufferCore from '../cores/BufferCore.js'
import VARS from '../cores/VARS.js'
import Matrix4 from '../math/Matrix4.js'

class Mesh extends NodeCore {
    constructor(geometry, material, shaderModule) {
        super("mesh")
        this.name = ""
        this.isMesh = true
        this.geometry = geometry
        this.material = material
        this.shaderModule = shaderModule

        this.normalMatrix = new Matrix4()
        this.buffer = new BufferCore("mesh", "uniform", new Float32Array(32), VARS.Buffer.Uniform)

        this.bindGroup = new BindGroup()
        this.bindGroupLayout = new BindGroupLayout
    }

    updateBuffer() {
        this.buffer.data.set(this.worldMatrix.elements)
        this.buffer.data.set(this.normalMatrix.elements, 16)
    }

    updateNormalMatrix() {
        
    }

    update() {
        this.localMatrix.identity()
        this.worldMatrix.identity()
        this.updateLocalMatrix()
        this.updateWorldMatrix()
        // this.updateNormalMatrix()
        this.updateBuffer()
    }
}

export default Mesh