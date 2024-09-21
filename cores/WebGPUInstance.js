


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
            requiredFeatures: ['bgra8unorm-storage', 'timestamp-query']
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
        if (textureCore.isExternalTexture || textureCore.isCubeTexture) {
            this.writeExternalTexture(textureCore)
            return this
        }

        const { width, height } = textureCore
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
        const data = Array.isArray(textureCore.data) ? textureCore.data : [textureCore.data]

        data.forEach((d, l) => {
            this.device.queue.copyExternalImageToTexture(
                {
                    source: d,
                    flipY: textureCore.flipY,
                },
                {
                    texture: textureCore.GPUTexture,
                    origin: [0, 0, l]
                },
                {
                    width: textureCore.width,
                    height: textureCore.height,
                }
            )
        })
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

    createQuerySet(query) {
        query.GPUQuerySet = this.device.createQuerySet({
            type: query.type,
            count: query.count,
        })

        this.createBuffer(query.resolve)
            .createBuffer(query.result)

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
                    viewDimension: resource.viewDimension
                }
            } else {
                e.texture = {
                    sampleType: resource.sampleType,
                    viewDimension: resource.viewDimension,
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
                resource: resource.GPUTexture.createView({
                    dimension: resource.viewDimension
                })
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

    createRenderPipeline(mesh, pipelineDescriptor) {
        const pipeline = this.device.createRenderPipeline(pipelineDescriptor)
        return {
            mesh,
            pipeline
        }
    }

    createComputePipeline(compute, pipelineLayout) {
        const pipeline = this.device.createComputePipeline({
            layout: pipelineLayout,
            compute: { module: compute.shaderModule }
        })
        compute.pipeline = pipeline
    }

    createCommandEncoder() {
        return this.device.createCommandEncoder()
    }

    submitEncoder(finish) {
        this.device.queue.submit(finish)
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

    copyBufferToBuffer(encoder, source, destination, sOffset = 0, dOffset = 0) {
        encoder.copyBufferToBuffer(
            source.GPUBuffer,
            sOffset,
            destination.GPUBuffer,
            dOffset,
            destination.size
        )
    }

    bindCamerasResource(cameras) {
        const _cams = Array.isArray(cameras) ? cameras : [cameras]

        for (let c of _cams) {
            if (!c.GPUBuffer) {
                c.updateProjectionMatrix()
                c.updateViewMatrix()
                this
                    .createAndWriteBuffer(c.buffer)
                    .createBindGroupLayoutEntries(c.buffer, c.bindGroupLayout.entries)
                    .createBindGroupLayout(c, c.bindGroupLayout.entries)
                    .createBindGroupEntries(c.buffer, c.bindGroup.entries)
                    .createBindGroup(c, c.bindGroup.entries)
            }
        }
    }

    bindLightsResource(lights) {
        const _lights = Array.isArray(lights) ? lights : [lights]

        for (let l of _lights) {
            l.updateBuffer()
            if (!l.GPUBuffer) {
                this
                    .createAndWriteBuffer(l.buffer)
                    .createBindGroupLayoutEntries(l.buffer, l.bindGroupLayout.entries)
                    .createBindGroupLayout(l, l.bindGroupLayout.entries)
                    .createBindGroupEntries(l.buffer, l.bindGroup.entries)
                    .createBindGroup(l, l.bindGroup.entries)
            }
        }
    }

    bindMeshesResources(meshes) {
        const _meshes = Array.isArray(meshes) ? meshes : [meshes]

        for (let mesh of _meshes) {
            if (mesh.isMesh) {
                mesh.updateMatrixWorld()
                mesh.updateBuffer()
            }

            if (!mesh.GPUBuffer) {
                this.createAndWriteBuffer(mesh.buffer)
                    .createBindGroupLayoutEntries(mesh.buffer, mesh.bindGroupLayout.entries)
                    .createBindGroupLayout(mesh, mesh.bindGroupLayout.entries)
                    .createBindGroupEntries(mesh.buffer, mesh.bindGroup.entries)
                    .createBindGroup(mesh, mesh.bindGroup.entries)
            }

            const { geometry, material } = mesh

            if (!geometry.vertexBufferLayout) {
                geometry.attributes.forEach(attribute => {
                    this.createAndWriteBuffer(attribute)
                })
                this.createAndWriteBuffer(geometry.index)
                    .createVertexBufferLayout(geometry)
            }

            if (!material.shaderModule) {
                material.shaderModule = this.createShaderModule(material.shader)
            }

            const { buffers, textures, samplers } = material

            buffers.forEach(buffer => {
                if (!buffer.GPUBuffer) {
                    this.createAndWriteBuffer(buffer)
                }
                this.createBindGroupLayoutEntries(buffer, material.bindGroupLayout.entries)
                    .createBindGroupEntries(buffer, material.bindGroup.entries)
            })

            textures.forEach(texture => {
                if (!texture.GPUTexture) {
                    this.createAndWriteTexture(texture)
                }
                this.createBindGroupLayoutEntries(texture, material.bindGroupLayout.entries)
                    .createBindGroupEntries(texture, material.bindGroup.entries)
            })

            samplers.forEach(sampler => {
                if (!this.GPUSampler) {
                    this.createSampler(sampler)
                }

                this.createBindGroupLayoutEntries(sampler, material.bindGroupLayout.entries)
                    .createBindGroupEntries(sampler, material.bindGroup.entries)
            })

            this.createBindGroupLayout(material, material.bindGroupLayout.entries)
                .createBindGroup(material, material.bindGroup.entries)

        }
    }

    bindComputeResources(compute) {
        const { buffers, textures, shader } = compute

        compute.shaderModule = this.createShaderModule(shader)

        buffers.forEach(buffer => {
            if (!buffer.GPUBuffer) {
                this.createAndWriteBuffer(buffer)
            }
            this.createBindGroupLayoutEntries(buffer, compute.bindGroupLayout.entries)
                .createBindGroupEntries(buffer, compute.bindGroup.entries)
        })

        textures.forEach(texture => {
            if (!texture.GPUTexture) {
                this.createAndWriteTexture(texture)
            }
            this.createBindGroupLayoutEntries(texture, compute.bindGroupLayout.entries)
                .createBindGroupEntries(texture, compute.bindGroup.entries)
        })

        this.createBindGroupLayout(compute, compute.bindGroupLayout.entries)
            .createBindGroup(compute, compute.bindGroup.entries)
    }
}

export default WebGPUInstance