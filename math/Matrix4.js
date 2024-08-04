import { mat4 } from "wgpu-matrix"

class Matrix4 {
    constructor() {
        this.elements = [
            0, 0, 0, 0,
            0, 0, 0, 0,
            0, 0, 0, 0,
            0, 0, 0, 0,
        ]
    }

    clear() {
        this.elements[0] = 0
        this.elements[1] = 0
        this.elements[2] = 0
        this.elements[3] = 0
        this.elements[4] = 0
        this.elements[5] = 0
        this.elements[6] = 0
        this.elements[7] = 0
        this.elements[8] = 0
        this.elements[9] = 0
        this.elements[10] = 0
        this.elements[11] = 0
        this.elements[12] = 0
        this.elements[13] = 0
        this.elements[14] = 0
        this.elements[15] = 0
        return this
    }

    copy(m) {
        this.elements[0] = m.elements[0]
        this.elements[1] = m.elements[1]
        this.elements[2] = m.elements[2]
        this.elements[3] = m.elements[3]
        this.elements[4] = m.elements[4]
        this.elements[5] = m.elements[5]
        this.elements[6] = m.elements[6]
        this.elements[7] = m.elements[7]
        this.elements[8] = m.elements[8]
        this.elements[9] = m.elements[9]
        this.elements[10] = m.elements[10]
        this.elements[11] = m.elements[11]
        this.elements[12] = m.elements[12]
        this.elements[13] = m.elements[13]
        this.elements[14] = m.elements[14]
        this.elements[15] = m.elements[15]
        return this
    }

    identity() {
        this.clear()
        this.elements[0] = 1
        this.elements[5] = 1
        this.elements[10] = 1
        this.elements[15] = 1
        return this
    }

    multiply(m1) {
        const m = mat4.multiply(m1, this.elements)
        this.elements = Array.from(m)
        return this
    }

    multiplyMatrix(m1, m2) {
        const m = mat4.multiply(m1.elements, m2.elements)
        this.elements = Array.from(m)
        return this
    }

    translate(v3) {
        const m = mat4.translate(mat4.identity(), v3.toArray())
        this.elements = Array.from(m)
        return this
    }

    scale(v3) {
        const m = mat4.scale(this.elements, v3.toArray())
        this.elements = Array.from(m)
        return this
    }

    rotateX(a) {
        const m = mat4.rotateX(this.elements, a)
        this.elements = Array.from(m)
        return this
    }

    rotateY(a) {
        const m = mat4.rotateY(this.elements, a)
        this.elements = Array.from(m)
        return this
    }

    rotateZ(a) {
        const m = mat4.rotateZ(this.elements, a)
        this.elements = Array.from(m)
        return this
    }

    transpose() {
        const m = mat4.transpose(this.elements)
        this.elements = Array.from(m)
        return this
    }

    inverse() {
        const m = mat4.inverse(this.elements)
        this.elements = Array.from(m)
        return this
    }

    lookAt(position, target, up) {
        const m = mat4.lookAt(position, target, up)
        this.elements = Array.from(m)
        return this
    }

    perspective(fov, aspect, near, far) {
        const m = mat4.perspective(fov, aspect, near, far)
        this.elements = Array.from(m)
        return this
    }

    orthographic(left, right, bottom, up, near, far) {
        const m = mat4.ortho(left, right, bottom, up, near, far)
        this.elements = Array.from(m)
        return this
    }
}

export default Matrix4