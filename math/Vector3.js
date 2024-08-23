
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

    add(a) {
        this.x += a.x
        this.y += a.y
        this.z += a.z
        return this
    }

    sub(a) {
        this.x -= a.x
        this.y -= a.y
        this.z -= a.z
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

    cross(a, b) {
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
}

export default Vector3