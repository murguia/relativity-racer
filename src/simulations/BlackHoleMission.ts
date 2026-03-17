import type { SimulationModule } from './SimulationModule'
import { SchwarzschildGeometry } from '../geometry/SchwarzschildGeometry'
import { ShipDynamics } from '../ShipDynamics'
import { ShipRenderer } from '../ShipRenderer'
import { KeyboardController } from '../KeyboardController'
import type { Ship } from '../Ship'
import type { Integrator } from '../Integrator'
import { RK4 } from '../RK4'

export class BlackHoleMission implements SimulationModule {
    id = 'black-hole-flyby'
    title = 'Black Hole Flyby'
    category = 'INTERACTIVE MISSIONS'
    description = `
        **Mission:** Reach the green waypoint on the far side of the black hole.
        <br/><br/>
        **Controls:**
        <ul>
            <li><strong>W</strong> : Forward Thrust</li>
            <li><strong>A / D</strong> : Rotate Ship</li>
        </ul>
        You cannot overcome the black hole's gravity with thrust alone. Use gravity assists and geodesic orbital bending to navigate efficiently!
    `

    mass = 1.0
    waypointR = 25.0
    waypointPhi = Math.PI // Opposite side

    private renderer!: ShipRenderer
    private geometry!: SchwarzschildGeometry
    private state!: Ship
    private shipDynamics!: ShipDynamics
    private overrideIntegrator!: Integrator
    private keyboard!: KeyboardController

    setup(canvas: HTMLCanvasElement): void {
        this.renderer = new ShipRenderer(canvas, this.mass)
        this.geometry = new SchwarzschildGeometry(this.mass)
        this.shipDynamics = new ShipDynamics(this.geometry)
        
        // We override the UI integrator because we strict require RK4 
        // for stability under player thrust
        this.overrideIntegrator = new RK4()

        this.resetState()
    }

    private resetState() {
        const x = [0, 30, 0] 
        const v = [1.0, 0, 0]

        this.state = {
            id: 'player-ship',
            x,
            v,
            tau: 0,
            orientation: Math.PI / 2, // Facing "Up"
            thrust: 0,
            trail: [[...x]]
        }

        if (this.keyboard) {
            this.keyboard.destroy()
        }
        this.keyboard = new KeyboardController(this.state)

        const statusEl = document.getElementById('mission-status')
        if (statusEl) {
            statusEl.innerText = 'Mission Active'
            statusEl.style.color = 'yellow'
        }
    }

    createControls(container: HTMLElement): void {
        const root = document.createElement('div')
        root.innerHTML = `
            <div style="color: #ccc; margin-top: 10px; padding: 10px; background: rgba(255,100,0,0.1); border: 1px solid rgba(255,100,0,0.5); border-radius: 4px;">
                <strong>WARNING:</strong> Navigation requires an understanding of orbital mechanics in curved spacetime. Thrust sparingly!
            </div>
            <div id="mission-status" style="margin-top: 15px; font-weight: bold; font-size: 1.2em; color: yellow;">Mission Active</div>
        `
        container.appendChild(root)
    }

    reset(): void {
        this.resetState()
    }

    updateState(dt: number, _integrator: Integrator): { isRunning: boolean } {
        // 1. Check keyboard inputs and apply steering to ship.orientation and thrust
        this.keyboard.update(dt)

        // 2. Step physics (we ignore the UI _integrator and use ours)
        const nextState = this.overrideIntegrator.step(this.state, this.shipDynamics, dt)

        // RK4 creates a new generic State object. We need to preserve our Ship specific properties
        // and only update the physical ones, plus add our trail logic.
        this.state.x = nextState.x
        this.state.v = nextState.v
        if (nextState.tau !== undefined) {
            this.state.tau = nextState.tau
        }

        // 3. Update trail
        if (this.state.trail.length === 0 || Math.abs(this.state.x[0] - this.state.trail[this.state.trail.length - 1][0]) > 2) {
            this.state.trail.push([...this.state.x])
        }

        if (this.state.trail.length > 500) {
            this.state.trail.shift()
        }

        // 4. Check win condition
        const r = this.state.x[1]
        let phi = this.state.x[2] % (2 * Math.PI)
        if (phi < 0) phi += 2 * Math.PI
        
        // Distance to waypoint (polar to rough cartesian diff)
        const dx = r * Math.cos(phi) - this.waypointR * Math.cos(this.waypointPhi)
        const dy = r * Math.sin(phi) - this.waypointR * Math.sin(this.waypointPhi)
        const dist = Math.sqrt(dx*dx + dy*dy)

        let isRunning = true
        const statusEl = document.getElementById('mission-status')
        if (statusEl) {
            if (dist < 2.0) {
                statusEl.innerText = 'MISSION CLEAR! Waypoint Reached.'
                statusEl.style.color = '#00ff00'
                isRunning = false
            } else if (r <= 2 * this.mass + 0.1) {
                statusEl.innerText = 'CRITICAL FAILURE: Event Horizon Crossed.'
                statusEl.style.color = '#ff0000'
                isRunning = false
            } else {
                statusEl.innerText = `Distance to target: ${dist.toFixed(1)}`
                statusEl.style.color = 'yellow'
            }
        }

        return { isRunning }
    }

    renderState(): void {
        this.renderer.clear()
        this.renderer.drawEnvironment(this.waypointR, this.waypointPhi)
        this.renderer.drawShip(this.state)
    }

    getStatus(_time: number): string {
        const ship = this.state

        const metricSpeedSq = -ship.v[0]*ship.v[0]*(1 - 2*this.mass/ship.x[1]) 
            + ship.v[1]*ship.v[1] / (1 - 2*this.mass/ship.x[1]) 
            + ship.v[2]*ship.v[2] * (ship.x[1]*ship.x[1])

        return `Coordinate Time (t): ${ship.x[0].toFixed(3)}
Proper Time (τ): ${ship.tau?.toFixed(3)}
Speed Sq (invariant): ${metricSpeedSq.toFixed(5)}
Heading (deg): ${((ship.orientation * 180) / Math.PI % 360).toFixed(1)}
Thrust: ${(ship.thrust > 0 ? 'ON' : 'OFF')}
        `
    }
}
