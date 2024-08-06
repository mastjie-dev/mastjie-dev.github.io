import Vector3 from "./Vector3"
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
        a = this.elements
        let t

        t = a[1]; a[1] = a[4]; a[4] = t;
        t = a[2]; a[2] = a[8]; a[8] = t;
        t = a[3]; a[3] = a[12]; a[12] = t;
        t = a[6]; a[6] = a[9]; a[9] = t;
        t = a[7]; a[7] = a[13]; a[13] = t;
        t = a[11]; a[11] = a[14]; a[14] = t;

        return this
    }

    determinant() {
        const el = this.elements
        let a, b, c, d, e, f, g, h, i, j, k, l, m, n, o, p

        a = el[0]; e = el[4]; i = el[8];  m = el[12];
        b = el[1]; f = el[5]; j = el[9];  n = el[13];
        c = el[2]; g = el[6]; k = el[10]; o = el[14];
        d = el[3]; h = el[7]; l = el[11]; p = el[15];

        const w = a*( f*(k*p-o*l) - j*(g*p-o*h) + n*(g*l-k*h) )

        const x = e*( b*(k*p-o*l) - j*(c*p-o*d) + n*(c*l-k*d) )

        const y = i*( b*(g*p-o*h) - f*(c*p-o*d) + n*(c*h-g*d) )

        const z = m*( b*(g*l-k*h) - f*(c*l-k*d) + j*(c*h-g*d) )

        return w - x + y - z
    }

    inverse() {
        // TODO
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

        el[0] = r.x;  el[1] = u.x;  el[2]  = f.x; el[3]  = 0;
        el[4] = r.y;  el[5] = u.y;  el[6]  = f.y; el[7]  = 0;
        el[8] = r.z;  el[9] = u.z;  el[10] = f.z; el[11] = 0;

        el[12] = -(r.x*p.x + r.y*p.y + r.z*p.z)
        el[13] = -(u.x*p.x + u.y*p.y + u.z*p.z)
        el[14] = -(f.x*p.x + f.y*p.y + f.z*p.z)
        el[15] = 1

        return this
    }

    perspective(fov, aspect, near, far) {
        const f = Math.tan(Math.PI * .5  - .5 * fov)

        this.elements[0] = f / aspect
        this.elements[5] = f
        this.elements[10] = far * 1 / (near - far)
        this.elements[11] = -1
        this.elements[14] = far * near * 1 / (near - far)

        return this
    }

    orthographic(left, right, bottom, top, near, far) {
        this.clear()

        const el = this.elements

        el[0] = 2 / (right - left)
        el[5] = 2 / (top - bottom)
        el[10] = 1 / (near - far)

        el[12] = -(right + left) / (right - left)
        el[13] = -(top + bottom) / (top - bottom)
        el[14] = near / (near - far)
    }
}

export default Matrix4