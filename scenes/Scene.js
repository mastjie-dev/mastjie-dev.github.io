import BindGroup from "../cores/BindGroup.js"
import BindGroupLayout from "../cores/BindGroupLayout.js"
import BaseMaterial from "./BaseMaterial.js"



class Scene {
    constructor() {
        this.trees = []
        this.lights = []
        this.materialGroups = []
        this.shadowMaterialGroups = []

        this.bindGroup = new BindGroup()
        this.bindGroupLayout = new BindGroupLayout()
    }

    buildMaterialGroup(mesh) {
        const material = mesh.material
        const matGroup = this.materialGroups
            .find(_ => _.material.uuid === material.uuid)

        if (matGroup) {
            const pv = matGroup.primitives
                .find(_ => _.geometry === mesh.geometry)

            if (pv) {
                pv.meshes.push(mesh)
            }
            else {
                matGroup.primitives.push({
                    geometry: mesh.geometry,
                    meshes: [mesh]
                })
            }
        }
        else {
            this.materialGroups.push({
                material,
                primitives: [{
                    geometry: mesh.geometry,
                    meshes: [mesh]
                }]
            })
        }
    }

    buildShadowMaterialGroup(mesh) {
        const geometry = mesh.geometry
        const primitive = this.shadowMaterialGroups
            .find(_ => _.geometry === geometry)

        if (primitive) {
            primitive.meshes.push(mesh)
        }
        else {
            this.shadowMaterialGroups.push({
                geometry,
                meshes: [mesh]
            })
        }
    }

    addNode(node) {
        if (!node.parent) {
            this.trees.push(node)
        }

        if (node.isMesh) {
            this.buildMaterialGroup(node)
            // TODO: add only mesh affected by light
            this.buildShadowMaterialGroup(node)
        }

        if (node.isLight) {
            this.lights.push(node)
        }

        if (node.children.length) {
            for (let child of node.children) {
                this.addNode(child)
            }
        }
    }
}

export default Scene