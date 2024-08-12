


class WebGPUInstance {
    constructor() {
        if (!navigator.gpu) {
            throw "WebGPU is not available"
        }

        this.adapter = null
        this.device = null
        this.canvas = null
        this.context = null
        this.encoder = null
        this.canvasFormat = navigator.gpu.getPreferredCanvasFormat()

        this.canvasOutput = null
    }

    async init() {
        this.adapter = await navigator.gpu.requestAdapter()
        this.device = await this.adapter.requestDevice({
            requiredFeatures: ['bgra8unorm-storage']
        })
    }

    loop(arrays, callback, params) {
        for (let arr of arrays) {
            callback(arr, params)
        }
        return this
    }

    createShaderModule(code, label = "") {
        return this.device.createShaderModule({ label, code })
    }

    createBuffer(bufferCore) {
        const buffer = this.device.createBuffer({
            label: bufferCore.name,
            size: bufferCore.size,
            usage: bufferCore.usage,
            mappedAtCreation: bufferCore.mappedAtCreation,
        })
        bufferCore.setGPUBuffer(buffer)
        return this
    }

    writeBuffer(bufferCore) {
        this.device.queue.writeBuffer(bufferCore.GPUBuffer, 0, bufferCore.data)
        return this
    }

    createAndWriteBuffer(bufferCore) {
        this.createBuffer(bufferCore)
        this.writeBuffer(bufferCore)
        return this
    }

    createTexture(textureCore) {
        const texture = this.device.createTexture({
            label: textureCore.name,
            format: textureCore.format,
            size: [textureCore.width, textureCore.height, textureCore.depth],
            usage: textureCore.usage,
            dimension: textureCore.dimension,
        })
        textureCore.setGPUTexture(texture)
        return this
    }

    writeTexture(textureCore) {
        if (textureCore.isExternalTexture) {
            this.writeExternalTexture(textureCore)
            return this
        }

        const { width, height, depth, dimension } = textureCore
        this.device.queue.writeTexture(
            { texture: textureCore.GPUTexture },
            textureCore.data,
            {
                offset: 0,
                bytesPerRow: width * 4,
                rowsPerImage: width * height * 4,
            },
            {
                width: width,
                height: height,
            }
        )

        return this
    }

    writeExternalTexture(textureCore) {
        this.device.queue.copyExternalImageToTexture(
            {
                source: textureCore.data,
                flipY: textureCore.flipY,
            },
            {
                texture: textureCore.GPUTexture
            },
            {
                width: textureCore.width,
                height: textureCore.height,
            }
        )
    }

    createAndWriteTexture(textureCore) {
        this.createTexture(textureCore)
        this.writeTexture(textureCore)
        return this
    }

    createSampler(samplerCore) {
        const sampler = this.device.createSampler(samplerCore.options)
        samplerCore.setGPUSampler(sampler)
        return this
    }

    createBindGroupLayoutEntries(resource, entries) {
        let binding = entries.length

        if (resource.isBuffer) {
            entries.push({
                binding,
                visibility: resource.visibility,
                buffer: {
                    type: resource.type,
                    hasDynamicOffset: false,
                    minBindingSize: 0
                }
            })
        }
        else if (resource.isTexture) {
            const e = {
                binding,
                visibility: resource.visibility
            }

            if (resource.isStorageTexture) {
                e.storageTexture = {
                    access: resource.access,
                    format: resource.format,
                    viewDimension: resource.dimension
                }
            } else {
                e.texture = {
                    sampleType: resource.sampleType,
                    viewDimension: resource.dimension,
                    multisampled: resource.isMultisampled,
                }
            }

            entries.push(e)
        }
        else if (resource.isSampler) {
            entries.push({
                binding,
                visibility: resource.visibility,
                sampler: {
                    type: resource.type
                }
            })
        }

        return this
    }

