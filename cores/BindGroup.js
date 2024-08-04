
class BindGroup {
    constructor() {
        this.GPUBindGroup = null
        this.entries = []
    }

    set (bindGroup) {
        this.GPUBindGroup = bindGroup
    }
}

export default BindGroup