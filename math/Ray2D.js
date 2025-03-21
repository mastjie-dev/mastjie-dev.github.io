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

    intersectCirlce(circle) {
        // https://www.scratchapixel.com/lessons/3d-basic-rendering/minimal-ray-tracer-rendering-simple-shapes/ray-sphere-intersection.html

        const dir = new Vector2().copy(this.direction).normalize()
        const radius2 = circle.radius * circle.radius

        const L = new Vector2()
        L.subVector(circle.center, this.origin)

        const tca = L.dot(dir)
        const d2 = L.dot(L).subScalar(tca * tca)

        if (d2 > radius2) return false

        const thc = Math.sqrt(radius2 - d2)
        let t0 = tca - thc
        let t1 = tca + thc

        if (t0 > t1) {
            let tmp = t0
            t0 = t1
            t1 = tmp
        }

        if (t0 < 0) {
            if (t1 < 0) {
                return false
            }
            t0 = t1
        }

        return true
    }
}

export default Ray2D