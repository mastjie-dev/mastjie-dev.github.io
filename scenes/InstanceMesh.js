import { UniformBuffer } from "../cores/BufferCore.js"
import Matrix4 from "../math/Matrix4.js"
import Mesh from "./Mesh.js"

class InstanceMesh extends Mesh {
    constructor(geometry, material, count, name = "") {
        super(geometry, material, name)
        this.count = count
        this.isInstanceMesh = true

        const instanceMatrixElements = count * 16
        this.instanceWorldMatrix = Array(instanceMatrixElements).fill(0)
        this.instanceNormalMatrix = Array(instanceMatrixElements).fill(0)

        this.buffer = new UniformBuffer(new Float32Array(instanceMatrixElements * 2))
    }

    updateBuffer() {
        this.buffer.data.set(this.instanceWorldMatrix)
        this.buffer.data.set(this.instanceNormalMatrix, this.count * 16)
    }

    updateInstanceMatrix(index, matrix) {
        const offset = index * 16

        if (this.parent) {
            this.worldMatrix.multiplyMatrix(this.parent.worldMatrix, matrix)
        } else {
            this.worldMatrix.copy(matrix)
        }

        this.instanceWorldMatrix[offset + 0] = this.worldMatrix.elements[0]
        this.instanceWorldMatrix[offset + 1] = this.worldMatrix.elements[1]
        this.instanceWorldMatrix[offset + 2] = this.worldMatrix.elements[2]
        this.instanceWorldMatrix[offset + 3] = this.worldMatrix.elements[3]
        this.instanceWorldMatrix[offset + 4] = this.worldMatrix.elements[4]
        this.instanceWorldMatrix[offset + 5] = this.worldMatrix.elements[5]
        this.instanceWorldMatrix[offset + 6] = this.worldMatrix.elements[6]
        this.instanceWorldMatrix[offset + 7] = this.worldMatrix.elements[7]
        this.instanceWorldMatrix[offset + 8] = this.worldMatrix.elements[8]
        this.instanceWorldMatrix[offset + 9] = this.worldMatrix.elements[9]
        this.instanceWorldMatrix[offset + 10] = this.worldMatrix.elements[10]
        this.instanceWorldMatrix[offset + 11] = this.worldMatrix.elements[11]
        this.instanceWorldMatrix[offset + 12] = this.worldMatrix.elements[12]
        this.instanceWorldMatrix[offset + 13] = this.worldMatrix.elements[13]
        this.instanceWorldMatrix[offset + 14] = this.worldMatrix.elements[14]
        this.instanceWorldMatrix[offset + 15] = this.worldMatrix.elements[15]

        const normalMatrix = new Matrix4()
            .copy(this.worldMatrix)
            .inverse()
            .transpose()

        this.instanceNormalMatrix[offset + 0] = normalMatrix.elements[0]
        this.instanceNormalMatrix[offset + 1] = normalMatrix.elements[1]
        this.instanceNormalMatrix[offset + 2] = normalMatrix.elements[2]
        this.instanceNormalMatrix[offset + 3] = normalMatrix.elements[3]
        this.instanceNormalMatrix[offset + 4] = normalMatrix.elements[4]
        this.instanceNormalMatrix[offset + 5] = normalMatrix.elements[5]
        this.instanceNormalMatrix[offset + 6] = normalMatrix.elements[6]
        this.instanceNormalMatrix[offset + 7] = normalMatrix.elements[7]
        this.instanceNormalMatrix[offset + 8] = normalMatrix.elements[8]
        this.instanceNormalMatrix[offset + 9] = normalMatrix.elements[9]
        this.instanceNormalMatrix[offset + 10] = normalMatrix.elements[10]
        this.instanceNormalMatrix[offset + 11] = normalMatrix.elements[11]
        this.instanceNormalMatrix[offset + 12] = normalMatrix.elements[12]
        this.instanceNormalMatrix[offset + 13] = normalMatrix.elements[13]
        this.instanceNormalMatrix[offset + 14] = normalMatrix.elements[14]
        this.instanceNormalMatrix[offset + 15] = normalMatrix.elements[15]
    }
}

export default InstanceMesh