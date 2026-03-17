import type { Ship } from './Ship'

export class ShipRenderer {
    private ctx: CanvasRenderingContext2D
    private width: number
    private height: number
    private scale = 12 // Pixels per unit of r
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

    drawEnvironment(waypointR: number, waypointPhi: number) {
        const cx = this.width / 2
        const cy = this.height / 2

        // Draw coordinate grid (circles and radii)
        this.ctx.strokeStyle = '#222'
        this.ctx.lineWidth = 1

        for (let i = 0; i < 12; i++) {
            const angle = (i * Math.PI * 2) / 12
            this.ctx.beginPath()
            this.ctx.moveTo(cx, cy)
            this.ctx.lineTo(cx + 1000 * Math.cos(angle), cy - 1000 * Math.sin(angle))
            this.ctx.stroke()
        }

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

        // Draw Waypoint
        const [wx, wy] = this.toScreen(waypointR, waypointPhi)
        this.ctx.fillStyle = '#00ff00'
        this.ctx.shadowBlur = 10
        this.ctx.shadowColor = '#00ff00'
        this.ctx.beginPath()
        this.ctx.arc(wx, wy, 5, 0, Math.PI * 2)
        this.ctx.fill()

        this.ctx.strokeStyle = '#ffffff'
        this.ctx.lineWidth = 1
        this.ctx.beginPath()
        this.ctx.arc(wx, wy, 8, 0, Math.PI * 2)
        this.ctx.stroke()
        this.ctx.shadowBlur = 0
    }

    drawShip(ship: Ship, color: string = '#00ffcc') {
        if (ship.trail && ship.trail.length > 1) {
            this.ctx.strokeStyle = color
            this.ctx.lineWidth = 2
            this.ctx.shadowBlur = 5
            this.ctx.shadowColor = color
            this.ctx.beginPath()
            for (let i = 0; i < ship.trail.length; i++) {
                const r = ship.trail[i][1]
                const phi = ship.trail[i][2]
                const [px, py] = this.toScreen(r, phi)
                if (i === 0) this.ctx.moveTo(px, py)
                else this.ctx.lineTo(px, py)
            }
            this.ctx.stroke()
            this.ctx.shadowBlur = 0 // reset
        }

        const r = ship.x[1]
        const phi = ship.x[2]
        const [px, py] = this.toScreen(r, phi)
        
        const size = 8
        this.ctx.save()
        this.ctx.translate(px, py)
        
        // In screen coordinates, a positive angle rotates clockwise.
        // We want orientation relative to the screen. Because our rendering 
        // flips Y computationally (cy - sin), we might need to adjust.
        // Let's negate orientation for intuitive visual screen mapping
        this.ctx.rotate(-ship.orientation) 

        this.ctx.fillStyle = '#ffffff'
        this.ctx.beginPath()
        this.ctx.moveTo(size, 0)
        this.ctx.lineTo(-size, size / 1.5)
        this.ctx.lineTo(-size, -size / 1.5)
        this.ctx.closePath()
        this.ctx.fill()

        if (ship.thrust > 0) {
            this.ctx.fillStyle = '#ffaa00'
            this.ctx.beginPath()
            this.ctx.moveTo(-size, 0)
            this.ctx.lineTo(-size * 2, size / 2)
            this.ctx.lineTo(-size * 2, -size / 2)
            this.ctx.closePath()
            this.ctx.fill()
        }

        this.ctx.restore()
    }
}
