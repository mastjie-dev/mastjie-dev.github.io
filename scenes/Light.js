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
        this.lights.forEach(callback)
    }
}

class Light extends NodeCore {
    constructor() {
        super("light")
        this.isLight = true

        this.strength = 1
        this.color = new Vector3(.8, .78, .8)
        this.target = new Vector3(0, 0, 0)
        this.projectionView = new Matrix4()
        this.viewSpacePosition = new Vector3()

        this.shadow = null
        this.buffer = new UniformBuffer(new Float32Array(8))
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
        
        if (this.shadow) {
            if (this.buffer.data.length === 8) {
                this.buffer.data = new Float32Array(32)
                this.buffer.length = 32
                this.buffer.size = 32 * 4
            }

            this.shadow.position.copy(this.position)
            this.shadow.updateProjectionViewMatrix()
            arr.push(
                ...this.shadow.projectionViewMatrix.elements,
                this.shadow.bias, this.shadow.mapSize, 0, 0,
            )
        }
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