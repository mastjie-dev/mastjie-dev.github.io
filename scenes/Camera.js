import BindGroup from "../cores/BindGroup.js"
import BindGroupLayout from "../cores/BindGroupLayout.js"
import Matrix4 from "../math/Matrix4.js"
import Vector3 from "../math/Vector3.js"
import NodeCore from './NodeCore.js'
import {UniformBuffer} from "../cores/BufferCore.js"

class Camera extends NodeCore {
    constructor(name) {
        super(name)
        this.isCamera = true
        this.isBind = false

        this.target = new Vector3()
        this.up = new Vector3(0, 1, 0)

        this.projectionMatrix = new Matrix4()
        this.viewMatrix = new Matrix4()
        this.buffer = new UniformBuffer(new Float32Array(32))

        this.bindGroup = new BindGroup()
        this.bindGroupLayout = new BindGroupLayout()
    }

    updateViewMatrix() {
        this.viewMatrix.lookAt(this.position, this.target, this.up)
        this.buffer.data.set(this.viewMatrix.elements, 16)
    }
}

class PerspectiveCamera extends Camera {
    constructor(fov = 50, aspect = 1, near = .1, far = 1000) {
        super("Perspective Camera")

        this.fov = fov * Math.PI / 180
        this.aspect = aspect
        this.near = near
        this.far = far
    }

    updateProjectionMatrix() {
        this.projectionMatrix.perspective(this.fov, this.aspect, this.near, this.far)
        this.buffer.data.set(this.projectionMatrix.elements)
    }
}

class OrthographicCamera extends Camera {
    constructor(left = -1, right = 1, bottom = 1, top = -1, near = .1, far = 100) {
        super("Orthographic Camera")
        this.left = left
        this.right = right
        this.bottom = bottom
        this.top = top
        this.near = near
        this.far = far
    }

    updateProjectionMatrix() {
        this.projectionMatrix.orthographic(this.left, this.right, this.bottom, this.top, this.near, this.far)
        this.buffer.data.set(this.projectionMatrix.elements)
    }
}

export { Camera, PerspectiveCamera, OrthographicCamera }

