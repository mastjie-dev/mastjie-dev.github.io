import Vector3 from "./Vector3.js"

class BoundingSphere {
    constructor(position, radius) {
        this.position = new Vector3().copy(position)
        this.radius = radius
    }

    setPosition(x, y, z) {
        this.position.x = x
        this.position.y = y
        this.position.z = z
    }

    setPositionVector(v3) {
        this.position.copy(v3)
    }

    intersectPoint(point) {
        const distance = Math.sqrt(
            (point.x - this.position.x) * (point.x - this.position.x) +
            (point.y - this.position.y) * (point.y - this.position.y) +
            (point.z - this.position.z) * (point.z - this.position.z)
        )

        return distance < this.radius.x
    }

    intersectBox(box) {
        const x = Math.max(box.x, Math.min(this.position.x, box.x))
        const y = Math.max(box.y, Math.min(this.position.y, box.y))
        const z = Math.max(box.z, Math.min(this.position.z, box.z))

        const distance = Math.sqrt(
            (x-this.position.x) * (x-this.position.x) +
            (y-this.position.y) * (y-this.position.y) +
            (z-this.position.z) * (z-this.position.z)
        )

        return distance < sphere.radius
    }

    intersectSphere(sphere) {
        const distance = Math.sqrt(
            (sphere.position.x-this.position.x) * (sphere.position.x-this.position.x) +
            (sphere.position.y-this.position.y) * (sphere.position.y-this.position.y) +
            (sphere.position.z-this.position.z) * (sphere.position.z-this.position.z)
        )

        return distance < this.radius + sphere.radius
    }
}

export default BoundingSphere