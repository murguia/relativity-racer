import type { State, TrajectoryType } from './State'
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

    derivative(state: State & { type?: TrajectoryType }): StateDerivative {
        const deriv = this.baseDynamics.derivative(state)
        
        let dtau = 0;
        if (state.type !== 'Null') {
            const { x, v } = state
            const g = this.geometry.metric(x)
            let invariantSq = 0
            for (let i = 0; i < g.length; i++) {
                for (let j = 0; j < g.length; j++) {
                    invariantSq += g[i][j] * v[i] * v[j]
                }
            }
            dtau = Math.sqrt(Math.abs(invariantSq))
        }

        return {
            ...deriv,
            dtau
        }
    }
}
