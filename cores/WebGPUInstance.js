import { PipelineDescriptorBuilder } from "./Builder.js"

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
        if (!textureCore.isWriteable) {
            return this
        }

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

    createBindGroupLayoutEntries(resource, owner) {
        const entries = owner.bindGroupLayout.entries
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

    createBindGroupEntries(resource, owner) {
        const entries = owner.bindGroup.entries
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

    createBindGroupLayout(owner) {
        const entries = owner.bindGroupLayout.entries
        const bgl = this.device.createBindGroupLayout({
            label: owner.name,
            entries,
        })
        owner.bindGroupLayout.set(bgl)
        return this
    }

    createBindGroup(owner) {
        const entries = owner.bindGroup.entries
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

    createPipelineLayout(...owners) {
        const bindGroupLayouts = owners.map(ow => ow.bindGroupLayout.GPUBindGroupLayout)
        return this.device.createPipelineLayout({
            bindGroupLayouts
        })
    }

    createRenderPipeline(pipelineCore) {
        const pipelineLayout = this.createPipelineLayout(
            ...pipelineCore.getBindGroupLayouts())

        const pipelineDescriptor = pipelineCore.getPipelineDescriptor(pipelineLayout)
        pipelineCore.instance = this.device.createRenderPipeline(pipelineDescriptor)
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

    bindComputeResources(compute) {
        const { buffers, textures, shader } = compute

        compute.shaderModule = this.createShaderModule(shader)

        buffers.forEach(buffer => {
            this.createAndWriteBuffer(buffer)
                .createBindGroupLayoutEntries(buffer, compute.bindGroupLayout.entries)
                .createBindGroupEntries(buffer, compute.bindGroup.entries)
        })

        textures.forEach(texture => {
            this.createAndWriteTexture(texture)
                .createBindGroupLayoutEntries(texture, compute.bindGroupLayout.entries)
                .createBindGroupEntries(texture, compute.bindGroup.entries)
        })

        this.createBindGroupLayout(compute, compute.bindGroupLayout.entries)
            .createBindGroup(compute, compute.bindGroup.entries)
    }

    bindMesh(...meshes) {
        meshes.forEach(mesh => {
            if (!mesh.isBind) {
                mesh.updateMatrixWorld()
                mesh.updateBuffer()

                this.createBuffer(mesh.buffer)
                    .writeBuffer(mesh.buffer)
                    .createBindGroupLayoutEntries(mesh.buffer, mesh)
                    .createBindGroupEntries(mesh.buffer, mesh)
                    .createBindGroupLayout(mesh)
                    .createBindGroup(mesh)
                mesh.isBind = true

                if (!mesh.geometry.isBind) {
                    const geometry = mesh.geometry
                    geometry.createVertexBufferLayout()
                    const buffers = [...geometry.attributes, geometry.index]
                    for (let buffer of buffers) {
                        this.createBuffer(buffer).writeBuffer(buffer)
                    }
                    geometry.isBind = true
                }

                if (!mesh.material.isBind) {
                    const material = mesh.material

                    const buffers = material.buffers
                    for (let buffer of buffers) {
                        if (!buffer.GPUBuffer) {
                            this.createBuffer(buffer)
                                .writeBuffer(buffer)
                                .createBindGroupLayoutEntries(buffer, material)
                                .createBindGroupEntries(buffer, material)
                        }
                    }

                    const textures = material.textures
                    for (let texture of textures) {
                        if (!texture.GPUBuffer) {
                            this.createTexture(texture)
                                .writeTexture(texture)
                                .createBindGroupLayoutEntries(texture, material)
                                .createBindGroupEntries(texture, material)
                        }
                    }

                    const samplers = material.samplers
                    for (let sampler of samplers) {
                        if (!sampler.GPUSampler) {
                            this.createSampler(sampler)
                                .createBindGroupLayoutEntries(sampler, material)
                                .createBindGroupEntries(sampler, material)
                        }
                    }

                    this.createBindGroupLayout(material).createBindGroup(material)
                    material.shaderModule = this.createShaderModule(material.shader)
                    material.isBind = true
                }
            }
        })
    }

    bindCamera(...cameras) {
        cameras.forEach(camera => {
            if (!camera.isBind) {
                camera.updateProjectionMatrix()
                camera.updateViewMatrix()
                camera.isBind = true

                this.createBuffer(camera.buffer)
                    .writeBuffer(camera.buffer)
                    .createBindGroupLayoutEntries(camera.buffer, camera)
                    .createBindGroupEntries(camera.buffer, camera)
                    .createBindGroupLayout(camera)
                    .createBindGroup(camera)
            }
        })
    }

    bindLightGroup(...lightGroups) {
        lightGroups.forEach(lightGroup => {
            if (!lightGroup.isBind) {
                lightGroup.lights.forEach(light => {

                    if (!light.isBind) {
                        light.updateBuffer()
                        light.isBind = true

                        this.createBuffer(light.buffer)
                            .writeBuffer(light.buffer)
                            .createBindGroupLayoutEntries(light.buffer, lightGroup)
                            .createBindGroupEntries(light.buffer, lightGroup)
                    }
                })

                this.createBindGroupLayout(lightGroup)
                    .createBindGroup(lightGroup)
                lightGroup.isBind = true
            }
        })
    }
}

export default WebGPUInstance