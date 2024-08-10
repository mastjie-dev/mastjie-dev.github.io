
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

class TargetTexture2D extends TextureCore {
    constructor(name, width, height) {
        super(name, "render", width, height, 1, "2d", "bgra8unorm")

        this.data = new Uint8Array(width * height * 4)
        this.usage = GPUTextureUsage.COPY_DST |
            GPUTextureUsage.TEXTURE_BINDING
        this.visibility = GPUShaderStage.FRAGMENT
    }
}

class ExternalImageTexture extends TextureCore {
    constructor(name, width, height, data) {
        super(name, "image", width, height, 1, "2d", "rgba8unorm")
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

class StorageTexture extends TextureCore {
    constructor(name, width, height, depth = 1, dimension = "2d") {
        super(name, "storage", width, height, depth, dimension, "bgra8unorm")

        this.isStorageTexture = true
        this.access = "write-only"
        this.data = new Uint8Array(width*height*depth*4)
        this.usage = GPUTextureUsage.COPY_DST | GPUTextureUsage.COPY_SRC
            | GPUTextureUsage.STORAGE_BINDING
        this.visibility = GPUShaderStage.COMPUTE
    }


}

export { TextureCore, ExternalImageTexture, DepthTexture, StorageTexture, TargetTexture2D }