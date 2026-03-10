import type { SimulationModule, Preset } from './SimulationModule'
import { Minkowski1DGeometry } from '../geometry/Minkowski1DGeometry'
import { RelativisticDynamics } from '../RelativisticDynamics'
import type { State as RelativisticState } from '../State'
import { SpacetimeRenderer } from '../SpacetimeRenderer'
import type { Integrator } from '../Integrator'

export class MinkowskiSimulation implements SimulationModule {
    id = "minkowski-spacetime"
    title = "Minkowski Spacetime & Time Dilation"
    description = "Particles traverse flat 1+1D Lorentzian spacetime. Visualized on a Spacetime Diagram. Demonstrates explicit time dilation and the Twin Paradox out of pure geometry without ad-hoc rules."
    category = "Flat Spacetime"

    private geometry = new Minkowski1DGeometry()
    private dynamics = new RelativisticDynamics(this.geometry)
    private renderer!: SpacetimeRenderer

    private twinA!: RelativisticState
    private twinB!: RelativisticState
    private historyA: number[][] = []
    private historyB: number[][] = []

    presets: Preset[] = [
        {
            name: "Twin Paradox",
            apply: () => {
                this.reset()
                this.twinB.v = [1.666, 1.333] // ~0.8c
            }
        }
    ]

    setup(canvas: HTMLCanvasElement) {
        this.renderer = new SpacetimeRenderer(canvas)
        this.reset()
    }

    createControls(container: HTMLElement) {
        container.innerHTML = `
            <p style="font-size: 13px; color: #aaa;">
                Simulates particle A (stationary) and particle B (traveling 0.8c).<br>
                Notice proper time (tau) ticks slower for the moving particle.
            </p>
        `
    }

    reset() {
        this.twinA = { x: [0, 0], v: [1, 0], tau: 0 }
        this.twinB = { x: [0, 0], v: [1, 0], tau: 0 }
        this.historyA = [[0, 0]]
        this.historyB = [[0, 0]]
    }

    updateState(dt: number, integrator: Integrator): { isRunning: boolean } {
        let isRunning = true
        if (dt > 1e-6) {
            this.twinA = integrator.step(this.twinA, this.dynamics, dt) as RelativisticState
            this.twinB = integrator.step(this.twinB, this.dynamics, dt) as RelativisticState
            this.historyA.push([...this.twinA.x])
            this.historyB.push([...this.twinB.x])
        }

        // Twin Paradox Turnaround logic
        if (this.twinB.x[1] > 4 && this.twinB.v[1] > 0) {
            this.twinB.v = [1.666, -1.333] // turn around, maintain gamma
        }
        if (this.twinB.x[1] <= 0 && this.twinB.v[1] < 0 && this.twinB.x[0] > 1) {
            isRunning = false
            this.twinB.x[1] = 0
            this.twinB.v = [1, 0]
        }

        return { isRunning }
    }

    renderState() {
        this.renderer.clear()
        this.renderer.drawDiagram()
        this.renderer.drawWorldline(this.historyA, '#aaaaaa')
        this.renderer.drawWorldline(this.historyB, '#ff4444')
    }

    getStatus(_time: number): string {
        let speedSqA = 0, speedSqB = 0
        const mA = this.geometry.metric(this.twinA.x)
        const mB = this.geometry.metric(this.twinB.x)
        for (let i = 0; i < 2; i++) {
            for (let j = 0; j < 2; j++) {
                speedSqA += mA[i][j] * this.twinA.v[i] * this.twinA.v[j]
                speedSqB += mB[i][j] * this.twinB.v[i] * this.twinB.v[j]
            }
        }
        return `Coordinate Time: ${this.twinA.x[0].toFixed(2)}
        
<span style="color:#aaaaaa;">Particle A (Stationary)</span>
Position (t,x): [${this.twinA.x[0].toFixed(2)}, ${this.twinA.x[1].toFixed(2)}]
Velocity (dt,dx): [${this.twinA.v[0].toFixed(2)}, ${this.twinA.v[1].toFixed(2)}]
Proper Time &tau;: ${this.twinA.tau?.toFixed(3)}
Speed Sq: ${speedSqA.toFixed(3)}

<span style="color:#ff4444;">Particle B (Traveling)</span>
Position (t,x): [${this.twinB.x[0].toFixed(2)}, ${this.twinB.x[1].toFixed(2)}]
Velocity (dt,dx): [${this.twinB.v[0].toFixed(2)}, ${this.twinB.v[1].toFixed(2)}]
Proper Time &tau;: ${this.twinB.tau?.toFixed(3)}
Speed Sq: ${speedSqB.toFixed(3)}`
    }
}
