import { SphereSimulation } from './SphereSimulation'
import { MinkowskiSimulation } from './MinkowskiSimulation'
import { SchwarzschildSimulation } from './SchwarzschildSimulation'
import type { SimulationModule } from './SimulationModule'
import { BlackHoleMission } from './BlackHoleMission'
import { GravitationalLensingDemo } from './GravitationalLensingDemo'
import { CockpitFlightDemo } from './CockpitFlightDemo'

export class SimulationRegistry {
    public static getModules(): SimulationModule[] {
        return [
            new SphereSimulation(),
            new MinkowskiSimulation(),
            new SchwarzschildSimulation(),
            new BlackHoleMission(),
            new GravitationalLensingDemo(),
            new CockpitFlightDemo()
        ]
    }
}
