import type { SimulationModule } from './SimulationModule'
import { SchwarzschildGeometry } from '../geometry/SchwarzschildGeometry'
import { ShipDynamics } from '../ShipDynamics'
import { ShipRenderer } from '../ShipRenderer'
import { CockpitRenderer } from '../renderers/CockpitRenderer'
import { KeyboardController } from '../KeyboardController'
import type { Ship } from '../Ship'
import type { Integrator } from '../Integrator'
import { RK4 } from '../RK4'
import { GeodesicDynamics } from '../GeodesicDynamics'

export class CockpitFlightDemo implements SimulationModule {
    id = 'cockpit-flight'
    title = 'Relativistic Cockpit View'
    category = 'INTERACTIVE MISSIONS'
    description = `
        **First-Person Null Geodesics**
        <br/><br/>
        Pilot a spacecraft around a Black Hole while interpreting reality purely through the backwards-traced photons hitting your windshield!
        <ul>
            <li><strong>W</strong> : Forward Thrust</li>
            <li><strong>A / D</strong> : Rotate Ship</li>
            <li><strong>View Toggle</strong> : Swap between Cartographic and Cockpit views.</li>
        </ul>
    `

    mass = 1.0

    private externalRenderer!: ShipRenderer
    private cockpitRenderer!: CockpitRenderer
    private viewMode: 'EXTERNAL' | 'COCKPIT' = 'EXTERNAL'

    private geometry!: SchwarzschildGeometry
    private state!: Ship
    private shipDynamics!: ShipDynamics
    private overrideIntegrator!: Integrator
    private keyboard!: KeyboardController
    
    // UI elements
    private modeSelect!: HTMLSelectElement
    private resSelect!: HTMLSelectElement

    setup(canvas: HTMLCanvasElement): void {
        this.externalRenderer = new ShipRenderer(canvas, this.mass)
        this.geometry = new SchwarzschildGeometry(this.mass)
        this.shipDynamics = new ShipDynamics(this.geometry)
        
        // The cockpit renderer gets pure geometry dynamics to trace rays
        this.cockpitRenderer = new CockpitRenderer(canvas, new GeodesicDynamics(this.geometry))
        
        this.overrideIntegrator = new RK4()

        this.resetState()
    }

    private resetState() {
        const x = [0, 30, 0] 
        // Circular orbit velocity v_phi = sqrt(M/r) / (r * sqrt(1 - 3M/r))
        // Actually let's just use 0 tangential velocity for simplicity
        const v = [1.0, 0, 0]

        this.state = {
            id: 'player-ship',
            x,
            v,
            tau: 0,
            orientation: Math.PI / 2, 
            thrust: 0,
            trail: [[...x]]
        }

        if (this.keyboard) {
            this.keyboard.destroy()
        }
        this.keyboard = new KeyboardController(this.state)
    }

    createControls(container: HTMLElement): void {
        const root = document.createElement('div')
        root.innerHTML = `
            <div style="margin-top: 15px;">
                <label style="color: #ccc;">Camera Mode:</label><br/>
                <select id="cockpit-mode" style="width: 100%; padding: 5px; background: #222; color: #fff; border: 1px solid #444; border-radius: 4px; margin-top: 5px;">
                    <option value="EXTERNAL" selected>Third-Person (Cartographic)</option>
                    <option value="COCKPIT">First-Person (Relativistic)</option>
                </select>
            </div>
            <div style="margin-top: 15px;">
                <label style="color: #ccc;">Cockpit Resolution:</label><br/>
                <select id="cockpit-res" style="width: 100%; padding: 5px; background: #222; color: #fff; border: 1px solid #444; border-radius: 4px; margin-top: 5px;">
                    <option value="50x37" selected>50 x 37 (Ultra Fast)</option>
                    <option value="100x75">100 x 75 (Normal)</option>
                    <option value="200x150">200 x 150 (Smooth)</option>
                    <option value="400x300">400 x 300 (Slow - HD)</option>
                </select>
            </div>
        `
        container.appendChild(root)

        this.modeSelect = root.querySelector('#cockpit-mode') as HTMLSelectElement
        this.resSelect = root.querySelector('#cockpit-res') as HTMLSelectElement

        this.modeSelect.addEventListener('change', () => {
             this.viewMode = this.modeSelect.value as 'EXTERNAL' | 'COCKPIT'
        })

        this.resSelect.addEventListener('change', () => {
             const [w, h] = this.resSelect.value.split('x').map(Number)
             this.cockpitRenderer.setResolution(w, h)
        })
    }

    reset(): void {
        this.resetState()
        this.viewMode = 'EXTERNAL'
        if (this.modeSelect) this.modeSelect.value = 'EXTERNAL'
    }

    updateState(dt: number, _integrator: Integrator): { isRunning: boolean } {
        // Integrate Ship Physics
        this.keyboard.update(dt)
        
        // Move the ship physics tick
        const step = this.overrideIntegrator.step(this.state, this.shipDynamics, dt)
        this.state.x = step.x
        this.state.v = step.v
        if ('tau' in step) this.state.tau = (step as any).tau
        
        // Safe limits
        if (this.state.x[1] <= 2.05) this.state.x[1] = 2.05
        if (this.state.x[1] >= 50) this.state.x[1] = 49.9

        // Record a trail point occasionally 
        if (Math.random() < 0.1) {
            this.state.trail!.push([...this.state.x])
            if (this.state.trail!.length > 100) this.state.trail!.shift()
        }

        return { isRunning: true }
    }

    renderState(): void {
        if (this.viewMode === 'EXTERNAL') {
            this.externalRenderer.clear()
            this.externalRenderer.drawEnvironment()
            this.externalRenderer.drawShip(this.state)
        } else {
            this.cockpitRenderer.render(this.state, this.geometry)
        }
    }

    getStatus(_time: number): string {
        const metrics = `
r: ${this.state.x[1].toFixed(2)}
φ: ${this.state.x[2].toFixed(2)}
Heading: ${(this.state.orientation * 180 / Math.PI).toFixed(0)}°
        `
        return metrics
    }
}
