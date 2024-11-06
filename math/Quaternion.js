
class Quaternion {
    constructor(x = 0, y = 0, z = 0, w = 0) {
        this.x = x
        this.y = y
        this.z = z
        this.w = w
    }

    set(x, y, z, w) {
        this.x = x
        this.y = y
        this.z = z
        this.w = w
    }

    setFromAxisAngle(v, angle) {
        const h = angle * .5
        const s = Math.sin(h)

        this.x = v.x * s
        this.y = v.y * s
        this.z = v.z * s
        this.w = Math.cos(h)
        return this
    }

    setFromEuler(v3) {
        const x = v3.x * .5
        const y = v3.y * .5
        const z = v3.z * .5

        const c1 = Math.cos(x)
        const c2 = Math.cos(y)
        const c3 = Math.cos(z)
        const s1 = Math.sin(x)
        const s2 = Math.sin(y)
        const s3 = Math.sin(z)

        this.x = s1*c2*c3 + c1*s2*s3
        this.y = c1*s2*c3 - s1*c2*s3
        this.z = c1*c2*s3 + s1*s2*c3
        this.w = c1*c2*c3 - s1*s2*s3

        return this
    }

    identity() {
        this.x = 0
        this.y = 0
        this.z = 0
        this.w = 1
        return this
    }

    copy(q) {
        this.x = q.x
        this.y = q.y
        this.z = q.z
        this.w = q.w
        return this
    }

    square() {
        return this.x * this.x + this.y * this.y + this.z * this.z + this.w * this.w
    }

    length() {
        return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z + this.w * this.w)
    }

    normalize() {
        let len = this.length()

        if (len === 0) {
            this.x = 0
            this.y = 0
            this.z = 0
            this.w = 0
        }
        else {
            len = 1 / len
            this.x *= len
            this.y *= len
            this.z *= len
            this.w *= len
        }
        return this
    }

    conjugate() {
        this.x = -this.x
        this.y = -this.y
        this.z = -this.z
        return this
    }

    inverse() {
        this.conjugate()
        return this
    }

    multiplyQuaternion(q1, q2) {
        const w = q1.w; const x = q1.x; const y = q1.y; const z = q1.z;
        const a = q2.w; const b = q2.x; const c = q2.y; const d = q2.z;

        this.x = x * a + y * d - z * c + w * b
        this.y = -x * d + y * a + z * b + w * c
        this.z = x * c - y * b + z * a + w * d
        this.w = -x * b - y * c - z * d + w * a

        return this
    }

    multiply(q) {
        this.multiplyQuaternion(this, q)
        return this
    }

    toArray() {
        return [this.x, this.y, this.z, this.w]
    }
}

export default Quaternion