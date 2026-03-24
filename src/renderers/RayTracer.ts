import type { State } from '../State'
import type { Geometry } from '../Geometry'

export interface RayResult {
    escaped: boolean
    terminalDirection?: number[]
    terminalPos?: number[]
}

export class RayTracer {
    private geometry: Geometry
    private maxSteps: number

    constructor(geometry: Geometry, maxSteps: number = 2000) {
        this.geometry = geometry
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

    public traceBackward(state: State, dt: number, horizonRadius: number, maxRadius: number): RayResult {
        const geom = this.geometry
        
        let t = state.x[0]
        let r = state.x[1]
        let p = state.x[2]
        
        let vt = -state.v[0]
        let vr = -state.v[1]
        let vp = -state.v[2]

        let stepCount = 0
        const tempDv = [0, 0, 0]

        // Helper to compute dv without allocations
        const computeDv = (x0: number, x1: number, x2: number, v0: number, v1: number, v2: number, out: number[]) => {
            const c = geom.christoffel!([x0, x1, x2])
            out[0] = -(c[0][0][0]*v0*v0 + c[0][0][1]*v0*v1 + c[0][0][2]*v0*v2 +
                       c[0][1][0]*v1*v0 + c[0][1][1]*v1*v1 + c[0][1][2]*v1*v2 +
                       c[0][2][0]*v2*v0 + c[0][2][1]*v2*v1 + c[0][2][2]*v2*v2)
            out[1] = -(c[1][0][0]*v0*v0 + c[1][0][1]*v0*v1 + c[1][0][2]*v0*v2 +
                       c[1][1][0]*v1*v0 + c[1][1][1]*v1*v1 + c[1][1][2]*v1*v2 +
                       c[1][2][0]*v2*v0 + c[1][2][1]*v2*v1 + c[1][2][2]*v2*v2)
            out[2] = -(c[2][0][0]*v0*v0 + c[2][0][1]*v0*v1 + c[2][0][2]*v0*v2 +
                       c[2][1][0]*v1*v0 + c[2][1][1]*v1*v1 + c[2][1][2]*v1*v2 +
                       c[2][2][0]*v2*v0 + c[2][2][1]*v2*v1 + c[2][2][2]*v2*v2)
        }

        while (stepCount < this.maxSteps) {
            if (r <= horizonRadius) return { escaped: false }
            if (r >= maxRadius) return { escaped: true, terminalDirection: [vt, vr, vp], terminalPos: [t, r, p] }

            // k1
            const k1_dx0 = vt; const k1_dx1 = vr; const k1_dx2 = vp;
            computeDv(t, r, p, vt, vr, vp, tempDv)
            const k1_dv0 = tempDv[0]; const k1_dv1 = tempDv[1]; const k1_dv2 = tempDv[2];

            // k2
            const t2 = t + k1_dx0 * dt * 0.5; const r2 = r + k1_dx1 * dt * 0.5; const p2 = p + k1_dx2 * dt * 0.5;
            const vt2 = vt + k1_dv0 * dt * 0.5; const vr2 = vr + k1_dv1 * dt * 0.5; const vp2 = vp + k1_dv2 * dt * 0.5;
            const k2_dx0 = vt2; const k2_dx1 = vr2; const k2_dx2 = vp2;
            computeDv(t2, r2, p2, vt2, vr2, vp2, tempDv)
            const k2_dv0 = tempDv[0]; const k2_dv1 = tempDv[1]; const k2_dv2 = tempDv[2];

            // k3
            const t3 = t + k2_dx0 * dt * 0.5; const r3 = r + k2_dx1 * dt * 0.5; const p3 = p + k2_dx2 * dt * 0.5;
            const vt3 = vt + k2_dv0 * dt * 0.5; const vr3 = vr + k2_dv1 * dt * 0.5; const vp3 = vp + k2_dv2 * dt * 0.5;
            const k3_dx0 = vt3; const k3_dx1 = vr3; const k3_dx2 = vp3;
            computeDv(t3, r3, p3, vt3, vr3, vp3, tempDv)
            const k3_dv0 = tempDv[0]; const k3_dv1 = tempDv[1]; const k3_dv2 = tempDv[2];

            // k4
            const t4 = t + k3_dx0 * dt; const r4 = r + k3_dx1 * dt; const p4 = p + k3_dx2 * dt;
            const vt4 = vt + k3_dv0 * dt; const vr4 = vr + k3_dv1 * dt; const vp4 = vp + k3_dv2 * dt;
            const k4_dx0 = vt4; const k4_dx1 = vr4; const k4_dx2 = vp4;
            computeDv(t4, r4, p4, vt4, vr4, vp4, tempDv)
            const k4_dv0 = tempDv[0]; const k4_dv1 = tempDv[1]; const k4_dv2 = tempDv[2];

            t += (dt / 6) * (k1_dx0 + 2 * k2_dx0 + 2 * k3_dx0 + k4_dx0)
            r += (dt / 6) * (k1_dx1 + 2 * k2_dx1 + 2 * k3_dx1 + k4_dx1)
            p += (dt / 6) * (k1_dx2 + 2 * k2_dx2 + 2 * k3_dx2 + k4_dx2)

            vt += (dt / 6) * (k1_dv0 + 2 * k2_dv0 + 2 * k3_dv0 + k4_dv0)
            vr += (dt / 6) * (k1_dv1 + 2 * k2_dv1 + 2 * k3_dv1 + k4_dv1)
            vp += (dt / 6) * (k1_dv2 + 2 * k2_dv2 + 2 * k3_dv2 + k4_dv2)

            stepCount++
        }

        return { escaped: false } 
    }
}
