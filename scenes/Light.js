import BindGroup from "../cores/BindGroup.js"
import BindGroupLayout from "../cores/BindGroupLayout.js"
import Vector3 from "../math/Vector3.js"
import NodeCore from './NodeCore.js'
import BufferCore from "../cores/BufferCore.js"
import VARS from "../cores/VARS.js"

class Light extends NodeCore {
    constructor() {
        super("light")
        this.name = name
        this.isLight = true

        this.viewSpacePosition = new Vector3()
        this.color = new Vector3(1, 1, 1)
        this.strength = 1
        this.buffer = new BufferCore(
            "light", "uniform", new Float32Array(8), VARS.Buffer.Uniform)

        this.bindGroup = new BindGroup()
        this.bindGroupLayout = new BindGroupLayout()
    }

    updateViewSpacePosition(camera) {
        this.viewSpacePosition.copy(this.position)
        this.viewSpacePosition.multiplyMatrix4(camera.viewMatrix)
    }

    updateBuffer() {
        const arr = [
            ...this.viewSpacePosition.toArray(), 0,
            ...this.color.toArray(), this.strength
        ]
        this.buffer.data.set(arr)
    }
}

class DirectionalLight extends Light {
    constructor() {
        super()
    }
}

export { Light, DirectionalLight }