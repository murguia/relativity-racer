import type { Ship } from '../Ship'
import type { GeodesicDynamics } from '../GeodesicDynamics'
import { CockpitCamera } from './CockpitCamera'
import { RayTracer } from './RayTracer'
import { buildObserverFrame } from '../physics/ObserverFrame'

export class CockpitRenderer {
    private canvas: HTMLCanvasElement
    private ctx: CanvasRenderingContext2D
    
    private offscreenCanvas: HTMLCanvasElement
    private offscreenCtx: CanvasRenderingContext2D
    private imageData!: ImageData

    private resWidth!: number
    private resHeight!: number

    private camera: CockpitCamera
    private rayTracer: RayTracer

    // Physics
    private horizonRadius: number
    private maxRadius: number

    constructor(
        canvas: HTMLCanvasElement, 
        dynamics: GeodesicDynamics,
        horizonRadius: number = 2.0,
        maxRadius: number = 40.0,
        resWidth: number = 60,
        resHeight: number = 45
    ) {
        this.canvas = canvas
        this.ctx = canvas.getContext('2d')!
        
        this.offscreenCanvas = document.createElement('canvas')
        this.offscreenCtx = this.offscreenCanvas.getContext('2d')!
        
        this.horizonRadius = horizonRadius
        this.maxRadius = maxRadius

        this.camera = new CockpitCamera(Math.PI / 2) // 90 deg FOV
        this.rayTracer = new RayTracer(dynamics.geometry, 1500)
        
        this.setResolution(resWidth, resHeight)
    }

    public setResolution(w: number, h: number) {
        this.resWidth = w
        this.resHeight = h
        
        this.offscreenCanvas.width = this.resWidth
        this.offscreenCanvas.height = this.resHeight
        this.imageData = this.offscreenCtx.createImageData(this.resWidth, this.resHeight)
    }

    private sampleSky3D(Vx: number, Vy: number, Vz: number): [number, number, number, number] {
        const longitude = Math.atan2(Vy, Vx)
        const latitude = Math.asin(Vz)
        
        const lonBands = Math.floor(Math.abs(longitude) / (Math.PI / 8))
        const latBands = Math.floor(Math.abs(latitude) / (Math.PI / 8))
        
        if ((lonBands + latBands) % 2 === 0) {
            return [15, 15, 30, 255] // Deep continuous space
        } else {
            return [200, 200, 230, 255] // Starlight band
        }
    }

    private applyDoppler(baseColor: [number, number, number, number], D: number): [number, number, number, number] {
        let [r, g, b, a] = baseColor;

        // Apply Doppler intensity scaling
        r *= D;
        g *= D;
        b *= D;

        // Apply slight hue bias instead of aggressive channel overriding
        if (D > 1.05) {
            // Slight blue bias for blueshift
            b *= 1.15;
            r *= 0.85;
        } else if (D < 0.95) {
            // Slight red bias for redshift
            r *= 1.15;
            b *= 0.85;
        }

        r = Math.max(0, Math.min(255, r));
        g = Math.max(0, Math.min(255, g));
        b = Math.max(0, Math.min(255, b));

        return [r, g, b, a];
    }

