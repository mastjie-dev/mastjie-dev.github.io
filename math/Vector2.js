
class Vector2 {
    constructor(x = 0, y = 0) {
        this.x = x
        this.y = y
    }

    set(x, y) {
        this.x = x
        this.y = y
        return this
    }

    toArray() {
        return [this.x, this.y]
    }

    copy(v2) {
        this.x = v2.x
        this.y = v2.y
        return this
    }

    random() {
        this.x = Math.random()
        this.y = Math.random()
        return this
    }

    add(v2) {
        this.x += v2.x
        this.y += v2.y
        return this
    }

    sub(v2) {
        this.x -= v2.x
        this.y -= v2.y
        return this
    }

    multiply(v2) {
        this.x *= v2.x
        this.y *= v2.y
        return this
    }

    divide(v2) {
        this.x /= v2.x
        this.y /= v2.y
        return this
    }

    addScalar(s) {
        this.x += s
        this.y += s
        return this
    }

    subScalar(s) {
        this.x -= s
        this.y -= s
        return this
    }

    multiplyScalar(s) {
        this.x *= s
        this.y *= s
        return this
    }

    divideScalar(s) {
        this.x /= s
        this.y /= s
        return this
    }

    addVector(a, b) {
        this.x = a.x + b.x
        this.y = a.y + b.y
        return this
    }

    subVector(a, b) {
        this.x = a.x - b.x
        this.y = a.y - b.y
        return this
    }

    multiplyVector(a, b) {
        this.x = a.x * b.x
        this.y = a.y * b.y
        return this
    }

    dot(a) {
        return this.x * a.x + this.y * a.y
    }

    length() {
        return Math.sqrt(this.x * this.x + this.y * this.y)
    }

    normalize() {
        const l = this.length()
        this.x /= l
        this.y /= l
        return this
    }

    distance(v2) {
        return Math.sqrt(
            (this.x - v2.x) * (this.x - v2.x) +
            (this.y - v2.y) * (this.y - v2.y)
        )
    }

    lerp(v2, t) {
        this.x += (v2.x - this.x) * t
        this.y += (v2.y - this.y) * t
        return this
    }

    lerpVector(a, b) {
        this.x = a.x + (b.x - a.x) * t
        this.y = a.y + (b.y - a.y) * t
        return this
    }

    clamp(a, b) {
        this.x = this.x < a.x ? a.x : this.x > b.x ? b.x : this.x
        this.y = this.y < a.y ? a.y : this.y > b.y ? b.y : this.y
        return this
    }
}

export default Vector2