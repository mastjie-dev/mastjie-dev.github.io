
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
        this.access = null
    }

    setGPUTexture(texture) {
        this.GPUTexture = texture
    }
}

class TargetTexture extends TextureCore {
    constructor(width, height, depth = 1, dimension = "2d") {
        super("", "render", width, height, depth, dimension, "bgra8unorm")

        this.data = new Uint8Array(width * height * depth * 4) // assume 4 colors channel
        this.usage = GPUTextureUsage.COPY_DST |
            GPUTextureUsage.TEXTURE_BINDING
        this.visibility = GPUShaderStage.FRAGMENT
    }
}

class ExternalImageTexture extends TextureCore {
    constructor(width, height, data) {
        super("", "image", width, height, 1, "2d", "rgba8unorm")
        this.isExternalTexture = true

        this.data = data
        this.usage = GPUTextureUsage.COPY_DST |
            GPUTextureUsage.TEXTURE_BINDING |
            GPUTextureUsage.RENDER_ATTACHMENT
        this.visibility = GPUShaderStage.FRAGMENT
    }
}

class DepthTexture extends TextureCore {
    constructor(width, height) {
        super("", "depth", width, height, 1, "2d", "depth24plus-stencil8")

        this.usage = GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING
        this.visibility = GPUShaderStage.FRAGMENT
        this.sampleType = "depth"
    }
}

class StorageTexture extends TextureCore {
    constructor(width, height, depth = 1, dimension = "2d") {
        super("", "storage", width, height, depth, dimension, "bgra8unorm")

        this.isStorageTexture = true
        this.access = "write-only"
        this.data = new Uint8Array(width*height*depth*4)
        this.usage = GPUTextureUsage.COPY_DST | GPUTextureUsage.COPY_SRC
            | GPUTextureUsage.STORAGE_BINDING
        this.visibility = GPUShaderStage.COMPUTE
    }
}

export {
    TextureCore,
    ExternalImageTexture,
    DepthTexture,
    StorageTexture,
    TargetTexture,
}