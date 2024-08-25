import Vector2 from './Vector2.js'

class BoundingCircle {
    constructor(position, radius) {
        this.position = new Vector2().copy(position)
        this.radius = radius
    }

    setPosition(x, y) {
        this.position.x = x
        this.position.y = y
    }

    setPositionVector(v2) {
        this.position.copy(v2)
    }

    intersectPoint(point) {
        const distance = Math.sqrt(
            (point.x - this.position.x) * (point.x - this.position.x) +
            (point.y - this.position.y) * (point.y - this.position.y)
        )

        return distance < this.radius.x
    }

    intersectBox(box) {
        const x = Math.max(box.x, Math.min(this.position.x, box.x))
        const y = Math.max(box.y, Math.min(this.position.y, box.y))

        const distance = Math.sqrt(
            (x-this.position.x) * (x-this.position.x) +
            (y-this.position.y) * (y-this.position.y)
        )

        return distance < circle.radius
    }

    intersectCircle(circle) {
        const distance = Math.sqrt(
            (circle.position.x-this.position.x) * (circle.position.x-this.position.x) +
            (circle.position.y-this.position.y) * (circle.position.y-this.position.y) +
            (circle.position.z-this.position.z) * (circle.position.z-this.position.z)
        )

        return distance < this.radius + circle.radius
    }
}

export default BoundingCircle