class PipelineCore {
    constructor(label = "") {
        this.label = label
        this.material = null
        this.lightGroup = null
        this.camera = null
        this.instance = null
        this.format = "bgra8unorm"

        this.meshes = []
        this.primitives = []
    }

    setMaterial(material) {
        this.material = material
    }

    setCamera(camera) {
        this.camera = camera
    }

    setLightGroup(lightGroup) {
        this.lightGroup = lightGroup
    }

    addMesh(mesh) {
        this.meshes.push(mesh)
        const primitive = this.primitives.find(p => p.geometry === mesh.geometry)

        if (primitive) {
            primitive.meshes.push(mesh)
            return
        }
        else {
            this.primitives.push({
                geometry: mesh.geometry,
                meshes: [mesh]
            })
        }
    }

    getBindGroupLayouts() {
        const bgl = this.lightGroup
            ? [this.material, this.lightGroup, this.camera, this.meshes[0]]
            : [this.material, this.camera, this.meshes[0]]
        return bgl
    }

    getPipelineDescriptor(pipelineLayout) {
        const desc = {
            label: "",
            layout: pipelineLayout,
            vertex: {
                module: this.material.shaderModule,
                entryPoint: "main_vertex",
                buffers: this.meshes[0].geometry.vertexBufferLayout,
            },
            primitive: {
                cullMode: this.material.cullMode,
                topology: this.material.topology,
            }
        }

        if (this.material.fragmentEnabled) {
            desc.fragment = {
                module: this.material.shaderModule,
                entryPoint: "main_fragment",
                targets: [{ format: this.format }]
            }
        }

        if (this.material.depthWriteEnabled) {
            desc.depthStencil = {
                depthWriteEnabled: this.material.depthWriteEnabled,
                format: this.material.depthFormat,
                depthCompare: this.material.depthCompare
            }
        }

        return desc
    }
}

export default PipelineCore

