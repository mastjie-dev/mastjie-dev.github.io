import BindGroup from "../cores/BindGroup.js"
import BindGroupLayout from "../cores/BindGroupLayout.js"
import Vector3 from "../math/Vector3.js"
import NodeCore from './NodeCore.js'
import { UniformBuffer } from "../cores/BufferCore.js"
import Matrix4 from "../math/Matrix4.js"

class LightGroup {
    constructor() {
        this.isBind = false
        this.lights = []
    
        this.bindGroup = new BindGroup()
        this.bindGroupLayout = new BindGroupLayout()
    }

    add(light) {
        this.lights.push(light)
    }

    traverse(callback) {
        for (let light of this.lights) {
            callback(light)
        }
    }
}

class Light extends NodeCore {
    constructor() {
        super("light")
        this.isLight = true

        this.strength = 1
        this.color = new Vector3(1, 1, 1)
        this.target = new Vector3(0, 0, 0)
        this.viewSpacePosition = new Vector3()

        this.shadow = null
        this.buffer = new UniformBuffer(new Float32Array(32))
    }

    updateViewSpacePosition(camera) {
        this.viewSpacePosition.copy(this.position)
        this.viewSpacePosition.multiplyMatrix4(camera.viewMatrix)
    }

    updateBuffer() {
        const arr = [
            ...this.viewSpacePosition.toArray(), 0,
            ...this.color.toArray(), this.strength,
        ]
        this.buffer.data.set(arr)
    }
}

class DirectionalLight extends Light {
    constructor() {
        super()
        this.dimension = 10
    }
}

export { LightGroup, Light, DirectionalLight }