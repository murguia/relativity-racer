import type { SimulationModule, Preset } from './SimulationModule'
import { SphereGeometry } from '../geometry/SphereGeometry'
import { TransportDynamics } from '../TransportDynamics'
import type { State as TransportState } from '../State'
import { CanvasRenderer } from '../CanvasRenderer'
import type { Integrator } from '../Integrator'

export class SphereSimulation implements SimulationModule {
    id = "sphere-geodesics"
    title = "Sphere Geodesics & Parallel Transport"
    description = "Particles move along great circles on a curved manifold. Demonstrates geodesic motion, parallel transport of tangent vectors, and geometric holonomy. Motion is generated natively via the metric $ds^2 = d\\theta^2 + \\sin^2(\\theta) d\\phi^2$"
    category = "Curved Space"

    private geometry = new SphereGeometry()
    private dynamics = new TransportDynamics(this.geometry)
    private renderer!: CanvasRenderer
    private state!: TransportState

    private isTriangleDemo = false
    private trianglePhase = 0
    private initialVector: number[] | null = null
    private initialPosition: number[] | null = null
    private currentHolonomy: number | null = null

    private controls!: {
        theta: HTMLInputElement,
        phi: HTMLInputElement,
        vTheta: HTMLInputElement,
        vPhi: HTMLInputElement,
        showVector: HTMLInputElement
    }

    presets: Preset[] = [
        { name: "Equator", apply: () => this.applyPreset(Math.PI / 2, 0, 0, 0.5) },
        { name: "Meridian", apply: () => this.applyPreset(Math.PI / 2, 0, 0.5, 0) },
        { name: "Generic", apply: () => this.applyPreset(Math.PI / 4, 0, 0.3, 0.8) },
        { name: "Holonomy Triangle", apply: () => this.applyPreset(0.001, 0, 0.5, 0, true) }
    ]

    setup(canvas: HTMLCanvasElement) {
        const sphericalToCartesian = (x: number[]): [number, number, number] =>
            [Math.sin(x[0]) * Math.cos(x[1]), Math.sin(x[0]) * Math.sin(x[1]), Math.cos(x[0])]
        this.renderer = new CanvasRenderer(canvas, sphericalToCartesian)
        this.reset()
    }

    createControls(container: HTMLElement) {
        container.innerHTML = `
            <label>Initial &theta;: <input type="number" id="initTheta" value="1.570796" step="0.1" /></label>
            <label>Initial &phi;: <input type="number" id="initPhi" value="0" step="0.1" /></label>
            <label>Initial v<sub>&theta;</sub>: <input type="number" id="initVTheta" value="0.5" step="0.1" /></label>
            <label>Initial v<sub>&phi;</sub>: <input type="number" id="initVPhi" value="0.2" step="0.1" /></label>
            <label style="margin-top: 5px;">
                <input type="checkbox" id="showVector" checked /> Show Transported Vector
            </label>
        `
        this.controls = {
            theta: container.querySelector('#initTheta') as HTMLInputElement,
            phi: container.querySelector('#initPhi') as HTMLInputElement,
            vTheta: container.querySelector('#initVTheta') as HTMLInputElement,
            vPhi: container.querySelector('#initVPhi') as HTMLInputElement,
            showVector: container.querySelector('#showVector') as HTMLInputElement
        }
    }

    reset() {
        this.state = {
            x: [parseFloat(this.controls?.theta.value || "1.57"), parseFloat(this.controls?.phi.value || "0")],
            v: [parseFloat(this.controls?.vTheta.value || "0.5"), parseFloat(this.controls?.vPhi.value || "0.2")]
        }
        this.isTriangleDemo = false
        this.trianglePhase = 0
        this.currentHolonomy = null
        this.initialVector = null

        if (this.controls?.showVector?.checked) {
            this.state.carriedVectors = [[0.5, 0.5]]
        }
        if (this.renderer) this.renderer.resetHistory()
    }

    private applyPreset(t: number, p: number, vt: number, vp: number, demo = false) {
        if (!this.controls) return
        this.controls.theta.value = t.toString()
        this.controls.phi.value = p.toString()
        this.controls.vTheta.value = vt.toString()
        this.controls.vPhi.value = vp.toString()
        this.reset()

        this.isTriangleDemo = demo
        if (demo && this.state.carriedVectors) {
            this.state.carriedVectors = [[0, 1 / Math.sin(this.state.x[0])]]
            this.initialPosition = [...this.state.x]
            this.initialVector = [...this.state.carriedVectors[0]]
            this.renderState()
        }
    }

