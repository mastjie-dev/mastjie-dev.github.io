class Scene {
    constructor() {
        this.tree = []
        this.materialGroups = []
        this.lightGroup = null
    }

    add(mesh) {
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
}

export default Scene