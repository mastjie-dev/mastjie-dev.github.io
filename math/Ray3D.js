import Vector3 from './Vector3.js'

class Ray3D {
    constructor(origin, direction) {
        this.origin = new Vector3()
        this.direction = new Vector3()
        this.invDirection = new Vector3()

        if (origin) {
            this.origin.copy(origin)
        }

        if (direction) {
            this.direction.copy(direction)
            this.setInvDirection()
        }
    }

    setOrigin(x, y, z) {
        this.origin.set(x, y, z)
    }

    setOriginVector(origin) {
        this.origin.copy(origin)
    }

    setDirection(x, y, z) {
        this.direction.set(x, y, z)
        this.setInvDirection()
    }

    setDirectionVector(direction) {
        this.direction.copy(direction)
        this.setInvDirection()
    }

    setInvDirection() {
        this.invDirection.x = 1 / this.direction.x
        this.invDirection.y = 1 / this.direction.y
        this.invDirection.z = 1 / this.direction.z
    }

    intersectBox(box) {
        let tMin, tMax, tMinY, tMaxY, tMinZ, tMaxZ

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

        if (this.invDirection.z <= 0) {
            tMinZ = (box.min.z - this.origin.z) * this.invDirection.z
            tMaxZ = (box.max.z - this.origin.z) * this.invDirection.z
        }
        else {
            tMinZ = (box.max.z - this.origin.z) * this.invDirection.z
            tMaxZ = (box.min.z - this.origin.z) * this.invDirection.z
        }

        if ((tMin > tMaxZ) || (tMinZ > tMax)) return false

        if (tMinZ > tMin) tMin = tMinZ
        if (tMaxZ < tMax) tMin = tMaxZ

        return true
    }

    intersectSphere(sphere) {
        const dir = new Vector3().copy(this.direction).normalize()
        const radius2 = sphere.radius * sphere.radius

        const L = new Vector3()
        L.subVector(sphere.center, this.origin)

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

export default Ray3D