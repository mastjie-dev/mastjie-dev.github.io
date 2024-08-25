import Vector3 from './Vector3.js'

class BoundingBox3D {
    constructor(min, max) {
        this.min = new Vector3().copy(min)
        this.max = new Vector3().copy(max)
    }

    set(min, max) {
        this.min.copy(min)
        this.max.copy(max)
    }

    intersectPoint(point) {
        if (
            point.x >= this.min.x &&
            point.x <= this.max.x &&
            point.y >= this.min.y &&
            point.y <= this.max.y &&
            point.z >= this.min.z &&
            point.z <= this.max.z
        ) return true
        return false
    }

    intersectBox(box) {
        if (
            box.min.x <= this.max.x &&
            box.max.x >= this.min.x &&
            box.min.y <= this.max.y &&
            box.max.y >= this.min.y &&
            box.min.z <= this.max.z &&
            box.max.z >= this.min.z
        ) return true
        return false
    }

    intersectSphere(sphere) {
        const x = Math.max(this.min.x, Math.min(sphere.position.x, this.max.x))
        const y = Math.max(this.min.y, Math.min(sphere.position.y, this.max.y))
        const z = Math.max(this.min.z, Math.min(sphere.position.z, this.max.z))

        const distance = Math.sqrt(
            (x-sphere.position.x) * (x-sphere.position.x) +
            (y-sphere.position.y) * (y-sphere.position.y) +
            (z-sphere.position.z) * (z-sphere.position.z)
        )

        return distance < sphere.radius
    }
}

export default BoundingBox3D