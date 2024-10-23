
function clone() {
    return {
        colorAttachments: [{
            view: null,
            clearValue: [0, 0, 0, 0],
            loadOp: "clear",
            storeOp: "store"
        }],
        depthStencilAttachment: {
            view: null,
            depthClearValue: 1,
            depthLoadOp: "clear",
            depthStoreOp: "store",
            stencilClearValue: 0,
            stencilLoadOp: 'clear',
            stencilStoreOp: 'store',
        }
    }
}

function disableColorAttachment(descriptor) {
    descriptor.colorAttachments = []
}

function disableDepthStencilAttachment(descriptor) {
    descriptor.depthStencilAttachment = undefined
}

function disableDepth(descriptor) {
    descriptor.depthStencilAttachment.depthClearValue = undefined
    descriptor.depthStencilAttachment.depthLoadOp = undefined
    descriptor.depthStencilAttachment.depthStoreOp = undefined
}

function disableStencil(descriptor) {
    descriptor.depthStencilAttachment.stencilClearValue = undefined
    descriptor.depthStencilAttachment.stencilLoadOp = undefined
    descriptor.depthStencilAttachment.stencilStoreOp = undefined
}

function modifyColorAttachment(descriptor, key, value, index = 0) {
    descriptor.colorAttachments[index][key] = value
}

function modifyDepthStencilAttachment(descriptor, key, value) {
    descriptor.depthStencilAttachment[key] = value
}

function timestampWrites(descriptor, querySet) {
    descriptor.timestampWrites = {
        querySet: querySet.GPUQuerySet,
        beginningOfPassWriteIndex: 0,
        endOfPassWriteIndex: 1,
    }
}

const RenderPassDescriptorBuilder = {
    clone,
    disableColorAttachment,
    disableDepthStencilAttachment,
    disableDepth,
    disableStencil,
    modifyColorAttachment,
    modifyDepthStencilAttachment,
    timestampWrites
}

export { RenderPassDescriptorBuilder }