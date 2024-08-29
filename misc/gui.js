
/**
 *  group
 *  - label: string
 *  - fields: array
 * 
 *  field (range)
 *  - label: string
 *  - type: string -> "range"
 *  - value: number
 *  - min: number
 *  - max: number
 *  - step: number
 *  - func: function
 * 
 *  field (color)
 *  - label: string
 *  - type: string -> "color"
 *  - value: hexadecimal
 *  - func: function
 */

function gui(groups) {
    const root = document.createElement("div")
    root.style.position = "absolute"
    root.style.top = "0px"
    root.style.left = "0px"
    root.style.width = "210px"
    root.style.padding = "5px 5px"
    root.style.backgroundColor = "#57788f"
    root.style.color = "#ffffff"
    root.style.fontSize = "14px"

    for (let g of groups) {
        const groupButton = document.createElement("button")
        groupButton.innerHTML = `# ${g.label}`
        groupButton.style.backgroundColor = "#333333"
        groupButton.style.color = "#ffffff"
        groupButton.style.border = "0"
        groupButton.style.outline = "inherit"
        groupButton.style.width = "100%"
        groupButton.style.marginBottom = "2px"

        const groupInput = document.createElement("div")
        groupInput.style.display = "block"

        for (let f of g.fields) {
            const label = document.createElement("label")
            label.innerHTML = f.label.substring(0, 12)
            label.style.width = "80px"
            label.style.display = "inline-block"

            const input = document.createElement("input")
            input.type = f.type
            input.name = f.label
            input.groupName = g.label
            input.style.width = "inherit"
            input.style.width = "120px"
            input.style.display = "inline-block"

            setTimeout(() => {
                input.value = f.value
            }, 100)

            if (f.type === "range") {
                input.min = f.min
                input.max = f.max
                input.step = f.step
            }

            const fieldBox = document.createElement("div")
            fieldBox.style.padding = "2px 0 2px 0"
            fieldBox.appendChild(label)
            fieldBox.appendChild(input)

            groupInput.appendChild(fieldBox)
        }

        const groupDiv = document.createElement("div")
        groupDiv.appendChild(groupButton)
        groupDiv.appendChild(groupInput)
        root.appendChild(groupDiv)
    }

    document.body.appendChild(root)

    root.addEventListener("input", e => {
        const groupName = e.target.groupName
        const group = groups.find(g => g.label === groupName)

        const field = group.fields.find(f => f.label === e.target.name)
        if (field) {
            field.func(e.target.value)
        }

    })

    root.addEventListener("click", e => {
        if (e.target.nodeName === "BUTTON") {
            const parent = e.target.parentNode
            const divChild = parent.children[1]
            const d = divChild.style.display
            divChild.style.display = d === "none" ? "block" : "none"
        }
    })

    document.addEventListener("keydown", e => {
        if (e.key === "l") {
            const d = root.style.display
            root.style.display = d === "none" ? "block" : "none"
        }
    })
}

export default gui