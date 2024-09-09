
function radianToDegree(radian) {
    return radian * 180 / Math.PI
}

function degreeToRadian(degree) {
    return degree * Math.PI / 180
}

async function loadImageBitmap(url) {
    const res = await fetch(url)
    const blob = await res.blob()
    return await createImageBitmap(blob, { colorSpaceConversion: 'none' })
}

export {
    radianToDegree,
    degreeToRadian,
    loadImageBitmap,
}