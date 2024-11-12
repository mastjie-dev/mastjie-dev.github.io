
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
        this.viewDimension = dimension
        this.format = format
        this.bytePerPixel = 4
        this.flipY = false

        this.usage = null
        this.visibility = null
        this.sampleType = "float"
        this.isMultisampled = false
        this.access = null
        this.isWriteable = true
    }

    setGPUTexture(texture) {
        this.GPUTexture = texture
    }

    destroy() {
        this.GPUTexture.destroy()
    }
}

class CopyTargetTexture extends TextureCore {
    constructor(width, height, depth = 1, dimension = "2d", bytePerPixel = 4) {
        super("", "copy", width, height, depth, dimension, "bgra8unorm")

        this.bytePerPixel = bytePerPixel
        this.data = new Uint8Array(width * height * depth * bytePerPixel) // assume 4 colors channel
        this.usage = GPUTextureUsage.COPY_DST |
            GPUTextureUsage.TEXTURE_BINDING
        this.visibility = GPUShaderStage.FRAGMENT
    }
}

class RenderTargetTexture extends TextureCore {
    constructor(width, height, bytePerPixel = 4) {
        super("", "render", width, height, 1, "2d", "bgra8unorm")

        this.bytePerPixel = bytePerPixel
        this.data = new Uint8Array(width * height * bytePerPixel)
        this.usage = GPUTextureUsage.COPY_DST |
            GPUTextureUsage.TEXTURE_BINDING |
            GPUTextureUsage.RENDER_ATTACHMENT
        this.visibility = GPUShaderStage.FRAGMENT
    }
}

class ExternalImageTexture extends TextureCore {
    constructor(width, height, data) {
        super("", "image", width, height, 1, "2d", "rgba8unorm")
        this.isExternalTexture = true

        this.data = data
        this.flipY = true
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
        this.isWriteable = false
    }
}

class StorageTexture extends TextureCore {
    constructor(width, height, depth = 1, dimension = "2d", bytePerPixel = 4) {
        super("", "storage", width, height, depth, dimension, "bgra8unorm")

        this.bytePerPixel = bytePerPixel
        this.isStorageTexture = true
        this.access = "write-only"
        this.data = new Uint8Array(width * height * depth * bytePerPixel)
        this.usage = GPUTextureUsage.COPY_DST | GPUTextureUsage.COPY_SRC
            | GPUTextureUsage.STORAGE_BINDING
        this.visibility = GPUShaderStage.COMPUTE
    }
}

class CubeTexture extends TextureCore {
    constructor(width, height, data) {
        super("", "cube", width, height, 6, "2d", "rgba8unorm")

        this.isCubeTexture = true
        this.data = data
        this.usage = GPUTextureUsage.COPY_DST |
            GPUTextureUsage.TEXTURE_BINDING |
            GPUTextureUsage.RENDER_ATTACHMENT
        this.visibility = GPUShaderStage.FRAGMENT
        this.flipY = true
        this.viewDimension = "cube"
    }
}

export {
    TextureCore,
    ExternalImageTexture,
    DepthTexture,
    StorageTexture,
    CopyTargetTexture,
    RenderTargetTexture,
    CubeTexture,
}