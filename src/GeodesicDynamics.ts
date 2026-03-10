import type { State } from './State'
import type { Geometry } from './Geometry'

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
        const dim = this.geometry.dimension
        const christoffel = this.geometry.christoffel(x)

        const dv = new Array(dim).fill(0)

        for (let i = 0; i < dim; i++) {
            let sum = 0
            for (let j = 0; j < dim; j++) {
                for (let k = 0; k < dim; k++) {
                    sum += christoffel[i][j][k] * v[j] * v[k]
                }
            }
            dv[i] = -sum
        }

        return {
            dx: [...v],
            dv: dv
        }
    }
}
