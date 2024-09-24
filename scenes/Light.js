import BindGroup from "../cores/BindGroup.js"
import BindGroupLayout from "../cores/BindGroupLayout.js"
import Vector3 from "../math/Vector3.js"
import NodeCore from './NodeCore.js'
import BufferCore from "../cores/BufferCore.js"
import VARS from "../cores/VARS.js"
import Matrix4 from "../math/Matrix4.js"
import { DepthTexture } from "../cores/TextureCore.js"

class Light extends NodeCore {
    constructor() {
        super("light")
        this.isLight = true

        this.strength = 1
        this.color = new Vector3(.6, .6, .8)
        this.target = new Vector3(0, 0, 0)
        this.projectionView = new Matrix4()
        this.viewSpacePosition = new Vector3()
        this.viewSpaceTarget = new Vector3()

        this.castShadow = true
        this.shadowNearPlane = 1
        this.shadowFarPlane = 100
        this.shadowMapSize = 1024
        this.shadowBias = 0.005
        this.shadowDepthTexture = new DepthTexture(this.shadowMapSize, this.shadowMapSize)
        this.shadowDepthTexture.format = "depth32float"

        this.buffer = new BufferCore(
            "light", "uniform", new Float32Array(28), VARS.Buffer.Uniform)

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
            ...this.color.toArray(), 0,
            ...this.projectionView.elements,
            this.strength, this.shadowBias, this.shadowMapSize, 0,     
        ]
        this.buffer.data.set(arr)
    }
}

class DirectionalLight extends Light {
    constructor() {
        super()

        this.dimension = 10
    }

    updateProjectionView() {
        const d = this.dimension
        const projection = new Matrix4()
            .orthographic(-d, d, d, -d, this.shadowNearPlane ,this.shadowFarPlane)
        
        const view = new Matrix4()
            .lookAt(this.position, this.target, new Vector3(0, -1, 0))

        this.projectionView
            .identity()
            .multiplyMatrix(projection, view)
    }
}

export { Light, DirectionalLight }