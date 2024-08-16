
const Buffer = {
    Attribute32x3: {
        format: "float32x3",
        offset: 0,
        arrayStride: 12,
        mappedAtCreation: false,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    },

    Attribute32x2: {
        format: "float32x2",
        offset: 0,
        arrayStride: 8,
        mappedAtCreation: false,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    },

    IndexUint16: {
        format: "uint16",
        mappedAtCreation: false,
        usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
    },

    IndexUint32: {
        format: "uint32",
        mappedAtCreation: false,
        usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
    },

    Uniform: {
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT
    },

    Storage: {
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC,
        visibility: GPUShaderStage.COMPUTE,
    }
}

const RenderPassDescriptor = {
    Basic: {
        colorAttachments: [{
            view: null,
            clearColor: [0, 0, 0, 0],
            loadOp: "clear",
            storeOp: "store",
        }],
    },
    Standard: {
        colorAttachments: [{
            view: null,
            clearColor: [0, 0, 0, 0],
            loadOp: "clear",
            storeOp: "store",
        }],
        depthStencilAttachment: {
            view: null,
            depthClearValue: 1.,
            depthLoadOp: "clear",
            depthStoreOp: "store",
            stencilClearValue: 0,
            stencilLoadOp: 'clear',
            stencilStoreOp: 'store',
        }
    },
    Shadow: {
        colorAttachments: [],
        depthStencilAttachment: {
            view: null,
            depthClearValue: 1.,
            depthLoadOp: "clear",
            depthStoreOp: "store",
        }
    },
}

export default {
    Buffer,
    RenderPassDescriptor,
}