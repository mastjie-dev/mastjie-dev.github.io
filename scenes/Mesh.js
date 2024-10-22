
import NodeCore from './NodeCore.js'
import BindGroup from '../cores/BindGroup.js'
import BindGroupLayout from '../cores/BindGroupLayout.js'
import {UniformBuffer} from '../cores/BufferCore.js'
import Matrix4 from '../math/Matrix4.js'

class Mesh extends NodeCore {
    constructor(geometry, material, name="") {
        super(name)
        this.isMesh = true
        this.isBind = false
        this.geometry = geometry
        this.material = material

        this.normalMatrix = new Matrix4()
        this.buffer = new UniformBuffer(new Float32Array(32))

        this.bindGroup = new BindGroup()
        this.bindGroupLayout = new BindGroupLayout
    }

    updateBuffer() {
        this.buffer.data.set(this.worldMatrix.elements)
        this.buffer.data.set(this.normalMatrix.elements, 16)
    }

    updateNormalMatrix() {
      this.normalMatrix
        .copy(this.worldMatrix)
        .inverse()
        .transpose()
    }
}

export default Mesh