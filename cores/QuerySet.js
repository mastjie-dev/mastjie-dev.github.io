import BufferCore from "./BufferCore"

class QuerySet {
    constructor() {
        this.type = "timestamp"
        this.count = 2

        const data = new BigInt64Array(this.count)
        this.resolve = new BufferCore("resolve", "query", data, {
            usage: GPUBufferUsage.QUERY_RESOLVE | GPUBufferUsage.COPY_SRC
        })
        this.result = new BufferCore("result", "query", data, {
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
        })

        this.GPUQuerySet = null
    }
}

export default QuerySet