import type { Geometry } from '../Geometry'

export class SchwarzschildGeometry implements Geometry {
    readonly dimension = 3 // (t, r, phi)
    mass: number

    constructor(mass: number) {
        this.mass = mass
    }

    metric(x: number[]): number[][] {
        const r = x[1]
        // Prevent division-by-zero singularities near the event horizon r = 2M.
        // If the particle gets too close to or inside the horizon, the simulation 
        // behavior is not physically guaranteed by standard (+,-,-,-) coordinate charts, 
        // so we clamp exactly at the horizon plus an epsilon.
        const rs = 2 * this.mass
        const safeR = Math.max(r, rs + 1e-6)

        const f = 1 - rs / safeR

        return [
            [-f, 0, 0],
            [0, 1 / f, 0],
            [0, 0, safeR * safeR]
        ]
    }

    inverseMetric(x: number[]): number[][] {
        const r = x[1]
        const rs = 2 * this.mass
        const safeR = Math.max(r, rs + 1e-6)

        const f = 1 - rs / safeR

        return [
            [-1 / f, 0, 0],
            [0, f, 0],
            [0, 0, 1 / (safeR * safeR)]
        ]
    }

    christoffel(x: number[]): number[][][] {
        const r = x[1]
        const M = this.mass
        const rs = 2 * M
        const safeR = Math.max(r, rs + 1e-6)

        const f = 1 - rs / safeR

        // Initialize 3x3x3 array of zeros
        const G = Array(3).fill(0).map(() => Array(3).fill(0).map(() => Array(3).fill(0)))

        // Non-zero Christoffel symbols for Schwarzschild in (t, r, phi)
        // Gamma^t_{tr} = Gamma^t_{rt} = M / (r^2 * (1 - 2M/r))
        const Gamma_t_tr = M / (safeR * safeR * f)
        G[0][0][1] = Gamma_t_tr
        G[0][1][0] = Gamma_t_tr

        // Gamma^r_{tt} = (M / r^2) * (1 - 2M/r)
        G[1][0][0] = (M / (safeR * safeR)) * f

        // Gamma^r_{rr} = -M / (r^2 * (1 - 2M/r))
        G[1][1][1] = -M / (safeR * safeR * f)

        // Gamma^r_{phi phi} = -r * (1 - 2M/r)
        G[1][2][2] = -safeR * f

        // Gamma^phi_{r phi} = Gamma^phi_{phi r} = 1 / r
        const Gamma_phi_rphi = 1 / safeR
        G[2][1][2] = Gamma_phi_rphi
        G[2][2][1] = Gamma_phi_rphi

        return G
    }
}
