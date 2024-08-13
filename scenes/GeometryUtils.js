
function createPlane( // TODO: change width->horizontal, height=vertical
    width = 1, height = 1, widthSegment = 1, heightSegment = 1, face={})
{
    const position = []
    const normal = []
    const uv = []
    const index = []

    const halfWidth = width / 2
    const halfHeight = height / 2

    const widthStep = width / widthSegment
    const heightStep = height / heightSegment

    const widthVertices = widthSegment + 1
    const heightVertices = heightSegment + 1

    const uvxStep = 1 / widthSegment
    const uvyStep = 1 / heightSegment
    let uvx = 0
    let uvy = 0

    const faceDir = face.dir || "front"
    const faceOff = face.off || 0

    for (let y = 0; y < heightVertices; y++) {
        for (let x = 0; x < widthVertices; x++) {
            let px, py, pz
            let nr = []

            switch (faceDir) {
                case "front":
                    px = -halfWidth + widthStep * x
                    py = -halfHeight + heightStep * y
                    pz = faceOff
                    nr.push(0, 0, 1)
                    break
                case "back":
                    px = halfWidth - widthStep * x
                    py = -halfHeight + heightStep * y
                    pz = faceOff
                    nr.push(0, 0, .5)
                    break
                case "up":
                    px = -halfWidth + widthStep * x
                    py = faceOff
                    pz = halfHeight - heightStep * y
                    nr.push(0, 1, 0)
                    break
                case "down":
                    px = -halfWidth + widthStep * x
                    py = faceOff
                    pz = -halfHeight + heightStep * y
                    nr.push(0, .5, 0)
                    break
                case "right":
                    px = faceOff
                    py = -halfHeight + heightStep * y
                    pz = -halfWidth + widthStep * x
                    nr.push(1, 0, 0)
                    break
                case "left":
                    px = faceOff
                    py = -halfHeight + heightStep * y
                    pz = halfWidth - widthStep * x
                    nr.push(.5, 0, 0)
                    break
            }

            position.push(px, py, pz)
            normal.push(...nr)
            
            uv.push(uvx, uvy)
            uvx += uvxStep
        }
        uvx = 0
        uvy += uvyStep
    }

    for (let y = 0; y < heightSegment; y++) {
        for (let x = 0; x < widthSegment; x++) {
            /**
             *  v1____v4
             *  |\   |
             *  | \  |
             *  |  \ |
             *  |__ \|
             *  v2   v3
             * 
             */

            const v1 = x + y * widthVertices
            const v2 = v1 + widthVertices
            const v3 = v2 + 1
            const v4 = v1 + 1

            index.push(v1, v2, v3, v3, v4, v1)
        }
    }

    return {
        position: new Float32Array(position),
        normal: new Float32Array(normal),
        uv: new Float32Array(uv),
        index: new Uint16Array(index)
    }
}

function createBox(
    width = 1, height = 1, depth = 1, widthSegment = 1,
    heightSegment = 1, depthSegment = 1,
) {
    const position = []
    const normal = []
    const uv = []
    const index = []
    let indexLength

    const front = createPlane(width, height, widthSegment, heightSegment,{
        dir: "front", off: -depth/2
    })
    position.push(...front.position)
    normal.push(...front.normal)
    uv.push(...front.uv)
    index.push(...front.index)
    indexLength = position.length / 3

    const back = createPlane(width, height, widthSegment, heightSegment,{
        dir: "back", off: depth/2
    })
    position.push(...back.position)
    normal.push(...back.normal)
    uv.push(...back.uv)
    back.index.forEach(i => index.push(i+indexLength))
    indexLength = position.length / 3

    const up = createPlane(width, depth, widthSegment, depthSegment, {
        dir: "up", off: -height/2
    })
    position.push(...up.position)
    normal.push(...up.normal)
    uv.push(...up.uv)
    up.index.forEach(i => index.push(i+indexLength))
    indexLength = position.length / 3

    const down = createPlane(width, depth, widthSegment, depthSegment, {
        dir: "down", off: height/2
    })
    position.push(...down.position)
    normal.push(...down.normal)
    uv.push(...down.uv)
    down.index.forEach(i => index.push(i+indexLength))
    indexLength = position.length / 3

    const right = createPlane(depth, height, depthSegment, heightSegment, {
        dir: "right", off: width/2
    })
    position.push(...right.position)
    normal.push(...right.normal)
    uv.push(...right.uv)
    right.index.forEach(i => index.push(i+indexLength))
    indexLength = position.length / 3

    const left = createPlane(depth, height, depthSegment, heightSegment, {
        dir: "left", off: -width/2
    })
    position.push(...left.position)
    normal.push(...left.normal)
    uv.push(...left.uv)
    left.index.forEach(i => index.push(i+indexLength))
    indexLength = position.length / 3


    return {
        position: new Float32Array(position),
        normal: new Float32Array(normal),
        uv: new Float32Array(uv),
        index: new Uint16Array(index)
    }
}

const GeometryUtils = {
    createPlane,
    createBox,
}

export default GeometryUtils