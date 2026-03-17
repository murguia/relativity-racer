import { SphereSimulation } from './SphereSimulation'
import { MinkowskiSimulation } from './MinkowskiSimulation'
import { SchwarzschildSimulation } from './SchwarzschildSimulation'
import type { SimulationModule } from './SimulationModule'
import { BlackHoleMission } from './BlackHoleMission'

export const simulations: SimulationModule[] = [
    new SphereSimulation(),
    new MinkowskiSimulation(),
    new SchwarzschildSimulation(),
    new BlackHoleMission()
]
