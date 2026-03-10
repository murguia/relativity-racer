export class SpacetimeRenderer {
    private ctx: CanvasRenderingContext2D
    private width: number
    private height: number
    private scale = 50 // Pixels per unit

    constructor(canvas: HTMLCanvasElement) {
        this.ctx = canvas.getContext('2d')!
        this.width = canvas.width
        this.height = canvas.height
    }

    clear() {
        this.ctx.fillStyle = '#1e1e1e'
        this.ctx.fillRect(0, 0, this.width, this.height)
    }

    private toScreen(t: number, x: number): [number, number] {
        // Center x horizontally, place t=0 near the bottom
        const cx = this.width / 2
        const cy = this.height - 50 // 50px padding from bottom
        return [cx + x * this.scale, cy - t * this.scale]
    }

    drawDiagram() {
        // Draw Grid
        this.ctx.strokeStyle = '#333'
        this.ctx.lineWidth = 1

        const maxT = Math.ceil(this.height / this.scale)
        const maxX = Math.ceil((this.width / 2) / this.scale)

        // Horizontal lines (constant t)
        for (let t = 0; t <= maxT; t++) {
            const [x1, y1] = this.toScreen(t, -maxX)
            const [x2, y2] = this.toScreen(t, maxX)
            this.ctx.beginPath()
            this.ctx.moveTo(x1, y1)
            this.ctx.lineTo(x2, y2)
            this.ctx.stroke()

            // Draw time labels
            this.ctx.fillStyle = '#666'
            this.ctx.font = '10px monospace'
            this.ctx.fillText(`t=${t}`, x1 + 5, y1 - 3)
        }

        // Vertical lines (constant x)
        for (let x = -maxX; x <= maxX; x++) {
            const [x1, y1] = this.toScreen(0, x)
            const [x2, y2] = this.toScreen(maxT, x)
            this.ctx.beginPath()
            this.ctx.moveTo(x1, y1)
            this.ctx.lineTo(x2, y2)
            this.ctx.stroke()

            // Draw space labels at t=0
            if (x !== 0) {
                this.ctx.fillStyle = '#666'
                this.ctx.font = '10px monospace'
                this.ctx.fillText(`x=${x}`, x1 + 5, y1 + 12)
            }
        }

        // Draw Axes (t=0, x=0)
        this.ctx.strokeStyle = '#888'
        this.ctx.lineWidth = 2

        // t-axis (x=0)
        const [tx1, ty1] = this.toScreen(0, 0)
        const [tx2, ty2] = this.toScreen(maxT, 0)
        this.ctx.beginPath()
        this.ctx.moveTo(tx1, ty1)
        this.ctx.lineTo(tx2, ty2)
        this.ctx.stroke()

        // x-axis (t=0)
        const [xx1, xy1] = this.toScreen(0, -maxX)
        const [xx2, xy2] = this.toScreen(0, maxX)
        this.ctx.beginPath()
        this.ctx.moveTo(xx1, xy1)
        this.ctx.lineTo(xx2, xy2)
        this.ctx.stroke()

        // Draw Light Cones from origin (x = ±t)
        this.ctx.strokeStyle = '#444'
        this.ctx.setLineDash([5, 5])
        this.ctx.lineWidth = 1

        // x = t line
        const [lc1x, lc1y] = this.toScreen(0, 0)
        const [lc2x, lc2y] = this.toScreen(maxT, maxT)
        this.ctx.beginPath()
        this.ctx.moveTo(lc1x, lc1y)
        this.ctx.lineTo(lc2x, lc2y)
        this.ctx.stroke()

        // x = -t line
        const [lc3x, lc3y] = this.toScreen(0, 0)
        const [lc4x, lc4y] = this.toScreen(maxT, -maxT)
        this.ctx.beginPath()
        this.ctx.moveTo(lc3x, lc3y)
        this.ctx.lineTo(lc4x, lc4y)
        this.ctx.stroke()

        this.ctx.setLineDash([])
    }

    drawWorldline(history: number[][], color: string = '#88ccff') {
        if (history.length < 2) return
        this.ctx.strokeStyle = color
        this.ctx.lineWidth = 3
        this.ctx.lineCap = 'round'
        this.ctx.lineJoin = 'round'

        this.ctx.beginPath()
        for (let i = 0; i < history.length; i++) {
            const t = history[i][0]
            const x = history[i][1]
            const [px, py] = this.toScreen(t, x)
            if (i === 0) this.ctx.moveTo(px, py)
            else this.ctx.lineTo(px, py)
        }
        this.ctx.stroke()

        // Draw a dot at the current (last) position
        const last = history[history.length - 1]
        const [hx, hy] = this.toScreen(last[0], last[1])
        this.ctx.fillStyle = color
        this.ctx.beginPath()
        this.ctx.arc(hx, hy, 5, 0, Math.PI * 2)
        this.ctx.fill()
    }
}
