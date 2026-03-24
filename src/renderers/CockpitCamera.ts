import type { ObserverFrame } from '../physics/ObserverFrame'

export class CockpitCamera {
    fov: number

    constructor(fov: number = Math.PI / 2) {
        this.fov = fov
    }

    /**
     * Maps normalized device coordinates [-1, 1] into a coordinate spatial ray vector
     * by projecting the focal plane into the Local Observer Frame's tetrad.
     * 
     * @param frame The ObserverFrame containing the e0, e1, e2 orthonormal basis
     * @param ndcX Normalized X coordinate on screen [-1, 1]
     * @param ndcY Normalized Y coordinate on screen [-1, 1]
     * @returns A 3D spatial velocity vector [v^r, v^phi, v^theta] to be sent to RayTracer
     */
    public getLocalRayDirection(frame: ObserverFrame, ndcX: number, ndcY: number): [number, number, number] {
        const { e0, e1, e2 } = frame
        
        // Focal distance required to map screen extents to the FOV angle
        const f = 1.0 / Math.tan(this.fov / 2)

        // In the observer's local rest frame, a photon's 4-velocity is:
        // v_local = e0 + dir  (where dir is a spatial unit vector)
        // We construct the unnormalized spatial direction:
        const unnorm_dir_r = f * e1[1] + ndcX * e2[1]
        const unnorm_dir_phi = f * e1[2] + ndcX * e2[2]
        
        // Normalize the 2D local spatial direction to ensure the combined vector is Null
        const local_mag = Math.sqrt(unnorm_dir_r * unnorm_dir_r + unnorm_dir_phi * unnorm_dir_phi)
        
        // To maintain our pseudo-3D spherical sky rendering, ndcY maps strictly to v^theta.
        // It's orthogonal to the orbital plane.
        const v_theta = ndcY
        
        // The true spacetime vector is roughly v = e0 + dir.
        // We extract strictly the spatial coordinate components!
        // The RayTracer is exclusively responsible for solving v^t and enforcing g(v,v)=0.
        const vr = e0[1] + (unnorm_dir_r / local_mag)
        const vphi = e0[2] + (unnorm_dir_phi / local_mag)

        return [vr, vphi, v_theta]
    }
}
