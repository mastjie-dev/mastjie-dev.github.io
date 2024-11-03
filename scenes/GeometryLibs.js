import { VertexBuffer, IndexBuffer } from "../cores/BufferCore.js"
import Vector3 from "../math/Vector3.js"
import BaseGeometry from "./BaseGeometry.js"

function createPlaneInternal(
    horizontal = 1, vertical = 1, widthSegment = 1, heightSegment = 1, face = {}) {
    const position = []
    const normal = []
    const uv = []
    const index = []

    const halfWidth = horizontal / 2
    const halfHeight = vertical / 2

    const widthStep = horizontal / widthSegment
    const heightStep = vertical / heightSegment

    const widthVertices = widthSegment + 1
    const heightVertices = heightSegment + 1

    const uvxStep = 1 / widthSegment
    const uvyStep = 1 / heightSegment
    let uvx = 0
    let uvy = 0

    const faceDir = face.dir || "front"
    const faceOff = face.off || 0

    for (let y = 0; y < heightVertices; y++) {
        for (let x = 0; x < widthVertices; x++) {
            let px, py, pz
            let nr = []

            switch (faceDir) {
                case "front":
                    px = -halfWidth + widthStep * x
                    py = -halfHeight + heightStep * y
                    pz = faceOff
                    nr.push(0, 0, -1)
                    break
                case "back":
                    px = halfWidth - widthStep * x
                    py = -halfHeight + heightStep * y
                    pz = faceOff
                    nr.push(0, 0, 1)
                    break
                case "up":
                    px = -halfWidth + widthStep * x
                    py = faceOff
                    pz = halfHeight - heightStep * y
                    nr.push(0, -1, 0)
                    break
                case "down":
                    px = -halfWidth + widthStep * x
                    py = faceOff
                    pz = -halfHeight + heightStep * y
                    nr.push(0, 1, 0)
                    break
                case "right":
                    px = faceOff
                    py = -halfHeight + heightStep * y
                    pz = -halfWidth + widthStep * x
                    nr.push(1, 0, 0)
                    break
                case "left":
                    px = faceOff
                    py = -halfHeight + heightStep * y
                    pz = halfWidth - widthStep * x
                    nr.push(-1, 0, 0)
                    break
            }

            position.push(px, py, pz)
            normal.push(...nr)

            uv.push(uvx, uvy)
            uvx += uvxStep
        }
        uvx = 0
        uvy += uvyStep
    }

    for (let y = 0; y < heightSegment; y++) {
        for (let x = 0; x < widthSegment; x++) {
            /**
             *  v1____v4
             *  |\   |
             *  | \  |
             *  |  \ |
             *  |__ \|
             *  v2   v3
             * 
             */
            const v1 = x + y * widthVertices
            const v2 = v1 + widthVertices
            const v3 = v2 + 1
            const v4 = v1 + 1

            index.push(v1, v2, v3, v3, v4, v1)
        }
    }

    return {
        position: new Float32Array(position),
        normal: new Float32Array(normal),
        uv: new Float32Array(uv),
        index: new Uint32Array(index)
    }
}

function createPlane(
    horizontal = 1, vertical = 1, widthSegment = 1, heightSegment = 1, face = {}) 
{
    const { position, normal, uv, index} = createPlaneInternal(
        horizontal, vertical, widthSegment, heightSegment, face)

    const geometry = new BaseGeometry("plane geometry")
    geometry.addAttributes(new VertexBuffer("position", new Float32Array(position)))
    geometry.addAttributes(new VertexBuffer("normal", new Float32Array(normal)))
    geometry.addAttributes(new VertexBuffer("uv", new Float32Array(uv), "float32x2"))
    geometry.addIndex(new IndexBuffer(new Uint32Array(index)))

    return geometry
}

