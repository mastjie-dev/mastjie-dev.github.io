
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
    primitive(cullMode) {
        this.descriptor.primitive = {
            cullMode,
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

export default PipelineDescriptorBuilder