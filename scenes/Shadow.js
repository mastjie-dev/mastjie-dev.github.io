import Vector3 from "../math/Vector3.js"
import Matrix4 from "../math/Matrix4.js"
import BufferCore from "../cores/BufferCore.js"
import VARS from "../cores/VARS"
import BindGroup from "../cores/BindGroup.js"
import BindGroupLayout from "../cores/BindGroupLayout.js"

class DirectionalShadow {
    constructor(left, right, bottom, top, near, far, position) {
        this.left = left
        this.right = right
        this.bottom = bottom
        this.top = top
        this.near = near
        this.far = far
        
        this.position = new Vector3().copy(position)
        this.target = new Vector3()


        this.projectionMatrix = new Matrix4()
        this.viewMatrix = new Matrix4()

        this.buffer = new BufferCore(
            "directionalShadow", "uniform", new Float32Array(36), VARS.Buffer.Uniform)

        this.bindGroup = new BindGroup()
        this.bindGroupLayout = new BindGroupLayout()

        this.updateProjectionMatrix()
        this.updateViewMatrix()
    }

    updateProjectionMatrix() {
        this.projectionMatrix
            .orthographic(this.left, this.right, this.bottom, this.top, this.near, this.far)
        this.buffer.data.set(this.projectionMatrix.elements)
    }

    updateViewMatrix() {
        const up = new Vector3(0, -1, 0)
        this.viewMatrix.lookAt(this.position, this.target, up)
        this.buffer.data.set(this.viewMatrix.elements, 16)

        const position = this.position.toArray()
        position.push(0)
        this.buffer.data.set(position, 32)
    }
}

export { DirectionalShadow }