import { LightGroup } from "./Light"

class World {
    constructor() {
        this.meshes = new Set()
        this.lights = new LightGroup()

        this.geometries = new Set()
        this.materials = new Set()
        this.buffers = new Set()
        this.textures = new Set()
        this.samplers = new Set()
    }

    _addMesh(mesh) {
        if (mesh.isMesh) {
            this.meshes.add(mesh)
            this.geometries.add(mesh.geometry)
            this.materials.add(mesh.material)

            this.buffers.add(mesh.geometry.index)
            mesh.geometry.attributes.forEach(b => this.buffers.add(b))

            mesh.material.buffers.forEach(b => this.buffers.add(b))
            mesh.material.textures.forEach(t => this.textures.add(t))
            mesh.material.samplers.forEach(s => this.samplers.add(s))
        }

        if (mesh.children.length) {
            mesh.children.forEach(m => {
                if (m.isMesh) this._addMesh(m)
            })
        }
    }

    add(...nodes) {
        nodes.forEach(node => {
            if (node.isLight) this.lights.add(node)
            else this._addMesh(node)
        })
    }
}

export default World