import { VertexBuffer, IndexBuffer } from "../cores/BufferCore.js"
import BaseGeometry from "./BaseGeometry.js"
import MaterialLibs from './MaterialLibs.js'
import GeometryLibs from "./GeometryLibs.js"
import Mesh from './Mesh.js'
import Vector3 from "../math/Vector3.js"

function grid(dimension, gridSize, color) {
    const geometry = GeometryLibs.createGrid(dimension, gridSize)
    const material = MaterialLibs.line({ color })

    const mesh = new Mesh(geometry, material)
    return mesh
}

function axis(scale = 5) {
    const position = new Float32Array([
        0, 0, 0, 0, 0, scale,
        0, 0, 0, 0, scale, 0,
        0, 0, 0, scale, 0, 0,
    ])
    const color = new Float32Array([
        0, 0, 1, 0, 0, 1,
        0, 1, 0, 0, 1, 0,
        1, 0, 0, 1, 0, 0
    ])
    const index = new Uint32Array([0, 1, 2, 3, 4, 5])

    const geometry = new BaseGeometry("axis geometry")
    geometry.addAttributes(new VertexBuffer("position", position))
    geometry.addAttributes(new VertexBuffer("color", color))
    geometry.addIndex(new IndexBuffer(index))

    const material = MaterialLibs.vertexColors()
    material.topology = "line-list"

    const mesh = new Mesh(geometry, material)
    return mesh
}

function normalVisualizer(mesh, scale = 1, color = new Vector3(1, 0, 0)) {
    // assume 0 & 1 attributes are position & normal
    const pos = mesh.geometry.attributes[0].data
    const nor = mesh.geometry.attributes[1].data
    const len = pos.length

    const position = []
    const index = []

    let i = 0
    for (let j = 0; j < len; j += 3) {
        const p = new Vector3().setFromArrayIndex(pos, j).multiplyScalar(scale)
        const n = new Vector3().setFromArrayIndex(nor, j).add(p)

        position.push(...p.toArray(), ...n.toArray())
        index.push(i, i + 1)
        i+=2
    }

    const geometry = new BaseGeometry("normal geometry")
    geometry.addAttributes(new VertexBuffer("position", new Float32Array(position)))
    geometry.addIndex(new IndexBuffer(new Uint32Array(index)))

    const material = MaterialLibs.line({ color })

    return new Mesh(geometry, material)
}

function boxHelper(color = new Vector3(1, 0, 0)) {
    const geometry = GeometryLibs.createBoxLine(1, 1, 1)
    for (let i = 0; i < 24; i += 3) {
        geometry.attributes[0].data[i + 0] *= 2
        geometry.attributes[0].data[i + 1] *= 2
        geometry.attributes[0].data[i + 2] += .5
    }
    const material = new MaterialLibs.line({ color })

    const mesh = new Mesh(geometry, material)

    return mesh
}

const Helper = {
    grid,
    axis,
    normalVisualizer,
    boxHelper,
}

export default Helper