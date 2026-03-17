import type { State } from './State'
import type { Geometry } from './Geometry'
import type { Dynamics } from './GeodesicDynamics'
import type { Ship } from './Ship'
import { MetricConnectionBuilder } from './geometry/MetricConnectionBuilder'

export interface ShipDerivative {
    dx: number[]
    dv: number[]
    dtau: number
}

export class ShipDynamics implements Dynamics {
    geometry: Geometry

    constructor(geometry: Geometry) {
        this.geometry = geometry
    }

    derivative(state: State): ShipDerivative {
        const ship = state as Ship
        const { x, v, thrust, orientation } = ship
        const dim = this.geometry.dimension
        const christoffel = this.geometry.christoffel
            ? this.geometry.christoffel(x)
            : MetricConnectionBuilder.computeChristoffel(this.geometry, x)

        const dv = new Array(dim).fill(0)

        // 1. Compute standard geodesic acceleration: -Gamma * v * v
        for (let i = 0; i < dim; i++) {
            let sum = 0
            for (let j = 0; j < dim; j++) {
                for (let k = 0; k < dim; k++) {
                    sum += christoffel[i][j][k] * v[j] * v[k]
                }
            }
            dv[i] = -sum
        }

        // 2. Add external thrust acceleration
        if (thrust !== 0 && this.geometry.getThrustVector) {
            const externalAccel = this.geometry.getThrustVector(x, thrust, orientation)
            for (let i = 0; i < dim; i++) {
                dv[i] += externalAccel[i]
            }
        }

        // 3. Accumulate proper time
        // dtau/dlambda = sqrt(-g_munu v^mu v^nu)
        const metric = this.geometry.metric(x)
        let ds2 = 0
        for (let mu = 0; mu < dim; mu++) {
            for (let nu = 0; nu < dim; nu++) {
                ds2 += metric[mu][nu] * v[mu] * v[nu]
            }
        }

        const invariantSpeedSq = ds2
        let dtau = 0
        if (invariantSpeedSq < 0) {
            dtau = Math.sqrt(-invariantSpeedSq)
        } else if (invariantSpeedSq >= 0) {
            dtau = 0
        }

        return {
            dx: v,
            dv: dv,
            dtau: dtau
        }
    }
}
