import Vector2 from "./Vector2.js"

class Ray2D {
    constructor(origin, direction) {
        this.origin = new Vector2()
        this.direction = new Vector2()
        this.invDirection = new Vector2()

        if (origin) {
            this.origin.copy(origin)
        }

        if (direction) {
            this.direction.copy(direction)
            this.setInvDirection()
        }
    }

    setOrigin(x, y) {
        this.origin.set(x, y)
    }

    setOriginVector(origin) {
        this.origin.copy(origin)
    }

    setDirection(x, y) {
        this.direction.set(x, y)
        this.setInvDirection()
    }

    setDirectionVector(direction) {
        this.direction.copy(direction)
        this.setInvDirection()
    }

    setInvDirection() {
        this.invDirection.x = 1 / this.direction.x
        this.invDirection.y = 1 / this.direction.y
    }

    intersectBox(box) {
        let tMin, tMax, tMinY, tMaxY

        if (this.invDirection.x <= 0) {
            tMin = (box.min.x - this.origin.x) * this.invDirection.x
            tMax = (box.max.x - this.origin.x) * this.invDirection.x
        }
        else {
            tMin = (box.max.x - this.origin.x) * this.invDirection.x
            tMax = (box.min.x - this.origin.x) * this.invDirection.x
        }

        if (this.invDirection.x <= 0) {
            tMinY = (box.min.y - this.origin.y) * this.invDirection.y
            tMaxY = (box.max.y - this.origin.y) * this.invDirection.y
        }
        else {
            tMinY = (box.max.y - this.origin.y) * this.invDirection.y
            tMaxY = (box.min.y - this.origin.y) * this.invDirection.y
        }

        if ((tMin > tMaxY) || (tMinY > tMax)) return false

        if ((tMinY > tMin) || isNaN(tMin)) tMin = tMinY

        if ((tMaxY < tMax) || isNaN(tMax)) tMax = tMaxY

        return true
    }

    intersectCirlce(circle) { /* TODO */ }
}

export default Ray2D