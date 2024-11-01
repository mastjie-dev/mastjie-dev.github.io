import Vector3 from "../math/Vector3.js"
import Matrix4 from "../math/Matrix4.js"
import { DepthTexture } from "../cores/TextureCore.js"
import { degreeToRadian } from "../misc/utils.js"

class DirectionalShadow {
    constructor() {
        this.dimension = 40
        this.near = 1
        this.far = 200
        this.mapSize = 1024
        this.bias = .007
        this.depthTexture = new DepthTexture(this.mapSize, this.mapSize)
        this.depthTexture.format = "depth32float"
        
        this.position = new Vector3()
        this.target = new Vector3()

        this.projectionViewMatrix = new Matrix4()
    }

    updateProjectionViewMatrix(position, target) {
        this.position.copy(position)
        this.target.copy(target)

        const viewMatrix = new Matrix4()
        viewMatrix.lookAt(this.position, this.target, new Vector3(0, -1, 0))

        const d = this.dimension / 2
        this.projectionViewMatrix.clear()
        this.projectionViewMatrix.orthographic(-d, d, -d, d, this.near, this.far)
        this.projectionViewMatrix.multiply(viewMatrix)
    }
}

class SpotShadow {
    constructor() {
        this.fov = degreeToRadian(75)
        this.aspect = 1
        this.near = .5
        this.far = 200
        this.mapSize = 1024
        this.bias = .007
        this.depthTexture = new DepthTexture(this.mapSize, this.mapSize)
        this.depthTexture.format = "depth32float"

        this.position = new Vector3()
        this.target = new Vector3()

        this.projectionViewMatrix = new Matrix4()
    }

    updateProjectionViewMatrix(position, target) {
        this.position.copy(position)
        this.target.copy(target)

        const viewMatrix = new Matrix4()
        viewMatrix.lookAt(this.position, this.target, new Vector3(0, -1, 0))

        this.projectionViewMatrix.clear()
        this.projectionViewMatrix.perspective(this.fov, this.aspect, this.near, this.far)
        this.projectionViewMatrix.multiply(viewMatrix)
    }
}

export { DirectionalShadow, SpotShadow }