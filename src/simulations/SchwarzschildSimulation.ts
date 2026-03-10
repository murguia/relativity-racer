import type { SimulationModule, Preset } from './SimulationModule'
import { SchwarzschildGeometry } from '../geometry/SchwarzschildGeometry'
import { RelativisticDynamics } from '../RelativisticDynamics'
import type { State as RelativisticState } from '../State'
import { SchwarzschildRenderer } from '../SchwarzschildRenderer'
import type { Integrator } from '../Integrator'

export class SchwarzschildSimulation implements SimulationModule {
    id = "schwarzschild-gravity"
    title = "Schwarzschild Spacetime (Point Mass Gravity)"
    description = "Particles traverse 2+1D curved spacetime around a non-rotating Black Hole of mass M. Demonstrates orbital mechanics, slingshot trajectories, and gravitational time dilation natively out of the geodesic equation, without computing any Newtonian gravitational 'forces'."
    category = "Curved Spacetime"

    private geometry!: SchwarzschildGeometry
    private dynamics!: RelativisticDynamics
    private renderer!: SchwarzschildRenderer
    private state!: RelativisticState
    private history: number[][] = []

    private controls!: {
        massM: HTMLInputElement,
        initR: HTMLInputElement,
        initPhi: HTMLInputElement,
        initVR: HTMLInputElement,
        initVPhi: HTMLInputElement
    }

    presets: Preset[] = [
        { name: "Approach", apply: () => this.applyPreset(30, 0, -0.4, 0.002) },
        { name: "Slingshot", apply: () => this.applyPreset(30, 0, -0.6, 0.012) },
        {
            name: "Orbit (Time Dilation)", apply: () => {
                const M = parseFloat(this.controls?.massM.value || "1")
                const R = 20
                const v_phi = Math.sqrt(M / (R * R * R))
                this.applyPreset(R, 0, 0, v_phi)
            }
        }
    ]

    setup(canvas: HTMLCanvasElement) {
        this.geometry = new SchwarzschildGeometry(1)
        this.dynamics = new RelativisticDynamics(this.geometry)
        this.renderer = new SchwarzschildRenderer(canvas, 1)
        this.reset()
    }

    createControls(container: HTMLElement) {
        container.innerHTML = `
            <label>Central Mass (M): <input type="number" id="massM" value="1" step="0.5" /></label>
            <br><br>
            <label>Initial R: <input type="number" id="initR" value="30" step="1" /></label>
            <label>Initial &phi;: <input type="number" id="initGravPhi" value="0" step="0.1" /></label>
            <label>Initial v<sub>r</sub>: <input type="number" id="initVR" value="-0.2" step="0.05" /></label>
            <label>Initial v<sub>&phi;</sub>: <input type="number" id="initGPhi" value="0.005" step="0.001" /></label>
            <p style="font-size: 12px; color: #aaa;">Note: v_t is initialized to 1.0 (coordinate time rate).</p>
        `

        this.controls = {
            massM: container.querySelector('#massM') as HTMLInputElement,
            initR: container.querySelector('#initR') as HTMLInputElement,
            initPhi: container.querySelector('#initGravPhi') as HTMLInputElement,
            initVR: container.querySelector('#initVR') as HTMLInputElement,
            initVPhi: container.querySelector('#initGPhi') as HTMLInputElement
        }

        this.controls.massM.addEventListener('input', () => {
            const M = parseFloat(this.controls.massM.value)
            this.geometry = new SchwarzschildGeometry(M)
            this.dynamics = new RelativisticDynamics(this.geometry)
            this.renderer.setMass(M)
            this.renderState()
        })
    }

    reset() {
        const M = parseFloat(this.controls?.massM.value || "1")
        this.geometry = new SchwarzschildGeometry(M)
        this.dynamics = new RelativisticDynamics(this.geometry)

        this.state = {
            x: [0, parseFloat(this.controls?.initR.value || "30"), parseFloat(this.controls?.initPhi.value || "0")],
            v: [1, parseFloat(this.controls?.initVR.value || "-0.2"), parseFloat(this.controls?.initVPhi.value || "0.005")],
            tau: 0
        }
        this.history = [[...this.state.x]]

        if (this.renderer) this.renderer.setMass(M)
    }

    private applyPreset(r: number, phi: number, vr: number, vphi: number) {
        if (!this.controls) return
        this.controls.initR.value = r.toString()
        this.controls.initPhi.value = phi.toString()
        this.controls.initVR.value = vr.toString()
        this.controls.initVPhi.value = vphi.toString()
        this.reset()
    }

    updateState(dt: number, integrator: Integrator): { isRunning: boolean } {
        let isRunning = true
        if (dt > 1e-6) {
            this.state = integrator.step(this.state, this.dynamics, dt) as RelativisticState
            this.history.push([...this.state.x])

            // Auto pause if falls into black hole horizon
            if (this.state.x[1] <= 2.05 * this.geometry.mass) {
                isRunning = false
            }
        }
        return { isRunning }
    }

    renderState() {
        this.renderer.clear()
        this.renderer.drawEnvironment()
        this.renderer.drawState(this.state, this.history)
    }

    getStatus(time: number): string {
        let speedSq = 0
        const metric = this.geometry.metric(this.state.x)
        for (let i = 0; i < 3; i++)
            for (let j = 0; j < 3; j++)
                speedSq += metric[i][j] * this.state.v[i] * this.state.v[j]

        const M = this.geometry.mass
        const r = this.state.x[1]
        const dilationFactor = Math.sqrt(Math.max(0, 1 - 2 * M / r))

        return `External Parameter &lambda;: ${time.toFixed(2)}
        
Coordinate Time (t): ${this.state.x[0].toFixed(3)}
Proper Time (&tau;): ${this.state.tau?.toFixed(3)}

Coordinates (r, &phi;): [${r.toFixed(3)}, ${this.state.x[2].toFixed(3)}]
Velocity (v_r, v_&phi;): [${this.state.v[1].toFixed(5)}, ${this.state.v[2].toFixed(5)}]

Expected Time Dilation (at rest): ${dilationFactor.toFixed(4)}x
Proper Speed Sq (g_ij v^i v^j): ${speedSq.toFixed(5)}`
    }
}
