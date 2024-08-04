
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
    }

    toArray() {
        return [this.x, this.y, this.z]
    }

    copy(v3) {
        this.x = v3.x
        this.y = v3.y
        this.z = v3.z
    }
}

export default Vector3