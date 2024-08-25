import Vector2 from './Vector2.js'

class BoundingBox3D {
    constructor(min, max) {
        this.min = new Vector2().copy(min)
        this.max = new Vector2().copy(max)
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
            point.y <= this.max.y
        ) return true
        return false
    }

    intersectBox(box) {
        if (
            box.min.x <= this.max.x &&
            box.max.x >= this.min.x &&
            box.min.y <= this.max.y &&
            box.max.y >= this.min.y
        ) return true
        return false
    }

    intersectCircle(circle) {
        const x = Math.max(this.min.x, Math.min(circle.x, this.max.x))
        const y = Math.max(this.min.y, Math.min(circle.y, this.max.y))

        const distance = Math.sqrt(
            (x-circle.x) * (x-circle.x) +
            (y-circle.y) * (y-circle.y)
        )

        return distance < circle.radius
    }
}

export default BoundingBox3D