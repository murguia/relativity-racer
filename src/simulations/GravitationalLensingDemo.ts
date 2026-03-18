import type { SimulationModule } from './SimulationModule'
import { LensingRenderer } from '../renderers/LensingRenderer'

export class GravitationalLensingDemo implements SimulationModule {
    id = 'lensing-demo'
    title = 'Gravitational Lensing & Shadow'
    category = 'VISUALIZATION'
    description = `
        **Visualizing Null Geodesics**
        <br/><br/>
        This module shoots rays of light (photons) backwards from the observer and tracks them along curved spacetime using the full Schwarzschild metric $g_{\\mu\\nu}$. 
        <ul>
            <li>Rays that fall into the Event Horizon ($r < 2M$) appear <b>Black</b>.</li>
            <li>Rays that escape hit a deterministic striped background representing the "Sky" at infinity.</li>
        </ul>
        You are seeing the genuine Einstein Ring!
    `

    private renderer!: LensingRenderer
    private obsRadius: number = 15.0

    // UI elements
    private resSelect!: HTMLSelectElement
    private distRange!: HTMLInputElement
    private distLabel!: HTMLElement

    setup(canvas: HTMLCanvasElement): void {
        // We initialize the renderer at a default coarse resolution to ensure fast frame rates
        // It uses its own offscreen data array internally for blocky drawing.
        this.renderer = new LensingRenderer(canvas, 160, 120)
        this.renderer.setObserverDistance(this.obsRadius)
    }

    createControls(container: HTMLElement): void {
        const root = document.createElement('div')
        root.innerHTML = `
            <div style="margin-top: 15px;">
                <label style="color: #ccc;">Rendering Resolution:</label><br/>
                <select id="lensing-res" style="width: 100%; padding: 5px; background: #222; color: #fff; border: 1px solid #444; border-radius: 4px; margin-top: 5px;">
                    <option value="40x30">40 x 30 (Ultra Fast)</option>
                    <option value="80x60">80 x 60 (Fast)</option>
                    <option value="160x120" selected>160 x 120 (Normal)</option>
                    <option value="320x240">320 x 240 (Slow - HD)</option>
                </select>
            </div>
            <div style="margin-top: 15px;">
                <label style="color: #ccc;">Observer Distance ($r$): <span id="dist-val">15.0</span></label><br/>
                <input type="range" id="lensing-dist" min="3" max="50" step="0.5" value="15" style="width: 100%; margin-top: 5px;">
            </div>
        `
        container.appendChild(root)

        this.resSelect = root.querySelector('#lensing-res') as HTMLSelectElement
        this.distRange = root.querySelector('#lensing-dist') as HTMLInputElement
        this.distLabel = root.querySelector('#dist-val') as HTMLElement

        this.resSelect.addEventListener('change', () => {
             const [w, h] = this.resSelect.value.split('x').map(Number)
             this.renderer.setResolution(w, h)
        })

        this.distRange.addEventListener('input', () => {
             this.obsRadius = parseFloat(this.distRange.value)
             this.distLabel.innerText = this.obsRadius.toFixed(1)
             this.renderer.setObserverDistance(this.obsRadius)
        })
    }

    reset(): void {
        this.obsRadius = 15.0
        this.renderer.setObserverDistance(this.obsRadius)
        if (this.distRange) this.distRange.value = '15'
        if (this.distLabel) this.distLabel.innerText = '15.0'
    }

    updateState(_dt: number, _integrator: any): { isRunning: boolean } {
        // Nothing moves forward in physical time. The renderer handles all backward
        // simulation during its render pass instantly for the current static frame.
        return { isRunning: true }
    }

    renderState(): void {
        this.renderer.render()
    }

    getStatus(_time: number): string {
        const status = this.renderer['isRendering'] ? 'RENDERING...' : 'COMPLETE'
        const progress = this.renderer['isRendering'] 
            ? Math.floor((this.renderer['renderY'] / this.renderer['resHeight']) * 100) + '%'
            : '100%'

        return `Status: ${status} (${progress})
Observer r: ${this.obsRadius.toFixed(2)}
Background: Lat/Long deterministic stripes
Rays evaluate until r <= 2.05M or r >= 50.0
        `
    }
}
