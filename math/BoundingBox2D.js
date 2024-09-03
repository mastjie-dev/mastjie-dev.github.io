import Vector2 from './Vector2.js'

class BoundingBox2D {
    constructor() {
        this.position = new Vector2()
        this.min = new Vector2()
        this.max = new Vector2()
    }

    intersectPoint(point) {
        const min = new Vector2().copy(this.position).add(this.min)
        const max = new Vector2().copy(this.position).add(this.max)
        if (
            point.x >= min.x &&
            point.x <= max.x &&
            point.y >= min.y &&
            point.y <= max.y
        ) return true
        return false
    }

    intersectBox(box) {
        const tmin = new Vector2().copy(this.position).add(this.min)
        const tmax = new Vector2().copy(this.position).add(this.max)
        const bmin = new Vector2().copy(box.position).add(box.min)
        const bmax = new Vector2().copy(box.position).add(box.max)

        if (
            bmin.x <= tmax.x &&
            bmax.x >= tmin.x &&
            bmin.y <= tmax.y &&
            bmax.y >= tmin.y
        ) return true
        return false
    }

    intersectCircle(circle) {
        const min = new Vector2().copy(this.position).add(this.min)
        const max = new Vector2().copy(this.position).add(this.max)
        
        const x = Math.max(min.x, Math.min(circle.position.x, max.x))
        const y = Math.max(min.y, Math.min(circle.position.y, max.y))

        const distance = Math.sqrt(
            (x-circle.position.x) * (x-circle.position.x) +
            (y-circle.position.y) * (y-circle.position.y)
        )

        return distance < circle.radius
    }
}

export default BoundingBox2D