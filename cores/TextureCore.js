
class TextureCore {
    constructor(name, type, width, height, depth, dimension, format) {
        this.isTexture = true
        this.GPUTexture = null
        this.data = null

        this.name = name
        this.type = type
        this.width = width
        this.height = height
        this.depth = depth
        this.dimension = dimension
        this.format = format
        this.flipY = false

        this.usage = null
        this.visibility = null
        this.sampleType = "float"
        this.isMultisampled = false
    }

    setGPUTexture(texture) {
        this.GPUTexture = texture
    }
}

class ExternalImageTexture extends TextureCore {
    constructor(name, width, height, data) {
        super(name, "render", width, height, 1, "2d", "rgba8unorm")
        this.isExternalTexture = true

        this.data = data
        this.usage = GPUTextureUsage.COPY_DST |
            GPUTextureUsage.TEXTURE_BINDING |
            GPUTextureUsage.RENDER_ATTACHMENT
        this.visibility = GPUShaderStage.FRAGMENT
    }
}

class DepthTexture extends TextureCore {
    constructor(name, width, height) {
        super(name, "depth", width, height, 1, "2d", "depth24plus-stencil8")

        this.usage = GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING
        this.visibility = GPUShaderStage.FRAGMENT
    }
}

export { TextureCore, ExternalImageTexture, DepthTexture }