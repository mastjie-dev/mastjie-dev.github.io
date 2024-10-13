import Vector3 from "../math/Vector3.js"
import Matrix4 from "../math/Matrix4.js"
import { DepthTexture } from "../cores/TextureCore.js"

class DirectionalShadow {
    constructor() {
        this.dimension = 20
        this.near = 1
        this.far = 100
        this.mapSize = 1024
        this.bias = .007
        this.depthTexture = new DepthTexture(this.mapSize, this.mapSize)
        this.depthTexture.format = "depth32float"
        
        this.position = new Vector3()
        this.target = new Vector3()

        this.projectionViewMatrix = new Matrix4()
    }

    updateProjectionViewMatrix() {
        const v = new Matrix4()
        v.lookAt(this.position, this.target, new Vector3(0, 1, 0))

        const h = this.dimension / 2
        this.projectionViewMatrix.clear()
        this.projectionViewMatrix.orthographic(-h, h, h, -h, this.near, this.far)
        this.projectionViewMatrix.multiply(v)
    }
}

export { DirectionalShadow }