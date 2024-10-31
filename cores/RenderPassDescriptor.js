
class RenderPassDescriptor {
    constructor() {
        this.descriptor = {
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

    get() {
        return this.descriptor
    }

    disableColorAttachment() {
        this.descriptor.colorAttachments = []
    }

    disableDepthStencilAttachment() {
        this.descriptor.depthStencilAttachment = undefined
    }

    disableDepth() {
        this.descriptor.depthStencilAttachment.depthClearValue = undefined
        this.descriptor.depthStencilAttachment.depthLoadOp = undefined
        this.descriptor.depthStencilAttachment.depthStoreOp = undefined
    }
    
    disableStencil() {
        this.descriptor.depthStencilAttachment.stencilClearValue = undefined
        this.descriptor.depthStencilAttachment.stencilLoadOp = undefined
        this.descriptor.depthStencilAttachment.stencilStoreOp = undefined
    }
    
    setClearValue(r, g, b, a, index = 0) {
        this.descriptor.colorAttachments[index].clearValue = [r, g, b, a]
    }
    
    modifyDepthStencilAttachment(key, value) {
        this.descriptor.depthStencilAttachment[key] = value
    }
    
    timestampWrites(querySet) {
        this.descriptor.timestampWrites = {
            querySet: querySet.GPUQuerySet,
            beginningOfPassWriteIndex: 0,
            endOfPassWriteIndex: 1,
        }
    }

    setCAView(view, index = 0) {
        this.descriptor.colorAttachments[index].view = view
    }

    setDSAView(view) {
        this.descriptor.depthStencilAttachment.view = view
    }
}

export default RenderPassDescriptor