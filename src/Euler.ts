import type { Integrator } from './Integrator'
import type { State } from './State'
import type { Dynamics } from './GeodesicDynamics'
import { add, scale } from './math'

export class Euler implements Integrator {
    step(state: State, dynamics: Dynamics, dt: number): State {
        const deriv = dynamics.derivative(state)
        const nextState: State = {
            x: add(state.x, scale(deriv.dx, dt)),
            v: add(state.v, scale(deriv.dv, dt))
        }

        if (state.carriedVectors && 'dCarriedVectors' in deriv) {
            const dV = (deriv as any).dCarriedVectors as number[][]
            nextState.carriedVectors = state.carriedVectors.map((V, i) => add(V, scale(dV[i], dt)))
        }

        if (state.tau !== undefined && 'dtau' in deriv) {
            nextState.tau = state.tau + (deriv.dtau as number) * dt
        }

        return nextState
    }
}
