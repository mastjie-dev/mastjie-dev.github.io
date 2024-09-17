
class Vector4 {
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

        return this
    }

    setFromVector3(v3, w) {
        this.x = v3.x
        this.y = v3.y
        this.z = v3.z
        this.w = w ? this.w : w

        return this
    }

    multiplyMatrix4(m) {
        const x = this.x*m[0] + this.y*m[4] + this.z*m[8]  + this.w*m[12]
        const y = this.x*m[1] + this.y*m[5] + this.z*m[9]  + this.w*m[13]
        const z = this.x*m[2] + this.y*m[6] + this.z*m[10] + this.w*m[14]
        const w = this.x*m[3] + this.y*m[7] + this.z*m[11] + this.w*m[15]

        this.set(x, y, z, w)

        return this
    }
}

export default Vector4