    updateState(dt: number, integrator: Integrator): { isRunning: boolean } {
        let actualDt = dt
        let isRunning = true

        if (this.isTriangleDemo) {
            if (this.trianglePhase === 0 && this.state.x[0] + this.state.v[0] * dt >= Math.PI / 2) {
                actualDt = Math.max(0, (Math.PI / 2 - this.state.x[0]) / this.state.v[0])
            } else if (this.trianglePhase === 1 && this.state.x[1] + this.state.v[1] * dt >= Math.PI / 2) {
                actualDt = Math.max(0, (Math.PI / 2 - this.state.x[1]) / this.state.v[1])
            } else if (this.trianglePhase === 2 && this.state.x[0] + this.state.v[0] * dt <= 0.001) {
                actualDt = Math.max(0, (0.001 - this.state.x[0]) / this.state.v[0])
            }
        }

        if (actualDt > 1e-6) {
            this.state = integrator.step(this.state, this.dynamics, actualDt) as TransportState
        }

        if (this.isTriangleDemo) {
            if (this.trianglePhase === 0 && Math.abs(this.state.x[0] - Math.PI / 2) < 1e-4) {
                this.trianglePhase = 1
                const speed = Math.sqrt(this.geometry.metric(this.state.x)[0][0] * this.state.v[0] * this.state.v[0])
                this.state.v = [0, speed]
                this.state.x[0] = Math.PI / 2
            } else if (this.trianglePhase === 1 && Math.abs(this.state.x[1] - Math.PI / 2) < 1e-4) {
                this.trianglePhase = 2
                const speed = Math.sqrt(this.geometry.metric(this.state.x)[1][1] * this.state.v[1] * this.state.v[1])
                this.state.v = [-speed, 0]
                this.state.x[1] = Math.PI / 2
            } else if (this.trianglePhase === 2 && Math.abs(this.state.x[0] - 0.001) < 1e-4) {
                this.trianglePhase = 3
                isRunning = false
                this.state.v = [0, 0]
                this.state.x[0] = 0.001
                if (this.initialVector && this.initialPosition && this.state.carriedVectors) {
                    this.currentHolonomy = this.calculate3DAngle(this.initialPosition, this.initialVector, this.state.x, this.state.carriedVectors[0])
                }
            }
        }
        return { isRunning }
    }

    renderState() {
        this.renderer.drawState(this.state)
        if (this.isTriangleDemo && this.initialPosition && this.initialVector) {
            this.renderer.drawVector(this.initialPosition, this.initialVector, 'rgba(255, 255, 255, 0.5)')
        }
    }

    getStatus(time: number): string {
        let speedSq = 0
        const metric = this.geometry.metric(this.state.x)
        for (let i = 0; i < 2; i++)
            for (let j = 0; j < 2; j++)
                speedSq += metric[i][j] * this.state.v[i] * this.state.v[j]

        let hHtml = ''
        if (this.state.carriedVectors?.length) {
            hHtml = `\n<span style="color: #ffff88;">Transported Vector</span>\nV(t): [${this.state.carriedVectors[0][0].toFixed(3)}, ${this.state.carriedVectors[0][1].toFixed(3)}]`
            if (this.currentHolonomy !== null)
                hHtml += `\nHolonomy Angle: <b>${(this.currentHolonomy * 180 / Math.PI).toFixed(2)}&deg;</b>`
        }
        return `Time: ${time.toFixed(2)}\n\nIntrinsic State (&theta;, &phi;)\nPosition: [${this.state.x[0].toFixed(3)}, ${this.state.x[1].toFixed(3)}]\nVelocity: [${this.state.v[0].toFixed(3)}, ${this.state.v[1].toFixed(3)}]${hHtml}\n\ng_ij v^i v^j: ${speedSq.toFixed(5)}`
    }

    private calculate3DAngle(x1: number[], v1: number[], x2: number[], v2: number[]): number {
        const to3D = (th: number, ph: number, vth: number, vph: number) => {
            const ex = [Math.cos(th) * Math.cos(ph), Math.cos(th) * Math.sin(ph), -Math.sin(th)]
            const ephi = [-Math.sin(th) * Math.sin(ph), Math.sin(th) * Math.cos(ph), 0]
            return [vth * ex[0] + vph * ephi[0], vth * ex[1] + vph * ephi[1], vth * ex[2] + vph * ephi[2]]
        }
        const vec1 = to3D(x1[0], x1[1], v1[0], v1[1])
        const vec2 = to3D(x2[0], x2[1], v2[0], v2[1])
        let dot = 0, n1 = 0, n2 = 0
        for (let i = 0; i < 3; i++) {
            dot += vec1[i] * vec2[i]
            n1 += vec1[i] * vec1[i]
            n2 += vec2[i] * vec2[i]
        }
        return Math.acos(Math.max(-1, Math.min(1, dot / Math.sqrt(n1 * n2))))
    }
}
