import BaseMaterial from "./BaseMaterial.js"
import BufferCore from "../cores/BufferCore.js"
import VARS from "../cores/VARS"
import Vector3 from "../math/Vector3"

import unlitShader from '../shaders/unlitShader.js'
import lineShader from '../shaders/lineShader.js'

function unlit(options = {}) {
    const color = options.color || new Vector3(1, 1, 1)

    const material = new BaseMaterial("unlit")
    material.shader = unlitShader
    material.addBuffer(new BufferCore("color", "uniform",
        new Float32Array(color.toArray()), VARS.Buffer.Uniform))
    
    return material
}

function line(options = {}) {
    const color = options.color || new Vector3(1, 1, 1)
    
    const material = new BaseMaterial("line")
    material.shader = lineShader
    material.topology = "line-list"
    material.addBuffer(new BufferCore("color", "uniform",
        new Float32Array(color.toArray()), VARS.Buffer.Uniform))
    
    return material
}

function blinnPhong() {}

function vertexColors() {}

const MaterialLibs = {
    unlit,
    line,
    blinnPhong,
    vertexColors,
}

export default MaterialLibs