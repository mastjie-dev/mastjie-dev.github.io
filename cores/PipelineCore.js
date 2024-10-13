class PipelineCore {
    constructor(label = "") {
        this.label = label
        this.material = null
        this.lightGroup = null
        this.camera = null
        this.meshes = []
        this.format = "bgra8unorm"
        this.instance = null

        this.primitives = []

        this.enabledFragment = true
        this.enabledDepthStencil = true
        this.enabledPrimitive = true

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

    addMesh(...meshes) {
        meshes.forEach(mesh => {
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
        })
    }

    getBindGroupLayouts() {
        const bgl = this.lightGroup
            ? [this.meshes[0].material, this.lightGroup, this.camera, this.meshes[0]]
            : [this.meshes[0].material, this.camera, this.meshes[0]]
        return bgl
    }

    getPipelineDescriptor(pipelineLayout) {    
        if (!this.material) {
            this.material = this.meshes[0].material
        }
        
        const pd = {
            label: "",
            layout: pipelineLayout,
            vertex: {
                module: this.material.shaderModule,
                entryPoint: "main_vertex",
                buffers: this.meshes[0].geometry.vertexBufferLayout,
            }
        }

        if (this.enabledFragment) {
            pd.fragment = {
                module: this.material.shaderModule,
                entryPoint: "main_fragment",
                targets: [{ format: this.format }]
            }
        }

        if (this.enabledDepthStencil) {
            pd.depthStencil = {
                depthWriteEnabled: this.material.depthWriteEnabled,
                format: this.material.depthFormat,
                depthCompare: this.material.depthCompare
            }
        }

        if (this.enabledPrimitive) {
            pd.primitive = {
                cullMode: this.material.cullMode,
                topology: this.material.topology
            }
        }

        return pd
    }
}

export default PipelineCore

