import Vector2 from './Vector2.js'

class BoundingCircle {
    constructor(radius) {
        this.position = new Vector2()
        this.radius = radius
    }

    intersectPoint(point) {
        const distance = Math.sqrt(
            (point.x - this.position.x) * (point.x - this.position.x) +
            (point.y - this.position.y) * (point.y - this.position.y)
        )

        return distance < this.radius
    }

    intersectBox(box) {
        const min = new Vector2().copy(box.position).add(box.min)
        const max = new Vector2().copy(box.position).add(box.max)

        const x = Math.max(min.x, Math.min(this.position.x, max.x))
        const y = Math.max(min.y, Math.min(this.position.y, max.y))

        const distance = Math.sqrt(
            (x-this.position.x) * (x-this.position.x) +
            (y-this.position.y) * (y-this.position.y)
        )

        return distance < this.radius
    }

    intersectCircle(circle) {
        const distance = Math.sqrt(
            (circle.position.x-this.position.x) * (circle.position.x-this.position.x) +
            (circle.position.y-this.position.y) * (circle.position.y-this.position.y)
        )

        return distance < (this.radius + circle.radius)
    }
}

export default BoundingCircle