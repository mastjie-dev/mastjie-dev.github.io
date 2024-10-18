import { VertexBuffer, IndexBuffer, UniformBuffer } from "../cores/BufferCore"
import BaseGeometry from "../scenes/BaseGeometry"
import BaseMaterial from "../scenes/BaseMaterial"
import MaterialLibs from "../scenes/MaterialLibs"
import Mesh from "../scenes/Mesh"

import NodeCore from "../scenes/NodeCore"
import unlitShader from "../shaders/unlitShader"

const COMPONENT_TYPE = {
    INT8: 5120,
    UINT8: 5121,
    INT16: 5122,
    UINT16: 5123,
    UINT32: 5125,
    FLT32: 5126,
}

const TYPE = {
    SCALAR: "SCALAR",
    VEC2: "VEC2",
    VEC3: "VEC3",
    VEC4: "VEC4",
    MAT2: "MAT2",
    MAT3: "MAT3",
    MAT4: "MAT4"
}

class GLTFLoader {
    constructor() {
        this.json = null
        this.materials = []
    }

    async load(url, filename) {
        const stream = await fetch(`${url}/${filename}`)
        const ct = stream.headers.get("content-type")

        // TODO: handle glb

        const json = await stream.json()
        const blob = await fetch(`${url}/${json.buffers[0].uri}`)
        const bin = await blob.blob()
        const buffer = await bin.arrayBuffer()

        this.buildMaterial(json)

        const roots = []
        for (let scene of json.scenes) {
            for (let index of scene.nodes) {
                const parent = new NodeCore()
                this.buildNode(json, new Uint8Array(buffer), index, parent)
                roots.push(parent)
            }
        }

        return roots
    }

    getFormat(format, type) {
        switch (type) {
            case TYPE.VEC2:
                format += "x2"
                break
            case TYPE.VEC3:
                format += "x3"
                break
            case TYPE.VEC4:
                format += "x4"
                break
        }
        return format
    }

    getSliceBuffer(json, buffer, index) {
        const bufferView = json.bufferViews[index]
        const accessor = json.accessors[index].bufferView === index
            ? json.accessors[index]
            : json.accessor.find(x => x.bufferView === index)
        const slice = buffer.slice(bufferView.byteOffset, bufferView.byteOffset
            + bufferView.byteLength)

        let data
        let format
        switch (accessor.componentType) {
            case COMPONENT_TYPE.INT8:
                data = new Int8Array(slice.buffer)
                format = this.getFormat("sint8", accessor.type)
                break
            case COMPONENT_TYPE.UINT8:
                data = new Uint8Array(slice.buffer)
                format = this.getFormat("uint8", accessor.type)
                break
            case COMPONENT_TYPE.INT16:
                data = new Int16Array(slice.buffer)
                format = this.getFormat("sint16", accessor.type)
                break
            case COMPONENT_TYPE.UINT16:
                data = new Uint16Array(slice.buffer)
                format = this.getFormat("uint16", accessor.type)
                break
            case COMPONENT_TYPE.UINT32:
                data = new Uint32Array(slice.buffer)
                format = this.getFormat("uint32", accessor.type)
                break
            case COMPONENT_TYPE.FLT32:
                data = new Float32Array(slice.buffer)
                format = this.getFormat("float32", accessor.type)
                break
        }

        return { format, data }
    }

    buildMaterial(json) {
        if (json.materials) {
            for (let gMat of json.materials) {
                const color = gMat.pbrMetallicRoughness.baseColorFactor
                color.pop()

                const material = new BaseMaterial(gMat.name)
                material.shader = unlitShader
                material.addBuffer(new UniformBuffer(new Float32Array(color)))
                this.materials.push(material)
            }
        }
    }

    buildNode(json, buffer, index, parent) {
        const node = json.nodes[index]
        const mesh = json.meshes[node.mesh]
        const { attributes: attrs, indices, material: matIndex } = mesh.primitives[0]

        const geometry = new BaseGeometry()
        for (let key in attrs) {
            const idx = attrs[key]

            const slice = this.getSliceBuffer(json, buffer, idx)
            const vbName = key === "TEXCOORD_0" ? "uv" : key.toLowerCase()

            const vertexBuffer = new VertexBuffer(vbName, slice.data, slice.format)
            geometry.addAttributes(vertexBuffer)
        }

        const slice = this.getSliceBuffer(json, buffer, indices)
        const indexBuffer = new IndexBuffer(slice.data, slice.format)
        geometry.addIndex(indexBuffer)


        const material = matIndex !== undefined ? this.materials[matIndex] : MaterialLibs.unlit()
        const meshNode = new Mesh(geometry, material, node.name)
        parent.addChild(meshNode)

        if (node.translation) {
            meshNode.position.setFromArray(node.translation)
        }

        if (node.rotation) {
            meshNode.rotation.setFromArray(node.rotation)
        }

        if (node.scale) {
            meshNode.scale.setFromArray(node.scale)
        }

        if (node.children) {
            for (let _index of node.children) {
                this.buildNode(json, buffer, _index, meshNode)
            }
        }
    }
}

export default GLTFLoader


