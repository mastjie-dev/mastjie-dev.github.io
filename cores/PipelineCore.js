class PipelineCore {
    constructor(material, label = "") {
        this.label = label
        this.material = material
        this.format = "bgra8unorm"
        this.instance = null
        this.vertexBufferLayout = null
    }

    setVertexBufferLayout(vertexBufferLayout) {
        if (!this.vertexBufferLayout) {
            this.vertexBufferLayout = vertexBufferLayout
        }
    }

    getPipelineDescriptor(pipelineLayout) {
        const descriptor = {
            label: "",
            layout: pipelineLayout,
            vertex: {
                module: this.material.shaderModule,
                entryPoint: "main_vertex",
                buffers: this.vertexBufferLayout,
            },
            primitive: {
                cullMode: this.material.cullMode,
                topology: this.material.topology,
            }
        }

        if (this.material.fragmentEnabled) {
            descriptor.fragment = {
                module: this.material.shaderModule,
                entryPoint: "main_fragment",
                targets: [{ format: this.format }]
            }
        }

        if (this.material.depthWriteEnabled) {
            descriptor.depthStencil = {
                depthWriteEnabled: this.material.depthWriteEnabled,
                format: this.material.depthFormat,
                depthCompare: this.material.depthCompare
            }
        }

        return descriptor
    }
}

export default PipelineCore

