
class Vector3 {
    constructor(x = 0, y = 0, z = 0) {
        this.x = x
        this.y = y
        this.z = z
    }

    set(x, y, z) {
        this.x = x
        this.y = y
        this.z = z
        return this
    }
    
    setUniform(v) {
        this.x = v
        this.y = v
        this.z = v
        return this
    }

    setFromArray(array) {
        this.x = array[0]
        this.y = array[1]
        this.z = array[2]
        return this
    }

    setFromArrayIndex(array, index) {
        this.x = array[index]
        this.y = array[index + 1]
        this.z = array[index + 2]
        return this
    }

    toArray() {
        return [this.x, this.y, this.z]
    }

    copy(v3) {
        this.x = v3.x
        this.y = v3.y
        this.z = v3.z
        return this
    }

    random() {
        this.x = Math.random()
        this.y = Math.random()
        this.z = Math.random()
        return this
    }

    add(v3) {
        this.x += v3.x
        this.y += v3.y
        this.z += v3.z
        return this
    }

    sub(v3) {
        this.x -= v3.x
        this.y -= v3.y
        this.z -= v3.z
        return this
    }

    multiply(v3) {
        this.x *= v3.x
        this.y *= v3.y
        this.z *= v3.z
        return this
    }

    addScalar(s) {
        this.x += s
        this.y += s
        this.z += s
        return this
    }

    subScalar(s) {
        this.x -= s
        this.y -= s
        this.z -= s
        return this
    }

    multiplyScalar(s) {
        this.x *= s
        this.y *= s
        this.z *= s
        return this
    }

    addVector(a, b) {
        this.x = a.x + b.x
        this.y = a.y + b.y
        this.z = a.z + b.z
        return this
    }

    subVector(a, b) {
        this.x = a.x - b.x
        this.y = a.y - b.y
        this.z = a.z - b.z
        return this
    }

    multiplyVector(a, b) {
        this.x = a.x * b.x
        this.y = a.y * b.y
        this.z = a.z * b.z
        return this
    }

    cross(v3) {
        const x = this.x
        const y = this.y
        const z = this.z
        this.x = y*v3.z - z*v3.y
        this.y = z*v3.x - x*v3.z
        this.z = x*v3.y - y*v3.x
        return this
    }

    crossVector(a, b) {
        this.x = a.y*b.z - a.z*b.y
        this.y = a.z*b.x - a.x*b.z
        this.z = a.x*b.y - a.y*b.x
        return this
    }

    dot(a) {
        return this.x*a.x + this.y*a.y + this.z*a.z
    }

    length() {
        return Math.sqrt(
            this.x * this.x +
            this.y * this.y +
            this.z * this.z
        )
    }

    normalize() {
        const l = this.length()
        this.x /= l
        this.y /= l
        this.z /= l
        return this
    }

    distance(v3) {
        return Math.sqrt(
            (this.x - v3.x) * (this.x - v3.x) +
            (this.y - v3.y) * (this.y - v3.y) +
            (this.z - v3.z) * (this.z - v3.z)
        )
    }

    lerp(v3, t) {
        this.x += (v3.x - this.x) * t
        this.y += (v3.y = this.y) * t
        this.z += (v3.z = this.z) * t
        return this
    }

    lerpVector(a, b, t) {
        this.x = a.x + (b.x - a.x) * t
        this.y = a.y + (b.y - a.y) * t
        this.z = a.z + (b.z - a.z) * t
        return this
    }

    clamp(a, b) {
        this.x = this.x < a.x ? a.x : this.x > b.x ? b.x : this.x
        this.y = this.y < a.y ? a.y : this.y > b.y ? b.y : this.y
        this.z = this.z < a.z ? a.z : this.z > b.z ? b.z : this.z
        return this
    }

    multiplyMatrix3(m3) {
        const m = m3.elements
        const x = this.x*m[0] + this.y*m[4] + this.z*m[8]
        const y = this.x*m[1] + this.y*m[5] + this.z*m[9]
        const z = this.x*m[2] + this.y*m[6] + this.z*m[10]

        this.set(x, y, z)
        return this
    }

    multiplyMatrix4(m4, w = 0) {
        const m = m4.elements
        const x = this.x*m[0] + this.y*m[4] + this.z*m[8]  + w*m[12]
        const y = this.x*m[1] + this.y*m[5] + this.z*m[9]  + w*m[13]
        const z = this.x*m[2] + this.y*m[6] + this.z*m[10] + w*m[14]

        this.set(x, y, z)
        return this
    }
}

export default Vector3