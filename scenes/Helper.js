import BufferCore from "../cores/BufferCore.js"
import BaseGeometry from "./BaseGeometry.js"
import BaseMaterial from "./BaseMaterial.js"
import Mesh from "./Mesh.js"
import GeometryUtils from "./GeometryUtils.js"
import VARS from "../cores/VARS"

const gridHelper = (dimension = 100, size = 1) => {
    const segment = dimension / size
    const vertices = segment + 1
    const plane = GeometryUtils.createPlane(dimension, dimension, segment, segment, { dir: "up" })

    const index = []
    for (let y = 0; y < segment; y++) {
        for (let x = 0; x < segment; x++) {
            const v1 = x + y * vertices
            const v2 = v1 + vertices
            const v3 = v2 + 1
            const v4 = v1 + 1

            index.push(v1, v2, v2, v3, v3, v4, v4, v1)
        }
    }

    const geometry = new BaseGeometry("grid geometry")
    geometry.addAttributes(
        new BufferCore("position", "attribute", plane.position, VARS.Buffer.Attribute32x3))
    geometry.addAttributes(
        new BufferCore("uv", "attribute", plane.uv, VARS.Buffer.Attribute32x2))
    geometry.addIndex(
        new BufferCore("index", "index", new Uint16Array(index), VARS.Buffer.IndexUint16))

    const material = new BaseMaterial("grid material")
    material.topology = "line-list"
    material.cullMode = "none"
    material.addBuffer(
        new BufferCore("white", "uniform", new Float32Array([1, 1, 1]), VARS.Buffer.Uniform))

    return new Mesh(geometry, material)
}

export default gridHelper