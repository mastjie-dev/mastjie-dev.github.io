import BaseMaterial from "./BaseMaterial.js"
import {UniformBuffer} from "../cores/BufferCore.js"
import Vector3 from "../math/Vector3.js"

import unlitShader from '../shaders/unlitShader.js'
import lineShader from '../shaders/lineShader.js'

function unlit(options = {}) {
    const color = options.color || new Vector3(1, 1, 1)

    const material = new BaseMaterial("unlit")
    material.shader = unlitShader
    material.addBuffer(new UniformBuffer(new Float32Array(color.toArray())))
    
    return material
}

function line(options = {}) {
    const color = options.color || new Vector3(1, 1, 1)
    
    const material = new BaseMaterial("line")
    material.shader = lineShader
    material.topology = "line-list"
    material.addBuffer(new UniformBuffer(new Float32Array(color.toArray())))
    
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