    /**
     * Synchronous rendering of the Cockpit View explicitly for interactive flight.
     * Traces backwards null geodesics per-frame, mapping final deflections to sky texture.
     */
    public render(ship: Ship, geometry: any, enableEffects: boolean = true) {
        // Construct the rigid orthonormal tetrad exactly once per frame
        const frame = buildObserverFrame(ship, geometry)
        
        // Doppler is observer-local; metric evaluated at ship position only
        const gMetric = geometry.metric(ship.x)
        
        // Large timestep for speed. We only care about visual trajectories,
        // and RK4 is highly stable even at dt=0.5 away from the horizon.
        const dt = 0.5 
        const aspect = this.resWidth / this.resHeight
        const phi_ship = ship.x[2]
        
        // Setup ship local basis relative to global Cartesian Universe
        // e_r points radially outward
        const e_r = [Math.cos(phi_ship), Math.sin(phi_ship), 0]
        const e_phi = [-Math.sin(phi_ship), Math.cos(phi_ship), 0]
        const e_theta = [0, 0, 1]

        let pxIdx = 0
        for (let y = 0; y < this.resHeight; y++) {
            for (let x = 0; x < this.resWidth; x++) {
                
                const ndcX = (x / this.resWidth) * 2 - 1 
                const ndcY = -((y / this.resHeight) * 2 - 1) / aspect
                
                // 1. Get 3D normalized ray direction in local frame
                const dir3D = this.camera.getLocalRayDirection(frame, ndcX, ndcY)
                const D_r = dir3D[0]
                const D_phi = dir3D[1]
                const D_theta = dir3D[2]
                
                // 2. Reduce the 3D photon trajectory into its intrinsic 2D orbital plane
                // The radial coordinate velocity is just D_r. 
                // The tangental coordinate velocity magnitude in the plane is sqrt(D_phi^2 + D_theta^2)
                // (Note: D_phi and D_theta from CockpitCamera are already properly scaled spatial coordinate velocities)
                const tangentialMag = Math.sqrt(D_phi*D_phi + D_theta*D_theta)
                const spatialDir2D = [D_r, tangentialMag]
                
                // Initialize strict Null State
                const photonState = this.rayTracer.initializeNullRay(ship.x, spatialDir2D)

                let D = 1.0;
                if (enableEffects) {
                    const u = frame.e0;
                    // photonState.v represents null 4-momentum up to scale
                    const p = photonState.v;
                    
                    // Doppler factor derived from invariant inner product: ω_obs = -g_uv u^u p^v
                    const w_obs = -(gMetric[0][0]*u[0]*p[0] + gMetric[1][1]*u[1]*p[1] + gMetric[2][2]*u[2]*p[2]);
                    const D_raw = w_obs;
                    D = Math.max(0.2, Math.min(D_raw, 5.0)); // Clamp visual bounds
                    
                    // Stationary Sanity Check (Debug log for center pixel)
                    if (x === Math.floor(this.resWidth / 2) && y === Math.floor(this.resHeight / 2)) {
                        const vSq = ship.v[1]*ship.v[1] + ship.v[2]*ship.v[2];
                        if (vSq < 0.0001 && Math.abs(D_raw - 1.0) > 0.1) {
                            console.warn(`[Doppler Debug] Stationary observer D_raw anomaly: ${D_raw.toFixed(4)}`);
                        }
                    }
                }

                // Backward trace within the 2D plane
                const result = this.rayTracer.traceBackward(
                    photonState, 
                    dt, 
                    this.horizonRadius, 
                    this.maxRadius
                )

                let color: [number, number, number, number] = [0, 0, 0, 255] // Black Hole

                if (result.escaped && result.terminalPos) {
                    // Escape angle inside the photon's 2D orbital plane
                    const phi_final = result.terminalPos[2] - ship.x[2]
                    
                    // 3. Re-inflate the 2D deflection vector back into the complete 3D Universe Cartesian frame
                    // Vector = cos(phi_final) * e_r + sin(phi_final) * e_tangent
                    const e_tan_x = (D_phi * e_phi[0] + D_theta * e_theta[0]) / (tangentialMag || 1)
                    const e_tan_y = (D_phi * e_phi[1] + D_theta * e_theta[1]) / (tangentialMag || 1)
                    const e_tan_z = (D_phi * e_phi[2] + D_theta * e_theta[2]) / (tangentialMag || 1)
                    
                    const Vx = Math.cos(phi_final) * e_r[0] + Math.sin(phi_final) * e_tan_x
                    const Vy = Math.cos(phi_final) * e_r[1] + Math.sin(phi_final) * e_tan_y
                    const Vz = Math.cos(phi_final) * e_r[2] + Math.sin(phi_final) * e_tan_z
                    
                    const baseColor = this.sampleSky3D(Vx, Vy, Vz)
                    color = this.applyDoppler(baseColor, D)
                }

                this.imageData.data[pxIdx++] = color[0]
                this.imageData.data[pxIdx++] = color[1]
                this.imageData.data[pxIdx++] = color[2]
                this.imageData.data[pxIdx++] = color[3]
            }
        }

        // Draw HUD overlay (minimal crosshair) over offscreen cache
        for(let x=-1; x<=1; x++) {
            for(let y=-1; y<=1; y++) {
                if(Math.abs(x)==Math.abs(y) && x !== 0) continue // minimal cross
                const cx = Math.floor(this.resWidth/2) + x
                const cy = Math.floor(this.resHeight/2) + y
                const idx = (cy * this.resWidth + cx) * 4
                if (idx >= 0 && idx < this.imageData.data.length - 3) {
                    this.imageData.data[idx] = 0
                    this.imageData.data[idx+1] = 255
                    this.imageData.data[idx+2] = 0
                }
            }
        }

        this.offscreenCtx.putImageData(this.imageData, 0, 0)

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
        
        // Use crisp nearest-neighbor scaling for low-res retro look
        this.ctx.imageSmoothingEnabled = false
        
        this.ctx.drawImage(
            this.offscreenCanvas, 
            0, 0, this.resWidth, this.resHeight,
            0, 0, this.canvas.width, this.canvas.height
        )
    }
}