function createBox(
    width = 1, height = 1, depth = 1, widthSegment = 1,
    heightSegment = 1, depthSegment = 1) 
{
    const w = width
    const h = height
    const d = depth
    const ws = widthSegment
    const hs = heightSegment
    const ds = depthSegment

    const fr = createPlaneInternal(w, h, ws, hs, { dir: "front", off: -d / 2 })
    const bc = createPlaneInternal(w, h, ws, hs, { dir: "back", off: d / 2 })
    const up = createPlaneInternal(w, d, ws, ds, { dir: "up", off: -h / 2 })
    const dw = createPlaneInternal(w, d, ws, ds, { dir: "down", off: h / 2 })
    const lf = createPlaneInternal(d, h, ds, hs, { dir: "left", off: -w / 2 })
    const rg = createPlaneInternal(d, h, ds, hs, { dir: "right", off: w / 2 })

    const faces = [fr, bc, up, dw, lf, rg]
    const position = []
    const normal = []
    const uv = []
    const index = []
    let length = 0

    for (let f of faces) {
        position.push(...f.position)
        normal.push(...f.normal)
        uv.push(...f.uv)

        f.index.forEach(idx => index.push(idx + length))
        length += f.position.length / 3
    }

    const geometry = new BaseGeometry("box geometry")
    geometry.addAttributes(new VertexBuffer("position", new Float32Array(position)))
    geometry.addAttributes(new VertexBuffer("normal", new Float32Array(normal)))
    geometry.addAttributes(new VertexBuffer("uv", new Float32Array(uv), "float32x2"))
    geometry.addIndex(new IndexBuffer(new Uint32Array(index)))

    return geometry
}

function createSphereCube(radius = 1, segment = 2) {
    const sg = segment < 2 ? 2 : segment
    const off = radius / 2

    const fr = createPlaneInternal(radius, radius, sg, sg, { dir: "front", off: -off })
    const bc = createPlaneInternal(radius, radius, sg, sg, { dir: "back", off: off })
    const up = createPlaneInternal(radius, radius, sg, sg, { dir: "up", off: -off })
    const dw = createPlaneInternal(radius, radius, sg, sg, { dir: "down", off: off })
    const lf = createPlaneInternal(radius, radius, sg, sg, { dir: "left", off: -off })
    const rg = createPlaneInternal(radius, radius, sg, sg, { dir: "right", off: off })

    const faces = [fr, bc, up, dw, lf, rg]
    const position = []
    const normal = []
    const uv = []
    const index = []
    let length = 0

    const v3 = new Vector3()
    for (let f of faces) {
        for (let i = 0; i < f.position.length; i += 3) {
            v3.set(f.position[i], f.position[i + 1], f.position[i + 2])
            v3.normalize()
            normal.push(v3.x, v3.y, v3.z)
            v3.multiplyScalar(radius)
            position.push(v3.x, v3.y, v3.z)
        }

        uv.push(...f.uv)
        f.index.forEach(idx => index.push(idx + length))
        length += f.position.length / 3
    }

    const geometry = new BaseGeometry("sphere cube geometry")
    geometry.addAttributes(new VertexBuffer("position", new Float32Array(position)))
    geometry.addAttributes(new VertexBuffer("normal", new Float32Array(normal)))
    geometry.addAttributes(new VertexBuffer("uv", new Float32Array(uv), "float32x2"))
    geometry.addIndex(new IndexBuffer(new Uint32Array(index)))

    return geometry
}

function createGrid(dimension = 100, gridSize = 5) {
    const segment = Math.round(dimension / gridSize)
    const isOdd = segment % 2
    const d = isOdd ? dimension + segment : dimension
    const s = isOdd ? segment + 1 : segment
    const vertices = s + 1
    const { position } = createPlaneInternal(d, d, s, s, {
        dir: "up"
    })

    const index = []
    for (let y = 0; y < s; y++) {
        for (let x = 0; x < s; x++) {
            const v1 = x + y * vertices
            const v2 = v1 + vertices
            const v3 = v2 + 1
            const v4 = v1 + 1

            index.push(v1, v2, v2, v3, v3, v4, v4, v1)
        }
    }

    const geometry = new BaseGeometry("grid geometry")
    geometry.addAttributes(new VertexBuffer("position", new Float32Array(position)))
    geometry.addIndex(new IndexBuffer(new Uint32Array(index)))

    return geometry
}

function createBoxLine(width = 1, height = 1, depth = 1) {
    const x = .5 * width
    const y = .5 * height
    const z = .5 * depth
    const position = new Float32Array([
        -x, -y, -z, x, -y, -z,
        -x, y, -z, x, y, -z,
        -x, -y, z, x, -y, z,
        -x, y, z, x, y, z,
    ])
    const index = new Uint32Array([
        0, 1, 0, 2, 1, 3, 2, 3, // front
        4, 5, 4, 6, 5, 7, 6, 7, // back
        0, 4, 1, 5, 2, 6, 3, 7, // side
    ])

    const geometry = new BaseGeometry("box line geometry")
    geometry.addAttributes(new VertexBuffer("position", position))
    geometry.addIndex(new IndexBuffer(index))

    return geometry
}

const GeometryLibs = {
    createPlane,
    createBox,
    createGrid,
    createBoxLine,
    createSphereCube,
}

export default GeometryLibs