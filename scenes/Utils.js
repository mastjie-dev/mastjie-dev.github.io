
const bindResource = (instance, owner, resource) => {
    if (resource.isBuffer && !resource.GPUBuffer) {
        instance.createAndWriteBuffer(resource)
    } else if (resource.isTexture && !resource.GPUTexture) {
        instance.createAndWriteTexture(resource)
    } else if (resource.isSampler) {
        instance.createSampler(resource)
    }

    instance
        .createBindGroupLayoutEntries(resource, owner.bindGroupLayout.entries)
        .createBindGroupLayout(owner, owner.bindGroupLayout.entries)
        .createBindGroupEntries(resource, owner.bindGroup.entries)
        .createBindGroup(owner, owner.bindGroup.entries)
}

const bindVertex = (instance, geometry) => {
    for (let attr of geometry.attributes) {
        instance.createAndWriteBuffer(attr)
    }
    instance.createAndWriteBuffer(geometry.index)
    instance.createVertexBufferLayout(geometry)
}

export { bindResource, bindVertex }