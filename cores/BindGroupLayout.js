
class BindGroupLayout {
    constructor() {
        this.GPUBindGroupLayout = null
        this.entries = []
    }

    set (bindGroupLayout) {
        this.GPUBindGroupLayout = bindGroupLayout
    }
}

export default BindGroupLayout