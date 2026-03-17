import type { Integrator } from './Integrator'
import type { State } from './State'
import type { Dynamics } from './GeodesicDynamics'
import { add, scale } from './math'

export class RK4 implements Integrator {
    step(state: State, dynamics: Dynamics, dt: number): State {
        const { x, v, carriedVectors } = state
        const hasVecs = !!carriedVectors

        // k1
        const d1 = dynamics.derivative(state)

        // Helper for stepping state
        const stepState = (deriv: any, factor: number) => {
            const s: State = {
                ...state,
                x: add(x, scale(deriv.dx, factor)),
                v: add(v, scale(deriv.dv, factor))
            }
            if (hasVecs && 'dCarriedVectors' in deriv) {
                s.carriedVectors = carriedVectors.map((V, i) => add(V, scale((deriv as any).dCarriedVectors[i], factor)))
            }
            if (state.tau !== undefined && 'dtau' in deriv) {
                s.tau = state.tau + deriv.dtau * factor
            }
            return s
        }

        // k2
        const state2 = stepState(d1, dt / 2)
        const d2 = dynamics.derivative(state2)

        // k3
        const state3 = stepState(d2, dt / 2)
        const d3 = dynamics.derivative(state3)

        // k4
        const state4 = stepState(d3, dt)
        const d4 = dynamics.derivative(state4)

        // combine
        const combine = (v1: number[], v2: number[], v3: number[], v4: number[]) =>
            scale(add(add(add(v1, scale(v2, 2)), scale(v3, 2)), v4), 1 / 6)

        const dx = combine(d1.dx, d2.dx, d3.dx, d4.dx)
        const dv = combine(d1.dv, d2.dv, d3.dv, d4.dv)

        const nextState: State = {
            ...state,
            x: add(x, scale(dx, dt)),
            v: add(v, scale(dv, dt))
        }

        if (hasVecs && 'dCarriedVectors' in d1) {
            const c1 = (d1 as any).dCarriedVectors; const c2 = (d2 as any).dCarriedVectors; const c3 = (d3 as any).dCarriedVectors; const c4 = (d4 as any).dCarriedVectors;
            nextState.carriedVectors = carriedVectors.map((V, i) => add(V, scale(combine(c1[i], c2[i], c3[i], c4[i]), dt)))
        }

        if (state.tau !== undefined && 'dtau' in d1) {
            const dtau1 = d1.dtau as number; const dtau2 = d2.dtau as number; const dtau3 = d3.dtau as number; const dtau4 = d4.dtau as number;
            const dtau = (dtau1 + 2 * dtau2 + 2 * dtau3 + dtau4) / 6;
            nextState.tau = state.tau + dtau * dt;
        }

        return nextState
    }
}
