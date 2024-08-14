import Vector3 from "../math/Vector3.js"
import Matrix4 from "../math/Matrix4.js"

class NodeCore {
    constructor(name) {
        this.name = name
        this.position = new Vector3()
        this.rotation = new Vector3()
        this.scale = new Vector3(1, 1, 1)

        this.localMatrix = new Matrix4().identity()
        this.worldMatrix = new Matrix4().identity()

        this.parent = null
        this.children = []
    }

    addParent(parent) {
        this.parent = parent
    }

    addChild(child) {
        this.children.push(child)
        child.addParent(this)
    }

    updateLocalMatrix() {
        this.localMatrix.identity()
        this.localMatrix
            .translate(this.position)
            .rotateX(this.rotation.x)
            .rotateY(this.rotation.y)
            .rotateZ(this.rotation.z)
            .scale(this.scale)
    }

    updateWorldMatrix() {
        this.worldMatrix.identity()
        if (!this.parent) {
            this.worldMatrix.copy(this.localMatrix)
            return
        }
        this.worldMatrix.multiplyMatrix(this.parent.worldMatrix, this.localMatrix)
    }

    updateMatrixWorld() {
        this.updateLocalMatrix()
        this.updateWorldMatrix()
    }
}

export default NodeCore