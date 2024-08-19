
const PipelineDescriptorBuilder = {
    descriptor: {},
    start() {
        this.descriptor = {}
        return this
    },
    label(label) {
        this.descriptor.label = label
        return this
    },
    layout(pipelineLayout) {
        this.descriptor.layout = pipelineLayout
        return this
    },
    vertex(module, vertexBufferLayout, entryPoint = "main_vertex") {
        this.descriptor.vertex = {
            module,
            entryPoint,
            buffers: vertexBufferLayout,
        }
        return this
    },
    fragment(module, format, entryPoint = "main_fragment") {
        this.descriptor.fragment = {
            module,
            entryPoint,
            targets: [{ format }]
        }
        return this
    },
    primitive(cullMode, topology) {
        this.descriptor.primitive = {
            cullMode,
            topology,
        }
        return this
    },
    depthStencil(depthWriteEnabled, depthFormat, depthCompare) {
        this.descriptor.depthStencil = {
            depthWriteEnabled,
            format: depthFormat,
            depthCompare
        }
        return this
    },
    end() {
        return this.descriptor
    }
}

const RenderPassDescriptorBuilder = {
    descriptor: {},
    start() {
        this.descriptor = {
            colorAttachments: [
                {
                    view: null,
                    clearColor: [0, 0, 0, 0],
                    loadOp: "clear",
                    storeOp: "store",
                }
            ],
            depthStencilAttachment: {
                view: null,
                depthClearValue: 1.,
                depthLoadOp: "clear",
                depthStoreOp: "store",
                stencilClearValue: 0,
                stencilLoadOp: 'clear',
                stencilStoreOp: 'store',
            },

            //TODO: more options??
        }
        return this
    },

    disableColorAttachment() {
        this.descriptor.colorAttachments = []
        return this
    },
    disableStencilAttachment() {
        this.descriptor.depthStencilAttachment = undefined
        return this
    },
    disableDepth() {
        this.descriptor.depthStencilAttachment.depthClearValue = undefined
        this.descriptor.depthStencilAttachment.depthLoadOp = undefined
        this.descriptor.depthStencilAttachment.depthStoreOp = undefined
        return this
    },
    modifyColorAttachment(key, value, index = 0) {
        this.descriptor.colorAttachments[index][key] = value
        return this
    },
    modifyDepthStencilAttachment(key, value) {
        this.descriptor.depthStencilAttachment[key] = value
        return this
    },
    end() {
        return this.descriptor
    }
}

export { PipelineDescriptorBuilder, RenderPassDescriptorBuilder }