import type { State } from './State'

export class SchwarzschildRenderer {
    private ctx: CanvasRenderingContext2D
    private width: number
    private height: number
    private scale = 20 // Pixels per unit of r
    private mass: number

    constructor(canvas: HTMLCanvasElement, mass: number) {
        this.ctx = canvas.getContext('2d')!
        this.width = canvas.width
        this.height = canvas.height
        this.mass = mass
    }

    setMass(m: number) {
        this.mass = m
    }

    clear() {
        this.ctx.fillStyle = '#0a0a0a'
        this.ctx.fillRect(0, 0, this.width, this.height)
    }

    private toScreen(r: number, phi: number): [number, number] {
        const cx = this.width / 2
        const cy = this.height / 2
        return [
            cx + r * Math.cos(phi) * this.scale,
            cy - r * Math.sin(phi) * this.scale
        ]
    }

    drawEnvironment() {
        const cx = this.width / 2
        const cy = this.height / 2

        // Draw coordinate grid (circles and radii)
        this.ctx.strokeStyle = '#222'
        this.ctx.lineWidth = 1

        // Radii lines
        for (let i = 0; i < 12; i++) {
            const angle = (i * Math.PI * 2) / 12
            this.ctx.beginPath()
            this.ctx.moveTo(cx, cy)
            this.ctx.lineTo(cx + 1000 * Math.cos(angle), cy - 1000 * Math.sin(angle))
            this.ctx.stroke()
        }

        // Circular grids
        for (let r = 5; r <= 50; r += 5) {
            this.ctx.beginPath()
            this.ctx.arc(cx, cy, r * this.scale, 0, Math.PI * 2)
            this.ctx.stroke()
        }

        // Draw Event Horizon (r = 2M)
        const pointOfNoReturn = 2 * this.mass
        this.ctx.strokeStyle = '#aa0000'
        this.ctx.lineWidth = 2
        this.ctx.setLineDash([5, 5])
        this.ctx.beginPath()
        this.ctx.arc(cx, cy, pointOfNoReturn * this.scale, 0, Math.PI * 2)
        this.ctx.stroke()
        this.ctx.setLineDash([])

        // Draw the massive body (Black Hole)
        this.ctx.fillStyle = '#000'
        this.ctx.shadowBlur = 20
        this.ctx.shadowColor = '#4400ff'
        this.ctx.beginPath()
        this.ctx.arc(cx, cy, pointOfNoReturn * this.scale * 0.95, 0, Math.PI * 2)
        this.ctx.fill()
        this.ctx.shadowBlur = 0 // reset
    }

    drawState(state: State, history: number[][], color: string = '#00ffcc') {
        // Draw Trail
        if (history.length > 1) {
            this.ctx.strokeStyle = color
            this.ctx.lineWidth = 2
            this.ctx.beginPath()
            for (let i = 0; i < history.length; i++) {
                const r = history[i][1]
                const phi = history[i][2]
                const [px, py] = this.toScreen(r, phi)
                if (i === 0) this.ctx.moveTo(px, py)
                else this.ctx.lineTo(px, py)
            }
            this.ctx.stroke()
        }

        // Draw Particle
        const [px, py] = this.toScreen(state.x[1], state.x[2])
        this.ctx.fillStyle = '#ffffff'
        this.ctx.beginPath()
        this.ctx.arc(px, py, 4, 0, Math.PI * 2)
        this.ctx.fill()

        this.ctx.strokeStyle = color
        this.ctx.lineWidth = 2
        this.ctx.beginPath()
        this.ctx.arc(px, py, 6, 0, Math.PI * 2)
        this.ctx.stroke()
    }
}
