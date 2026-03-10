import type { State } from './State'

export class CanvasRenderer {
    private ctx: CanvasRenderingContext2D
    private width: number
    private height: number
    private history: number[][] = []
    private scale = 250 // scale of the sphere relative to canvas
    public coordinateAdapter: (x: number[]) => [number, number, number]

    constructor(
        canvas: HTMLCanvasElement,
        coordinateAdapter: (x: number[]) => [number, number, number]
    ) {
        this.ctx = canvas.getContext('2d')!
        this.width = canvas.width
        this.height = canvas.height
        this.coordinateAdapter = coordinateAdapter
    }

    clear() {
        this.ctx.fillStyle = '#1e1e1e'
        this.ctx.fillRect(0, 0, this.width, this.height)
    }

    // Tilt the sphere slightly down and rotate a bit sideways so we can see it's 3D
    private rotate3D(x: number, y: number, z: number): [number, number, number] {
        const pitch = 0.5
        const yaw = -3 * Math.PI / 4

        // Yaw around Z axis (spinning the globe)
        const x1 = x * Math.cos(yaw) - y * Math.sin(yaw)
        const y1 = x * Math.sin(yaw) + y * Math.cos(yaw)

        // Pitch around X axis (tilting North Pole towards us)
        const y2 = y1 * Math.cos(pitch) - z * Math.sin(pitch)
        const z2 = y1 * Math.sin(pitch) + z * Math.cos(pitch)

        return [x1, y2, z2]
    }

    private toScreen(bx: number, by: number, bz: number): [number, number, number] {
        const [rx, ry, rz] = this.rotate3D(bx, by, bz)
        const cx = this.width / 2
        const cy = this.height / 2
        // +rz because standard canvas Y is down, but in our spherical coords Z is up.
        return [cx + rx * this.scale, cy - rz * this.scale, ry]
    }

    drawSphere() {
        // Draw Latitudes
        for (let theta = 0; theta <= Math.PI; theta += Math.PI / 12) {
            const isEquator = Math.abs(theta - Math.PI / 2) < 0.01

            for (let phi = 0; phi <= 2 * Math.PI + 0.1; phi += 0.1) {
                const sx = Math.sin(theta) * Math.cos(phi)
                const sy = Math.sin(theta) * Math.sin(phi)
                const sz = Math.cos(theta)
                const [px, py, depth] = this.toScreen(sx, sy, sz)

                const isFront = depth < 0;
                let color = isFront ? '#333' : '#222';
                if (isEquator) {
                    color = isFront ? '#666' : '#2a2a2a';
                }

                if (phi === 0) {
                    this.ctx.beginPath()
                    this.ctx.strokeStyle = color
                    this.ctx.lineWidth = isEquator ? 2 : 1
                    this.ctx.moveTo(px, py)
                } else {
                    this.ctx.lineTo(px, py)
                    this.ctx.stroke()

                    this.ctx.beginPath()
                    this.ctx.strokeStyle = color
                    this.ctx.lineWidth = isEquator ? 2 : 1
                    this.ctx.moveTo(px, py)
                }
            }
        }

        // Draw Longitudes
        for (let phi = 0; phi < 2 * Math.PI; phi += Math.PI / 6) {
            for (let theta = 0; theta <= Math.PI; theta += 0.1) {
                const sx = Math.sin(theta) * Math.cos(phi)
                const sy = Math.sin(theta) * Math.sin(phi)
                const sz = Math.cos(theta)
                const [px, py, depth] = this.toScreen(sx, sy, sz)

                const isFront = depth < 0;
                const color = isFront ? '#333' : '#222';

                if (theta === 0) {
                    this.ctx.beginPath()
                    this.ctx.strokeStyle = color
                    this.ctx.lineWidth = 1
                    this.ctx.moveTo(px, py)
                } else {
                    this.ctx.lineTo(px, py)
                    this.ctx.stroke()

                    this.ctx.beginPath()
                    this.ctx.strokeStyle = color
                    this.ctx.lineWidth = 1
                    this.ctx.moveTo(px, py)
                }
            }
        }
    }

    drawTrail() {
        if (this.history.length < 2) return
        this.ctx.strokeStyle = '#88ccff'
        this.ctx.lineWidth = 2
        this.ctx.beginPath()
        for (let i = 0; i < this.history.length; i++) {
            const [sx, sy, sz] = this.coordinateAdapter(this.history[i])
            const [px, py] = this.toScreen(sx, sy, sz)
            if (i === 0) this.ctx.moveTo(px, py)
            else this.ctx.lineTo(px, py)
        }
        this.ctx.stroke()
    }

    drawVector(pos: number[], V: number[], color: string = '#ffcc00') {
        const [sx, sy, sz] = this.coordinateAdapter(pos)
        const [px, py] = this.toScreen(sx, sy, sz)

        // V is a vector in the coordinate basis [v^theta, v^phi].
        // We need to map this to a 3D tangent vector.
        // The basis vectors of the sphere are:
        const theta = pos[0]
        const phi = pos[1]

        const ex = [Math.cos(theta) * Math.cos(phi), Math.cos(theta) * Math.sin(phi), -Math.sin(theta)]
        const ephi = [-Math.sin(theta) * Math.sin(phi), Math.sin(theta) * Math.cos(phi), 0]

        // V_cartesian = v^theta * e_theta + v^phi * e_phi
        let vx = V[0] * ex[0] + V[1] * ephi[0]
        let vy = V[0] * ex[1] + V[1] * ephi[1]
        let vz = V[0] * ex[2] + V[1] * ephi[2]

        // Normalize the vector visually so the initial and final stick are the same size
        const len = Math.sqrt(vx * vx + vy * vy + vz * vz)
        if (len > 0.000001) {
            vx /= len
            vy /= len
            vz /= len
        }

        // Scale up the vector for visibility (half the sphere radius)
        const vecScale = 0.5
        const [endX, endY] = this.toScreen(sx + vx * vecScale, sy + vy * vecScale, sz + vz * vecScale)

        this.ctx.strokeStyle = color
        this.ctx.lineWidth = 2
        this.ctx.beginPath()
        this.ctx.moveTo(px, py)
        this.ctx.lineTo(endX, endY)
        this.ctx.stroke()

        // Draw simple arrowhead
        this.ctx.fillStyle = color
        this.ctx.beginPath()
        this.ctx.arc(endX, endY, 3, 0, 2 * Math.PI)
        this.ctx.fill()
    }

    drawState(state: State) {
        this.history.push([...state.x])

        this.clear()
        this.drawSphere()
        this.drawTrail()

        const [sx, sy, sz] = this.coordinateAdapter(state.x)
        const [px, py] = this.toScreen(sx, sy, sz)

        // Render carried transported vectors
        if (state.carriedVectors) {
            for (const V of state.carriedVectors) {
                this.drawVector(state.x, V, '#ffcc00')
            }
        }

        // Draw particle
        this.ctx.fillStyle = '#ffffff'
        this.ctx.beginPath()
        this.ctx.arc(px, py, 5, 0, Math.PI * 2)
        this.ctx.fill()
    }

    resetHistory() {
        this.history = []
    }
}
