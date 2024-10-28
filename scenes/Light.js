import Vector3 from "../math/Vector3.js"
import NodeCore from './NodeCore.js'
import { UniformBuffer } from "../cores/BufferCore.js"

class Light extends NodeCore {
    constructor() {
        super("light")
        this.isLight = true
        this.strength = 1
        this.color = new Vector3(1, 1, 1)

        this.shadow = null
    }
}

class DirectionalLight extends Light {
    constructor() {
        super()
        this.target = new Vector3()
        
        this.buffer = new UniformBuffer(new Float32Array(24))
    }

    updateBuffer() {
        const direction = new Vector3()
        direction.subVector(this.position, this.target)
        const arr = [
            ...direction.toArray(), 0,
            ...this.color.toArray(), this.strength
        ]
        this.buffer.data.set(arr)

        if (this.shadow) {
            this.shadow.updateProjectionViewMatrix(this.position, this.target)
            this.buffer.data.set(this.shadow.projectionViewMatrix.elements, 8)
        }
    }
}

class PointLight extends Light {
    constructor() {
        super()
        this.constant = 1.
        this.linear = .09
        this.quadratic = .032

        this.buffer = new UniformBuffer(new Float32Array(28))
    }

    updateBuffer() {
        const arr = [
            ...this.position.toArray(), 0,
            ...this.color.toArray(), this.strength,
            this.constant, this.linear, this.quadratic, 0
        ]
        this.buffer.data.set(arr)

        if (this.shadow) {
            this.shadow.updateProjectionViewMatrix(this.position, this.target)
            this.buffer.data.set(this.shadow.projectionViewMatrix.elements, 12)
        }
    }
}

class SpotLight extends Light {
    constructor() {
        super()

        this.target = new Vector3()
        this.innerLimit = .9
        this.outerLimit = .7

        this.buffer = new UniformBuffer(new Float32Array(32))
    }

    updateBuffer() {
        const direction = new Vector3()
        direction.subVector(this.position, this.target)
        const arr = [
            ...this.position.toArray(), 0,
            ...direction.toArray(), 0,
            ...this.color.toArray(), this.strength,
            this.innerLimit, this.outerLimit, 0, 0,
        ]
        this.buffer.data.set(arr)

        if (this.shadow) {
            this.shadow.updateProjectionViewMatrix(this.position, this.target)
            this.buffer.data.set(this.shadow.projectionViewMatrix.elements, 16)
        }
    }
}

export { Light, DirectionalLight, PointLight, SpotLight }