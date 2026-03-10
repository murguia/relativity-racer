import type { State } from './State'
import type { Geometry } from './Geometry'
import type { Dynamics, StateDerivative } from './GeodesicDynamics'

export interface TransportStateDerivative extends StateDerivative {
    dCarriedVectors: number[][]
}

export class TransportDynamics implements Dynamics {
    geometry: Geometry

    constructor(geometry: Geometry) {
        this.geometry = geometry
    }

    derivative(state: State): TransportStateDerivative {
        const { x, v, carriedVectors } = state
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

        const dCarriedVectors: number[][] = []
        if (carriedVectors) {
            for (const V of carriedVectors) {
                const dV = new Array(dim).fill(0)
                for (let i = 0; i < dim; i++) {
                    let sum = 0
                    for (let j = 0; j < dim; j++) {
                        for (let k = 0; k < dim; k++) {
                            // Parallel transport equation: dV^i/dt = -Γ^i_{jk} v^j V^k
                            sum += christoffel[i][j][k] * v[j] * V[k]
                        }
                    }
                    dV[i] = -sum
                }
                dCarriedVectors.push(dV)
            }
        }

        return {
            dx: [...v],
            dv: dv,
            dCarriedVectors
        }
    }
}
