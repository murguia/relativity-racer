import type { State } from './State'
import type { Dynamics } from './GeodesicDynamics'

export interface Integrator {
    step(state: State, dynamics: Dynamics, dt: number): State
}
