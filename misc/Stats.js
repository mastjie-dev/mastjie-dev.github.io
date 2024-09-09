
class Stats {
    constructor() {
        this.prev = 0
        this.fps = 0
        this.cpu = 0
        this.count = 0

        const root = document.createElement("div")
        root.style.position = "absolute"
        root.style.top = "0"
        root.style.left = "0"
        root.style.margin = "0"
        root.style.padding = "5px 5px"
        root.style.width = "80px"
        root.style.backgroundColor = "#FFFFFF"

        this.fpsEL = document.createElement("div")
        this.fpsEL.style.margin = "5px 0"
        this.fpsEL.textContent = "FPS: 0"

        this.cpuEL = document.createElement("div")
        this.cpuEL.style.margin = "5px 0"
        this.cpuEL.textContent = "CPU: 0"

        root.appendChild(this.fpsEL)
        root.appendChild(this.cpuEL)
        document.body.appendChild(root)
    }

    update(time, cpu = -1) {
        time *= .001
        const dt = time - this.prev
        this.prev = time
        this.fps += 1 / dt
        this.cpu += cpu

        ++this.count

        if (this.count === 30) {
            this.fps /= 30
            this.fpsEL.textContent = `FPS: ${this.fps.toFixed(1)}`
            this.fps = 0

            this.cpu /= 30
            this.cpuEL.textContent = `CPU: ${this.cpu.toFixed(1)}`

            this.count = 0
        }
    }
}

export default Stats