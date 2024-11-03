
class Quaternion {
    constructor(x = 0, y = 0, z = 0, w = 0) {
        this.x = x
        this.y = y
        this.z = z
        this.w = w
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

        this.x =  x*a + y*d - z*c + w*b
        this.y = -x*d + y*a + z*b + w*c
        this.z =  x*c - y*b + z*a + w*d
        this.w = -x*b - y*c - z*d + w*a

        // https://www.euclideanspace.com/maths/algebra/realNormedAlgebra/quaternions/code/index.htm
        // x =  q1.x * q2.w + q1.y * q2.z - q1.z * q2.y + q1.w * q2.x;
        // y = -q1.x * q2.z + q1.y * q2.w + q1.z * q2.x + q1.w * q2.y;
        // z =  q1.x * q2.y - q1.y * q2.x + q1.z * q2.w + q1.w * q2.z;
        // w = -q1.x * q2.x - q1.y * q2.y - q1.z * q2.z + q1.w * q2.w;

        return this
    }

    multiply(q) {
        return this.multiplyQuaternion(this, q)
    }

    
}

export default Quaternion