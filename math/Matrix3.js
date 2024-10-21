
class Matrix3 {
    constructor() {
        // webgpu required padding
        this.elements = [
            0, 0, 0, 0,
            0, 0, 0, 0,
            0, 0, 0, 0,
        ]
    }

    clear() {
        const m = this.elements

        m[0] = 0; m[1] = 0; m[2]  = 0;
        m[4] = 0; m[5] = 0; m[6]  = 0;
        m[8] = 0; m[9] = 0; m[10] = 0;
        
        return this 
    }

    copy(m1) {
        const el = this.elements
        const m = m1.elements

        el[0] = m[0]; el[1] = m[1]; el[2]  = m[2];
        el[4] = m[4]; el[5] = m[5]; el[6]  = m[6];
        el[8] = m[8]; el[9] = m[9]; el[10] = m[10];

        return this
    }

    copyFromMatrix4(m1) {
        this.copy(m1)
    }

    identity() {
        const m = this.elements

        m[0] = 1; m[1] = 0; m[2]  = 0;
        m[4] = 0; m[5] = 1; m[6]  = 0;
        m[8] = 0; m[9] = 0; m[10] = 1;

        return this
    }

    multiply(m1) {
        this.multiplyMatrix(this, m1)
        return this
    }

    multiplyMatrix(m1, m2) {
        const mr = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
        const a = m1.elements || m1
        const b = m2.elements || m2

        mr[0]  = a[0] * b[0] + a[4] * b[1] + a[8]  * b[2]
        mr[4]  = a[0] * b[4] + a[4] * b[5] + a[8]  * b[6]
        mr[8]  = a[0] * b[8] + a[4] * b[9] + a[8]  * b[10]

        mr[1]  = a[1] * b[0] + a[5] * b[1] + a[9]  * b[2]
        mr[5]  = a[1] * b[4] + a[5] * b[5] + a[9]  * b[6]
        mr[9]  = a[1] * b[8] + a[5] * b[9] + a[9]  * b[10]

        mr[2]  = a[2] * b[0] + a[6] * b[1] + a[10] * b[2]
        mr[6]  = a[2] * b[4] + a[6] * b[5] + a[10] * b[6]
        mr[10] = a[2] * b[8] + a[6] * b[9] + a[10] * b[10]

        this.elements = mr
        return this
    }

    translate(v2) {
        const a = [
            1,    0,    0, 0,
            0,    1,    0, 0,
            v2.x, v2.y, 1, 0,
        ]
        this.multiplyMatrix(this.elements, a)
        return this
    }

    scale(v2) {
        const a = [
            v2.x, 0,    0, 0,
            0,    v2.y, 0, 0,
            0,    0,    1, 0,
        ]
        this.multiplyMatrix(this.elements, a)
        return this
    }

    rotate(radian) {
        const s = Math.sin(radian)
        const c = Math.cos(radian)
        const a = [
            c,  s, 0, 0,
            -s, c, 0, 0,
            0,  0, 1, 0,
        ]
        this.multiplyMatrix(this.elements, a)
        return this
    }

    transpose() {
        const el = this.elements
        let t

        t = el[1]; el[1] = el[4]; el[4] = t;
        t = el[2]; el[2] = el[8]; el[8] = t;
        t = el[6]; el[6] = el[9]; el[9] = t;

        return this
    }

    determinant() {
        const el = this.elements

        return (
            el[0] * (el[5] * el[10] - el[6] * el[9]) -
            el[4] * (el[1] * el[10] - el[2] * el[9]) +
            el[8] * (el[1] * el[6] - el[2] * el[5])
        )
    }

    inverse() {
        const m = this.elements

        const m0  = m[5] * m[10] - m[9] * m[6]
        const m1  = m[4] * m[10] - m[8] * m[6]
        const m2  = m[4] * m[9]  - m[8] * m[5]
        
        const m4  = m[1] * m[10] - m[9] * m[2]
        const m5  = m[0] * m[10] - m[8] * m[2]
        const m6  = m[0] * m[9]  - m[8] * m[1]
        
        const m8  = m[1] * m[6]  - m[5] * m[2]
        const m9  = m[0] * m[6]  - m[4] * m[2]
        const m10 = m[0] * m[5]  - m[4] * m[1]
        
        const det = m[0]*m0 - m[4]*m4 + m[8]*m8

        if (det === 0) {
            this.clear()
            return
        }

        const invDet = 1 / det

        m[0]  = m0*invDet
        m[1]  = -m4*invDet
        m[2]  = m8*invDet

        m[4]  = -m1*invDet
        m[5]  = m5*invDet
        m[6]  = -m9*invDet

        m[8]  = m2*invDet
        m[9]  = -m6*invDet
        m[10] = m10*invDet

        return this
    }
}

export default Matrix3