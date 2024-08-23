import Vector3 from "./Vector3"

class Frustum {
    constructor(camera) {
        this.camera = camera
        
        this.nearRightTop = new Vector3()
        this.nearRightBottom = new Vector3()
        this.nearLeftTop = new Vector3()
        this.nearLeftBottom = new Vector3()

        this.farRightTop = new Vector3()
        this.farRightBottom = new Vector3()
        this.farLeftTop = new Vector3()
        this.farLeftBottom = new Vector3()
    }

    update() {
        const v3 = new Vector3()
        const camForward = new Vector3()
        camForward.subVector(this.camera.position, this.camera.target)
            .normalize()
        
        v3.copy(camForward).multiplyScalar(this.camera.near)
        const nearCenter = new Vector3()
        nearCenter.copy(this.camera.position).sub(v3)

        v3.copy(camForward).multiplyScalar(this.camera.far)
        const farCenter = new Vector3()
        farCenter.copy(this.camera.position).sub(v3)

        const radian = Math.tan(this.camera.fov*.5)
        const nearHeight = radian * this.camera.near
        const nearWidth = nearHeight * this.camera.aspect
        const farHeight = radian * this.camera.far
        const farWidth = farHeight * this.camera.aspect

        const camUp = new Vector3().copy(this.camera.up).normalize()
        const camRight = new Vector3().cross(camForward, camUp).normalize()
        camUp.cross(camForward, camRight)
        v3.copy(camUp)

        camUp.multiplyScalar(farHeight)
        camRight.multiplyScalar(farWidth)

        this.farLeftTop.copy(farCenter).add(camUp).sub(camRight)
        this.farRightTop.copy(farCenter).add(camUp).add(camRight)
        this.farLeftBottom.copy(farCenter).sub(camUp).sub(camRight)
        this.farRightBottom.copy(farCenter).sub(camUp).add(camRight)

        camUp.copy(v3)
        camRight.cross(camForward, camUp)
        camUp.multiplyScalar(nearHeight)
        camRight.multiplyScalar(nearWidth)

        this.nearLeftTop.copy(nearCenter).add(camUp).sub(camRight)
        this.nearRightTop.copy(nearCenter).add(camUp).add(camRight)
        this.nearLeftBottom.copy(nearCenter).sub(camUp).sub(camRight)
        this.nearRightBottom.copy(nearCenter).sub(camUp).add(camRight)

        // console.log()
    }
}

export default Frustum