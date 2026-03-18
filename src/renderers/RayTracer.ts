import type { State } from '../State'
import type { Geometry } from '../Geometry'
import type { Integrator } from '../Integrator'

export interface RayResult {
    escaped: boolean
    terminalDirection?: number[]
    terminalPos?: number[]
}

export class RayTracer {
    private geometry: Geometry
    private integrator: Integrator
    private maxSteps: number

    constructor(geometry: Geometry, integrator: Integrator, maxSteps: number = 2000) {
        this.geometry = geometry
        this.integrator = integrator
        this.maxSteps = maxSteps
    }

    /**
     * Solves for v^t such that g_uv v^u v^v = 0
     * Requires v^t > 0 (future-directed)
     */
    public initializeNullRay(x: number[], spatialDirection: number[]): State {
        // Assume [v^r, v^phi] spatial components
        const vr = spatialDirection[0]
        const vphi = spatialDirection[1]
        
        // Normalize spatial direction for numerical stability
        const spatialMag = Math.sqrt(vr * vr + vphi * vphi) || 1
        const n_vr = vr / spatialMag
        const n_vphi = vphi / spatialMag

        const g = this.geometry.metric(x)
        
        // g_tt * v_t^2 + g_rr * v_r^2 + g_phiphi * v_phi^2 = 0
        // We know for Schwarzschild it's diagonal, but let's write it generically for diagonal metrics
        // (Assuming off-diagonal terms involving time are 0 to simplify the quadratic)
        const g_tt = g[0][0]
        const g_rr = g[1][1]
        const g_pp = g[2][2]

        const spatialPartSq = (g_rr * n_vr * n_vr) + (g_pp * n_vphi * n_vphi)
        
        // g_tt * (v^t)^2 = -spatialPartSq
        // (v^t)^2 = -spatialPartSq / g_tt
        // Since g_tt is negative, the right side is positive
        const vtSq = -spatialPartSq / g_tt
        const vt = Math.sqrt(vtSq) // Ensure positive (future directed)

        return {
            x: [...x],
            v: [vt, n_vr, n_vphi],
            type: 'Null'
        } as State & { type: 'Null' }
    }

    /**
     * Traces a ray BACKWARDS in time to see where it came from.
     * To integrate backward while keeping the integrator healthy, we invert the velocity
     * and step forward in integration parameter.
     */
    public traceBackward(state: State, dynamics: any, dt: number, horizonRadius: number, maxRadius: number): RayResult {
        let currentState = {
            ...state,
            v: [-state.v[0], -state.v[1], -state.v[2]] // Invert velocity for reverse tracing
        }

        let stepCount = 0
        
        while (stepCount < this.maxSteps) {
            currentState = this.integrator.step(currentState, dynamics, dt)
            
            const r = currentState.x[1]

            // Hit the event horizon (or very near it to avoid numerical blowup)
            if (r <= horizonRadius) {
                return { escaped: false }
            }

            // Escaped to infinity
            if (r >= maxRadius) {
                return { escaped: true, terminalDirection: [...currentState.v], terminalPos: [...currentState.x] }
            }

            stepCount++
        }

        // Technically fell in or got trapped in an unstable orbit infinitely wrapping
        return { escaped: false } 
    }
}
