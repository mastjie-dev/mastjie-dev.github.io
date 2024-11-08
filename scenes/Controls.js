// https://www.mbsoftworks.sk/tutorials/opengl4/026-camera-pt3-orbit-camera/

const MIN_POLAR = -1.5
const MAX_POLAR = 1.5
const MIN_RADIUS = 10
const MAX_RADIUS = 1000

class CameraControl {
    constructor(camera) {
        this.camera = camera

        this.theta = 0.025
        this.radius = camera.position.distance(camera.target)
        this.polar = Math.asin((camera.position.y - camera.target.y) / this.radius)
        this.azimuth = Math.asin(
            (camera.position.z - camera.target.z) / (this.radius * Math.cos(this.polar)))

        if (camera.position.x < 0) {
            this.azimuth *= 2
        }
    }

    calcRotation(dir) {
        dir.multiplyScalar(this.theta)

        this.azimuth += dir.x
        this.polar += dir.y

        if (this.polar < MIN_POLAR || this.polar > MAX_POLAR) {
            this.polar -= dir.y
        }

        const cosP = Math.cos(this.polar)
        const cosA = Math.cos(this.azimuth)
        const sinP = Math.sin(this.polar)
        const sinA = Math.sin(this.azimuth)

        this.camera.position.x = this.camera.target.x + this.radius * cosP * cosA
        this.camera.position.y = this.camera.target.y + this.radius * sinP
        this.camera.position.z = this.camera.target.z + this.radius * cosP * sinA
    }

    calcZoom(zDir) {
        // TODO: zoom speed based on target distance
        this.radius += zDir * 1.5

        if (this.radius < MIN_RADIUS) {
            this.radius = 10
        } else if (this.radius > MAX_RADIUS) {
            this.radius = 1000
        }
    }

    update(dir, zDir) {
        this.calcZoom(zDir)
        this.calcRotation(dir)
    }
}

export { CameraControl }