import BindGroup from "../cores/BindGroup.js"
import BindGroupLayout from "../cores/BindGroupLayout.js"
import BufferCore from "../cores/BufferCore.js"
import VARS from "../cores/VARS.js"
import Matrix4 from "../math/Matrix4.js"


class InstanceMesh {
    constructor(geometry, material, count, name = "") {
        this.name = name
        this.isMesh = true
        this.geometry = geometry
        this.material = material
        this.count = count

        this.worldMatrix = new Matrix4()
        
        const instanceMatrixElements = count * 16
        this.localMatrixArray = Array(instanceMatrixElements).fill(0)
        this.normalMatrixArray = Array(instanceMatrixElements).fill(0)
        
        this.buffer = new BufferCore("instance mesh", "uniform",
            new Float32Array(instanceMatrixElements), VARS.Buffer.Uniform)
        
        this.parent = null

        this.bindGroup = new BindGroup()
        this.bindGroupLayout = new BindGroupLayout()
    }

    addParent(parent) {
        this.parent = parent
    }

    updateBuffer() {
        this.buffer.data.set(this.localMatrixArray)
    }

    updateMatrix(index, matrix) {
        const offset = index * 16

        if (this.parent) {
            this.worldMatrix.multiplyMatrix(this.parent.worldMatrix, matrix)
        } else {
            this.worldMatrix.copy(matrix)
        }

        this.localMatrixArray[offset  + 0] = this.worldMatrix.elements[0]
        this.localMatrixArray[offset  + 1] = this.worldMatrix.elements[1]
        this.localMatrixArray[offset  + 2] = this.worldMatrix.elements[2]
        this.localMatrixArray[offset  + 3] = this.worldMatrix.elements[3]
        this.localMatrixArray[offset  + 4] = this.worldMatrix.elements[4]
        this.localMatrixArray[offset  + 5] = this.worldMatrix.elements[5]
        this.localMatrixArray[offset  + 6] = this.worldMatrix.elements[6]
        this.localMatrixArray[offset  + 7] = this.worldMatrix.elements[7]
        this.localMatrixArray[offset  + 8] = this.worldMatrix.elements[8]
        this.localMatrixArray[offset  + 9] = this.worldMatrix.elements[9]
        this.localMatrixArray[offset + 10] = this.worldMatrix.elements[10]
        this.localMatrixArray[offset + 11] = this.worldMatrix.elements[11]
        this.localMatrixArray[offset + 12] = this.worldMatrix.elements[12]
        this.localMatrixArray[offset + 13] = this.worldMatrix.elements[13]
        this.localMatrixArray[offset + 14] = this.worldMatrix.elements[14]
        this.localMatrixArray[offset + 15] = this.worldMatrix.elements[15]
    }
}

export default InstanceMesh