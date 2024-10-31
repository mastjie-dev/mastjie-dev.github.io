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
            // TODO: multiple targets
            const zero = {
                format: this.format,
                blend:  !this.material.blend ? undefined : {
                    color: {
                        operation: this.material.blendColorOp,
                        srcFactor: this.material.blendColorSrcFactor,
                        dstFactor: this.material.blendColorDstFactor,
                    },
                    alpha: {
                        operation: this.material.blendAlphaOp,
                        srcFactor: this.material.blendAlphaSrcFactor,
                        dstFactor: this.material.blendAlphaDstFactor,
                    },
                }
            }

            descriptor.fragment = {
                module: this.material.shaderModule,
                entryPoint: "main_fragment",
                targets: [zero]
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

