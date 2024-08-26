import Vector3 from "./Vector3.js"

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
        const m = this.elements

        m[0]  = 0; m[1]  = 0; m[2]  = 0; m[3]  = 0;
        m[4]  = 0; m[5]  = 0; m[6]  = 0; m[7]  = 0;
        m[8]  = 0; m[9]  = 0; m[10] = 0; m[11] = 0;
        m[12] = 0; m[13] = 0; m[14] = 0; m[15] = 0;

        return this
    }

    copy(m) {
        const el = this.elements

        el[0]  = m[0];  el[1]  = m[1];  el[2]  = m[2];  el[3]  = m[3];
        el[4]  = m[4];  el[5]  = m[5];  el[6]  = m[6];  el[7]  = m[7];
        el[8]  = m[8];  el[9]  = m[9];  el[10] = m[10]; el[11] = m[11];
        el[12] = m[12]; el[13] = m[13]; el[14] = m[14]; el[15] = m[15];

        return this
    }

    identity() {
        const m = this.elements

        m[0]  = 1; m[1]  = 0; m[2]  = 0; m[3]  = 0;
        m[4]  = 0; m[5]  = 1; m[6]  = 0; m[7]  = 0;
        m[8]  = 0; m[9]  = 0; m[10] = 1; m[11] = 0;
        m[12] = 0; m[13] = 0; m[14] = 0; m[15] = 1;

        return this
    }

    multiply(m1) {
        this.multiplyMatrix(this, m1)
        return this
    }

    multiplyMatrix(m1, m2) {
        const mr = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
        const a = m1.elements || m1
        const b = m2.elements || m2

        mr[0] = a[0] * b[0] + a[4] * b[1] + a[8] * b[2] + a[12] * b[3]
        mr[4] = a[0] * b[4] + a[4] * b[5] + a[8] * b[6] + a[12] * b[7]
        mr[8] = a[0] * b[8] + a[4] * b[9] + a[8] * b[10] + a[12] * b[11]
        mr[12] = a[0] * b[12] + a[4] * b[13] + a[8] * b[14] + a[12] * b[15]

        mr[1] = a[1] * b[0] + a[5] * b[1] + a[9] * b[2] + a[13] * b[3]
        mr[5] = a[1] * b[4] + a[5] * b[5] + a[9] * b[6] + a[13] * b[7]
        mr[9] = a[1] * b[8] + a[5] * b[9] + a[9] * b[10] + a[13] * b[11]
        mr[13] = a[1] * b[12] + a[5] * b[13] + a[9] * b[14] + a[13] * b[15]

        mr[2] = a[2] * b[0] + a[6] * b[1] + a[10] * b[2] + a[14] * b[3]
        mr[6] = a[2] * b[4] + a[6] * b[5] + a[10] * b[6] + a[14] * b[7]
        mr[10] = a[2] * b[8] + a[6] * b[9] + a[10] * b[10] + a[14] * b[11]
        mr[14] = a[2] * b[12] + a[6] * b[13] + a[10] * b[14] + a[14] * b[15]

        mr[3] = a[3] * b[0] + a[7] * b[1] + a[11] * b[2] + a[15] * b[3]
        mr[7] = a[3] * b[4] + a[7] * b[5] + a[11] * b[6] + a[15] * b[7]
        mr[11] = a[3] * b[8] + a[7] * b[9] + a[11] * b[10] + a[15] * b[11]
        mr[15] = a[3] * b[12] + a[7] * b[13] + a[11] * b[14] + a[15] * b[15]

        this.elements = mr
        return this
    }

    translate(v3) {
        const a = [
            1, 0, 0, 0,
            0, 1, 0, 0,
            0, 0, 1, 0,
            v3.x, v3.y, v3.z, 1,
        ]
        this.multiplyMatrix(this.elements, a)
        return this
    }

    scale(v3) {
        const a = [
            v3.x, 0, 0, 0,
            0, v3.y, 0, 0,
            0, 0, v3.z, 0,
            0, 0, 0, 1,
        ]
        this.multiplyMatrix(this.elements, a)
        return this
    }

    rotateX(radian) {
        const s = Math.sin(radian)
        const c = Math.cos(radian)
        const a = [
            1, 0, 0, 0,
            0, c, s, 0,
            0, -s, c, 0,
            0, 0, 0, 1
        ]
        this.multiplyMatrix(this.elements, a)

        return this
    }

    rotateY(radian) {
        const s = Math.sin(radian)
        const c = Math.cos(radian)
        const a = [
            c, 0, -s, 0,
            0, 1, 0, 0,
            s, 0, c, 0,
            0, 0, 0, 1,
        ]
        this.multiplyMatrix(this.elements, a)
        return this
    }

    rotateZ(radian) {
        const s = Math.sin(radian)
        const c = Math.cos(radian)
        const a = [
            c, s, 0, 0,
            -s, c, 0, 0,
            0, 0, 1, 0,
            0, 0, 0, 1,
        ]
        this.multiplyMatrix(this.elements, a)

        return this
    }

    transpose() {
        const el = this.elements
        let t

        t = el[1]; el[1] = el[4]; el[4] = t;
        t = el[2]; el[2] = el[8]; el[8] = t;
        t = el[3]; el[3] = el[12]; el[12] = t;
        t = el[6]; el[6] = el[9]; el[9] = t;
        t = el[7]; el[7] = el[13]; el[13] = t;
        t = el[11]; el[11] = el[14]; el[14] = t;

        return this
    }

    determinant() {
        const m = this.elements
        return (
            m[0] * (
                m[5] * (m[10] * m[15] - m[14] * m[11]) -
                m[9] * (m[6] * m[15] - m[14] * m[7]) +
                m[13] * (m[6] * m[11] - m[10] * m[7])
            ) -
            m[4] * (
                m[1] * (m[10] * m[15] - m[14] * m[11]) -
                m[9] * (m[2] * m[15] - m[14] * m[3]) +
                m[13] * (m[2] * m[11] - m[10] * m[3])
            ) +
            m[8] * (
                m[1] * (m[6] * m[15] - m[14] * m[7]) -
                m[5] * (m[2] * m[15] - m[14] * m[3]) +
                m[13] * (m[2] * m[7] - m[6] * m[3])
            ) -
            m[12] * (
                m[1] * (m[6] * m[11] - m[10] * m[7]) -
                m[5] * (m[2] * m[11] - m[10] * m[3]) +
                m[9] * (m[2] * m[7] - m[6] * m[3])
            )
        )
    }

    inverse() {
        const m = this.elements

        const m0 = m[5]*(m[10]*m[15] - m[11]*m[14])
                 - m[9]*(m[6]*m[15] - m[14]*m[7])
                 + m[13]*(m[6]*m[11] - m[10]*m[7])
        
        const m1 = m[4]*(m[10]*m[15] - m[14]*m[11])
                 - m[8]*(m[6]*m[15] - m[14]*m[7])
                 + m[12]*(m[6]*m[11] - m[10]*m[7])
        
        const m2 = m[4]*(m[9]*m[15] - m[13]*m[11])
                 - m[8]*(m[5]*m[15] - m[13]*m[7])
                 + m[12]*(m[5]*m[11] - m[9]*m[7])

        const m3 = m[4]*(m[9]*m[14] - m[13]*m[10])
                 - m[8]*(m[5]*m[14] - m[13]*m[6])
                 + m[12]*(m[5]*m[10] - m[9]*m[6])

        const m4 = m[1]*(m[10]*m[15] - m[14]*m[11])
                 - m[9]*(m[2]*m[15] - m[14]*m[3])
                 + m[13]*(m[2]*m[11] - m[10]*m[3])

        const m5 = m[0]*(m[10]*m[15] - m[14]*m[11])
                 - m[8]*(m[2]*m[15] - m[14]*m[3])
                 + m[12]*(m[2]*m[11] - m[10]*m[3])

        const m6 = m[0]*(m[9]*m[15] - m[13]*m[11])
                 - m[8]*(m[1]*m[15] - m[13]*m[3])
                 + m[12]*(m[1]*m[11] - m[9]*m[3])
        
        const m7 = m[0]*(m[9]*m[14] - m[13]*m[10])
                 - m[8]*(m[1]*m[14] - m[13]*m[2])
                 + m[12]*(m[1]*m[10] - m[9]*m[2])
        
        const m8 = m[1]*(m[6]*m[15] - m[14]*m[7])
                 - m[5]*(m[2]*m[15] - m[14]*m[3])
                 + m[13]*(m[2]*m[7] - m[6]*m[3])
                 
        const m9 = m[0]*(m[6]*m[15] - m[14]*m[7])
                 - m[4]*(m[2]*m[15] - m[14]*m[3])
                 + m[12]*(m[2]*m[7] - m[6]*m[3])

        const m10 = m[0]*(m[5]*m[15] - m[13]*m[7])
                  - m[4]*(m[1]*m[15] - m[13]*m[3])
                  + m[12]*(m[1]*m[7] - m[5]*m[3])

        const m11 = m[0]*(m[5]*m[14] - m[13]*m[6])
                  - m[4]*(m[1]*m[14] - m[13]*m[2])
                  + m[12]*(m[1]*m[6] - m[5]*m[2])

        const m12 = m[1]*(m[6]*m[11] - m[10]*m[7])
                  - m[5]*(m[2]*m[11] - m[10]*m[3])
                  + m[9]*(m[2]*m[7] - m[6]*m[3])

        const m13 = m[0]*(m[6]*m[11] - m[10]*m[7])
                  - m[4]*(m[2]*m[11] - m[10]*m[3])
                  + m[8]*(m[2]*m[7] - m[6]*m[3])

        const m14 = m[0]*(m[5]*m[11] - m[9]*m[7])
                  - m[4]*(m[1]*m[11] - m[9]*m[3])
                  + m[8]*(m[1]*m[7] - m[5]*m[3])
        
        const m15 = m[0]*(m[5]*m[10] - m[9]*m[6])
                  - m[4]*(m[1]*m[10] - m[9]*m[2])
                  + m[8]*(m[1]*m[6] - m[5]*m[2])

        const det = m[0]*m0 - m[4]*m4 + m[8]*m8 - m[12]*m12
        
        if (det === 0) {
            this.elements = [
                0, 0, 0, 0,
                0, 0, 0, 0,
                0, 0, 0, 0,
                0, 0, 0, 0,
            ]
            return
        }
        
        const invDet = 1 / det

        m[0]  = m0*invDet
        m[1]  = -m4*invDet
        m[2]  = m8*invDet
        m[3]  = -m12*invDet

        m[4]  = -m1*invDet
        m[5]  = m5*invDet
        m[6]  = -m9*invDet
        m[7]  = m13*invDet

        m[8]  = m2*invDet
        m[9]  = -m6*invDet
        m[10] = m10*invDet
        m[11] = -m14*invDet

        m[12] = -m3*invDet
        m[13] = m7*invDet
        m[14] = -m11*invDet
        m[15] = m15*invDet
    }

    lookAt(position, target, up) {
        const el = this.elements

        const p = new Vector3()
        p.copy(position)

        const f = new Vector3()
        f.subVector(position, target).normalize()

        const r = new Vector3()
        r.cross(up, f).normalize()

        const u = new Vector3()
        u.cross(f, r)

        el[0] = r.x; el[1] = u.x; el[2] = f.x; el[3] = 0;
        el[4] = r.y; el[5] = u.y; el[6] = f.y; el[7] = 0;
        el[8] = r.z; el[9] = u.z; el[10] = f.z; el[11] = 0;

        el[12] = -(r.x * p.x + r.y * p.y + r.z * p.z)
        el[13] = -(u.x * p.x + u.y * p.y + u.z * p.z)
        el[14] = -(f.x * p.x + f.y * p.y + f.z * p.z)
        el[15] = 1

        return this
    }

    perspective(fov, aspect, near, far) {
        const f = Math.tan(Math.PI * .5 - .5 * fov)

        this.elements[0] = f / aspect
        this.elements[5] = f
        this.elements[10] = far * 1 / (near - far)
        this.elements[11] = -1
        this.elements[14] = far * near * 1 / (near - far)

        return this
    }

    orthographic(left, right, bottom, top, near, far) {
        // TODO: bug??
        const el = this.elements

        el[0] = 2 / (right - left)
        el[5] = 2 / (top - bottom)
        el[10] = 1 / (near - far)

        el[12] = (right + left) / (left - right)
        el[13] = (top + bottom) / (bottom - top)
        el[14] = near / (near - far)
        el[15] = 1

        return this
    }
}

export default Matrix4