    createBindGroupEntries(resource, entries) {
        let binding = entries.length

        if (resource.isBuffer) {
            entries.push({
                binding,
                resource: {
                    buffer: resource.GPUBuffer,
                    offset: 0,
                }
            })
        }
        else if (resource.isTexture) {
            entries.push({
                binding,
                resource: resource.GPUTexture.createView()
            })
        }
        else if (resource.isSampler) {
            entries.push({
                binding,
                resource: resource.GPUSampler,
            })
        }

        return this
    }

    createBindGroupLayout(owner, entries) {
        const bgl = this.device.createBindGroupLayout({
            label: owner.name,
            entries,
        })
        owner.bindGroupLayout.set(bgl)
        return this
    }

    createBindGroup(owner, entries) {
        const bg = this.device.createBindGroup({
            label: owner.name,
            layout: owner.bindGroupLayout.GPUBindGroupLayout,
            entries
        })
        owner.bindGroup.set(bg)
        return this
    }

    createVertexBufferLayout(geometry) {
        const vbl = []
        let shaderLocation = 0
        for (let attrib of geometry.attributes) {
            vbl.push({
                arrayStride: attrib.arrayStride,
                attributes: [{
                    format: attrib.format,
                    offset: attrib.offset,
                    shaderLocation,
                }]
            })
            ++shaderLocation
        }

        geometry.setVertexBufferLayout(vbl)
        return this
    }

    createPipelineLayout(...bindGroupLayouts) {
        return this.device.createPipelineLayout({
            bindGroupLayouts
        })
    }

    createRenderPipeline(mesh, pipelineLayout, callback) {
        const { geometry, material, shaderModule } = mesh

        const descriptor = {
            label: mesh.name,
            layout: pipelineLayout,
            vertex: {
                module: shaderModule,
                entryPoint: "main_vertex",
                buffers: geometry.vertexBufferLayout,
            },
            fragment: {
                module: shaderModule,
                entryPont: "main_fragment",
                targets: [{ format: this.canvasFormat }] // TODO: more options, eg: depth
            },
            primitive: {
                cullMode: material.cullMode,
            },
            depthStencil: {
                depthWriteEnabled: material.depthWriteEnabled,
                format: material.depthFormat,
                depthCompare: material.depthCompare,
            }
        }

        if (callback) {
            callback(descriptor)
        }

        const pipeline = this.device.createRenderPipeline(descriptor)
        const renderObject = {
            pipeline,
            mesh
        }
        return renderObject
    }

    createRenderPipelineAsync(mesh, pipelineLayout) {
        const { geometry, material, shaderModule } = mesh

        const descriptor = {
            label: mesh.name,
            layout: pipelineLayout,
            vertex: {
                module: shaderModule,
                entryPoint: "main_vertex",
                buffers: geometry.vertexBufferLayout,
            },
            fragment: {
                module: shaderModule,
                entryPont: "main_fragment",
                targets: [{ format: this.canvasFormat }] // TODO: more options, eg: depth
            },
            primitive: {
                cullMode: material.cullMode,
            },
            depthStencil: {
                depthWriteEnabled: material.depthWriteEnabled,
                format: material.depthFormat,
                depthCompare: material.depthCompare,
            }
        }

        const pipeline = this.device.createRenderPipelineAsync(descriptor)
        mesh.pipeline = pipeline
    }

    createComputePipeline(computeObject, pipelineLayout, computeModule) {
        const pipeline = this.device.createComputePipeline({
            layout: pipelineLayout,
            compute: { module: computeModule }
        })
        computeObject.pipeline = pipeline
    }

    custom(callback) {
        callback(this.device)
    }

    copyTextureToTexture(encoder, source, destination) {
        encoder.copyTextureToTexture(
            { texture: source.GPUTexture },
            { texture: destination.GPUTexture },
            {
                width: destination.width,
                height: destination.height,
                depthOrArrayLayers: destination.depth
            }
        )
    }

    copyBufferToBuffer(source, destination, sOffset = 0, dOffset = 0) {
        this.encoder.copyBufferToBuffer(
            source, sOffset, destination, dOffset, destination.size
        )
    }
}

export default WebGPUInstance