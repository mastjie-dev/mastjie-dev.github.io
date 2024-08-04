
class SamplerCore {
    constructor(name = "sampler", options = {}) {
        this.name = name
        this.isSampler = true
        this.GPUSampler = null
        this.visibility = GPUShaderStage.FRAGMENT,
        this.type = "filtering"

        this.options = {
            addressModeU: options.addressModeU || "repeat",
            addressModeV: options.addressModeV || "repeat",
            addressModeW: options.addressModeW || "repeat",
            magFilter: options.magFilter || "linear",
            minFilter: options.minFilter || "linear",
            mipMapFilter: "linear",
            compare: undefined
        }
    }

    setGPUSampler(sampler) {
        this.GPUSampler = sampler
    }
}

export default SamplerCore