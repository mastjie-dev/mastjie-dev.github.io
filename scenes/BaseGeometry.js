
class BaseGeometry {
    constructor(name) {
        this.name = name
        this.isGeometry = true
        
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
}

export default BaseGeometry