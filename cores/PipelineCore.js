class PipelineCore {
    constructor(material, label = "") {
        this.label = label
        this.material = material
        this.targets = []
        this.instance = null
        this.vertexBufferLayout = null
    }

    setVertexBufferLayout(vertexBufferLayout) {
        if (!this.vertexBufferLayout) {
            this.vertexBufferLayout = vertexBufferLayout
        }
    }

    setTargets(...formats) {
        formats.forEach(format => this.targets.push(format))
    }

    createTargetFormat(format, blend) {
        return {
            format: format,
            blend: !blend ? undefined : {
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
            const targets = []

            if (this.targets.length) {
                for (let target of this.targets) {
                    targets.push(this.createTargetFormat(target.format, target.blend))
                }
            }
            else {
                targets.push(this.createTargetFormat("bgra8unorm", this.material.blend))
            }

            descriptor.fragment = {
                module: this.material.shaderModule,
                entryPoint: "main_fragment",
                targets,
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

