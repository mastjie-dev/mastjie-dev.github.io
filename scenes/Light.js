import BindGroup from "../cores/BindGroup"
import BindGroupLayout from "../cores/BindGroupLayout"
import Vector3 from "./Vector3"
import NodeCore from './NodeCore'

class Light extends NodeCore {
    constructor(name) {
        super(name)
        this.name = name
        this.isLight = true

        this.color = new Vector3(1, 1, 1)
        this.strength = 1

        this.bindGroup = new BindGroup()
        this.bindGroupLayout = new BindGroupLayout()
    }
}

class DirectionalLight extends Light {
    constructor() {
        super("Directional Light")
    }
}

export { Light, DirectionalLight }