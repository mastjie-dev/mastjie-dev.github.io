
class BaseGeometry {
    constructor(name) {
        this.name = name
        this.isGeometry = true
        this.isBind = false
        this.uuid = crypto.randomUUID()

        this.attributes = []
        this.index = null
        this.vertexBufferLayout = null
    }

    addAttributes(bufferCore) {
        this.attributes.push(bufferCore)
    }

    addIndex(bufferCore) {
        this.index = bufferCore
    }

    setVertexBufferLayout(vertexBufferLayout) {
        this.vertexBufferLayout = vertexBufferLayout
    }

    createVertexBufferLayout() {
        this.vertexBufferLayout = this.attributes.map((a, i) => {
            return {
                arrayStride: a.arrayStride,
                attributes: [{
                    format: a.format,
                    offset: a.offset,
                    shaderLocation: i
                }]
            }
        })
    }
}

export default BaseGeometry