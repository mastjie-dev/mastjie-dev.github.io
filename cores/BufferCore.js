
class BufferCore {
  constructor(type, data) {
    this.isBuffer = true
    this.GPUBuffer = null
    this.data = data

    this.name = ""
    this.type = type
    this.size = data.byteLength
    this.length = data.length

    this.usage = null
    this.format = null
    this.visibility = null
    this.arrayStride = 0
    this.mappedAtCreation = false
    this.offset = 0
    this.shaderLocation = 0
  }

  setGPUBuffer(buffer) {
    this.GPUBuffer = buffer
  }

  destroy() {
    this.GPUBuffer.destroy()
  }
}

class VertexBuffer extends BufferCore {
  constructor(name, data, format = "float32x3") {
    super("vertex", data)
    
    this.name = name
    this.format = format
    this.arrayStride = format === "float32x3" ? 12 : 8
    this.usage = GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
  }
}

class IndexBuffer extends BufferCore {
  constructor(data, format = "uint32") {
    super("index", data)

    this.format = format
    this.usage = GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST
  }
}

class UniformBuffer extends BufferCore {
  constructor(data) {
    super("uniform", data)

    this.usage = GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    this.visibility = GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT
  }
}

class StorageBuffer extends BufferCore {
  constructor(data) {
    super("storage", data)
    
    this.usage = GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC,
    this.visibility = GPUShaderStage.COMPUTE
  }
}

export { BufferCore, VertexBuffer, IndexBuffer, UniformBuffer, StorageBuffer }