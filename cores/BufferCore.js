
class BufferCore {
  constructor(name, type, data, options = {}) {
    this.isBuffer = true
    this.GPUBuffer = null
    this.data = data

    this.name = name
    this.type = type
    this.size = data.byteLength
    this.length = data.length

    this.usage = options.usage || null
    this.format = options.format || null
    this.visibility = options.visibility || null
    this.arrayStride = options.arrayStride || 0
    this.mappedAtCreation = options.mappedAtCreation || false
    this.offset = 0
    this.shaderLocation = 0
  }

  setGPUBuffer(buffer) {
    this.GPUBuffer = buffer
  }

  setShaderLocation(num) {
    this.shaderLocation = num
    return this
  }

  destroy() {
    this.GPUBuffer.destroy()
  }
}

export default BufferCore