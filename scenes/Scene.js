import BindGroup from "../cores/BindGroup.js"
import BindGroupLayout from "../cores/BindGroupLayout.js"

class Scene {
    constructor() {
        this.tree = []
        this.materialGroups = []
        this.lights = []

        this.bindGroup = new BindGroup()
        this.bindGroupLayout = new BindGroupLayout()
    }

    addMesh(mesh) {
        if (!mesh.parent) {
            this.tree.push(mesh)
        }

        if (mesh.isMesh) {
            const material = mesh.material
            const materialGroup = this.materialGroups.find(_ => _.material.uuid === material.uuid)
            if (!materialGroup) {
                this.materialGroups.push({
                    material,
                    meshes: [mesh]
                })
            }
            else {
                materialGroup.meshes.push(mesh)
            }
        }

        if (mesh.children.length) {
            for (let child of mesh.children) {
                this.add(child)
            }
        }
    }

    addLight(light) {
        if (light.isLight) {
            this.lights.push(light)
        }
    }
}

export default Scene