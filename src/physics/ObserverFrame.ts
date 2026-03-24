import type { Geometry } from '../Geometry'
import type { Ship } from '../Ship'

export interface ObserverFrame {
    e0: number[] // Timelike basis vector (ship 4-velocity)
    e1: number[] // Forward spatial vector
    e2: number[] // Right spatial vector
}

/**
 * Computes the spacetime inner product g(u, v) using the given metric tensor.
 */
function dotProduct(u: number[], v: number[], g: number[][]): number {
    let sum = 0
    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
            sum += g[i][j] * u[i] * v[j]
        }
    }
    return sum
}

export function buildObserverFrame(ship: Ship, geometry: Geometry): ObserverFrame {
    const g = geometry.metric(ship.x)

    // 1. TIMELIKE BASIS (e0)
    // The ship's 4-velocity might have numerical drift or improper initialization.
    // We enforce the strict timelike normalization: g(v, v) = -1.
    // If it's fundamentally not a valid 4-vector, we reconstruct v^t.
    let v = [...ship.v]
    let normSq = dotProduct(v, v, g)

    // If normSq is positive (spacelike) or totally degenerate, re-derive v^t from spatial components
    if (normSq >= 0) {
        const spatialNormSq = g[1][1] * v[1] * v[1] + g[2][2] * v[2] * v[2] // Assuming diagonal for fallback
        // g_tt * (v^t)^2 + spatialNormSq = -1  =>  (v^t)^2 = (-1 - spatialNormSq) / g_tt
        const vtSq = (-1 - spatialNormSq) / g[0][0]
        v[0] = Math.sqrt(Math.max(vtSq, 0)) // Force positive t direction
        normSq = -1
    }

    // Normalize to exact -1
    const factor0 = 1.0 / Math.sqrt(-normSq)
    const e0 = [v[0] * factor0, v[1] * factor0, v[2] * factor0]

    // 2. FORWARD SPATIAL BASIS (e1)
    // Construct a candidate spatial direction aligned with ship heading.
    // Time component is initially 0.
    const u1 = [0, Math.cos(ship.orientation), Math.sin(ship.orientation) / Math.max(ship.x[1], 1e-6)]
    
    // Project into the local rest space orthogonal to e0: u' = u - g(e0, u) * e0
    // Note: e0 has norm -1, so projection formulas often differ by a sign.
    // Let's verify: we want g(u1', e0) = 0.
    // g(u1 - k*e0, e0) = g(u1, e0) - k*g(e0, e0) = g(u1, e0) - k(-1) = g(u1, e0) + k = 0 => k = -g(u1, e0)
    // So: u1' = u1 - (-g(u1, e0)) * e0 = u1 + g(u1, e0) * e0
    const dot_e0_u1 = dotProduct(e0, u1, g)
    const u1_prime = [
        u1[0] + dot_e0_u1 * e0[0],
        u1[1] + dot_e0_u1 * e0[1],
        u1[2] + dot_e0_u1 * e0[2]
    ]

    // Normalize e1 to +1
    const norm_u1_prime = Math.sqrt(dotProduct(u1_prime, u1_prime, g))
    const factor1 = 1.0 / norm_u1_prime
    const e1 = [u1_prime[0] * factor1, u1_prime[1] * factor1, u1_prime[2] * factor1]

    // 3. RIGHT SPATIAL BASIS (e2)
    // Construct candidate perpendicular to the heading inside the spatial plane.
    const rightOrientation = ship.orientation - Math.PI / 2
    const u2 = [0, Math.cos(rightOrientation), Math.sin(rightOrientation) / Math.max(ship.x[1], 1e-6)]

    // Project against both e0 and e1
    // For e0 (norm -1): project uses + g(e0, u) * e0
    // For e1 (norm +1): project uses - g(e1, u) * e1
    const dot_e0_u2 = dotProduct(e0, u2, g)
    const dot_e1_u2 = dotProduct(e1, u2, g)
    const u2_prime = [
        u2[0] + dot_e0_u2 * e0[0] - dot_e1_u2 * e1[0],
        u2[1] + dot_e0_u2 * e0[1] - dot_e1_u2 * e1[1],
        u2[2] + dot_e0_u2 * e0[2] - dot_e1_u2 * e1[2]
    ]

    // Normalize e2 to +1
    const norm_u2_prime = Math.sqrt(dotProduct(u2_prime, u2_prime, g))
    const factor2 = 1.0 / norm_u2_prime
    const e2 = [u2_prime[0] * factor2, u2_prime[1] * factor2, u2_prime[2] * factor2]

    return { e0, e1, e2 }
}
