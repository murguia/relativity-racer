import type { State } from './State'
import type { Geometry } from './Geometry'
import { MetricConnectionBuilder } from './geometry/MetricConnectionBuilder'

export interface StateDerivative {
    dx: number[]
    dv: number[]
    dtau?: number
}

export interface Dynamics {
    derivative(state: State): StateDerivative
}

export class GeodesicDynamics implements Dynamics {
    geometry: Geometry

    constructor(geometry: Geometry) {
        this.geometry = geometry
    }

    derivative(state: State): StateDerivative {
        const { x, v } = state
        const christoffel = this.geometry.christoffel
            ? this.geometry.christoffel(x)
            : MetricConnectionBuilder.computeChristoffel(this.geometry, x)

        const dv = [0, 0, 0]

        for (let i = 0; i < 3; i++) {
            let sum = 0
            for (let j = 0; j < 3; j++) {
                for (let k = 0; k < 3; k++) {
                    sum += christoffel[i][j][k] * v[j] * v[k]
                }
            }
            dv[i] = -sum
        }

        return {
            dx: v,
            dv: dv
        }
    }
}
