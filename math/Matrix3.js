
class Matrix3 {
    constructor() {
        this.elements = [
            0, 0, 0,
            0, 0, 0,
            0, 0, 0,
        ]
    }

    clear() {
        const m = this.elements

        m[0] = 0; m[1] = 0; m[2] = 0;
        m[3] = 0; m[4] = 0; m[5] = 0;
        m[6] = 0; m[7] = 0; m[8] = 0;
        
        return this 
    }

    copy() {
        const el = this.elements

        el[0] = m[0]; el[1] = m[1]; el[2] = m[2];
        el[3] = m[3]; el[4] = m[4]; el[5] = m[5];
        el[6] = m[6]; el[7] = m[7]; el[8] = m[8];

        return this
    }

    identity() {
        const m = this.elements

        m[0] = 1; m[1] = 0; m[2] = 0;
        m[3] = 0; m[4] = 1; m[5] = 0;
        m[6] = 0; m[7] = 0; m[8] = 1;

        return this
    }

    multiply(m1) {}

    multiplyMatrix(m1, m2) {}

    translate(v2) {
        const a = [
            1,    0,    0,
            0,    1,    0,
            v2.x, v2.y, 1,
        ]
        this.multiplyMatrix(this.elements, a)
        return this
    }

    scale(v2) {
        const a = [
            v2.x, 0,    0,
            0,    v2.y, 0,
            0,    0,    1,
        ]
        this.multiplyMatrix(this.elements, a)
        return this
    }

    rotate(radian) {
        const s = Math.sin(radian)
        const c = Math.cos(radian)
        const a = [
            c,  s, 0,
            -s, c, 0,
            0,  0, 1
        ]
        this.multiplyMatrix(this.elements, a)
        return this
    }

    transpose() {}

    determinant() {}

    inverse() {}
}

export default Matrix3