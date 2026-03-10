import type { State } from './State'
import type { Geometry } from './Geometry'
import type { Dynamics, StateDerivative } from './GeodesicDynamics'
import { GeodesicDynamics } from './GeodesicDynamics'

export class RelativisticDynamics implements Dynamics {
    baseDynamics: GeodesicDynamics
    geometry: Geometry

    constructor(geometry: Geometry) {
        this.geometry = geometry
        this.baseDynamics = new GeodesicDynamics(geometry)
    }

    derivative(state: State): StateDerivative {
        // Compute standard geodesic motion (spatial and temporal coordinates)
        const deriv = this.baseDynamics.derivative(state)

        // Compute proper time accumulation: d\tau = \sqrt{-g_{\mu\nu} v^\mu v^\nu}
        const { x, v } = state
        const g = this.geometry.metric(x)
        const dim = this.geometry.dimension

        let properSpeedSq = 0
        for (let i = 0; i < dim; i++) {
            for (let j = 0; j < dim; j++) {
                properSpeedSq += g[i][j] * v[i] * v[j]
            }
        }

        // For timelike trajectories, g_ij v^i v^j < 0, so -g_ij v^i v^j > 0.
        // We accumulate proper time for timelike/lightlike paths. If spacelike, dtau is technically imaginary, 
        // but we'll cap it at 0 to avoid NaNs crashing the engine.
        const dtau = properSpeedSq <= 0 ? Math.sqrt(-properSpeedSq) : 0

        return {
            ...deriv,
            dtau
        }
    }
}
