import type { SimulationModule } from './SimulationModule'
import { SchwarzschildGeometry } from '../geometry/SchwarzschildGeometry'
import { ShipDynamics } from '../ShipDynamics'
import { ShipRenderer } from '../ShipRenderer'
import { KeyboardController } from '../KeyboardController'
import type { Ship } from '../Ship'
import type { Integrator } from '../Integrator'
import { RK4 } from '../RK4'

import type { Mission, MissionContext } from '../gameplay/Mission'
import { GhostRecorder, GhostPlayer, GhostStorage } from '../gameplay/GhostSystem'

const blackHoleFlybyObj: Mission = {
    id: 'bh-flyby',
    title: 'Black Hole Flyby',
    description: 'Use the gravity well to reach the far checkpoint quickly.',
    checkpoints: [
        { id: 'cp-1', position: [25.0, Math.PI], radius: 2.0, reached: false }
    ],
    setup(ctx: MissionContext) {
        ctx.checkpoints.forEach(c => c.reached = false)
    },
    update(ctx: MissionContext, _dt: number) {
        const ship = ctx.ship
        const r = ship.x[1]
        let phi = ship.x[2] % (2 * Math.PI)
        if (phi < 0) phi += 2 * Math.PI

        const nextCheckpoint = ctx.checkpoints.find(c => !c.reached)
        if (nextCheckpoint) {
            // Pseudo-cartesian distance check utilizing intrinsic polar mappings
            const dx = r * Math.cos(phi) - nextCheckpoint.position[0] * Math.cos(nextCheckpoint.position[1])
            const dy = r * Math.sin(phi) - nextCheckpoint.position[0] * Math.sin(nextCheckpoint.position[1])
            const dist = Math.sqrt(dx*dx + dy*dy)

            if (dist < nextCheckpoint.radius) {
                nextCheckpoint.reached = true
            }
        }
    },
    isComplete(ctx: MissionContext) {
        return ctx.checkpoints.every(c => c.reached)
    }
}

export class BlackHoleMission implements SimulationModule {
    id = 'black-hole-flyby'
    title = 'Black Hole Flyby'
    category = 'INTERACTIVE MISSIONS'
    description = `
        **Mission:** Reach the green checkpoint on the far side of the black hole.
        <br/><br/>
        **Controls:**
        <ul>
            <li><strong>W</strong> : Forward Thrust</li>
            <li><strong>A / D</strong> : Rotate Ship</li>
        </ul>
        You cannot overcome the black hole's gravity with thrust alone. Use gravity assists and geodesic orbital bending to navigate efficiently!
    `

    mass = 1.0

    private renderer!: ShipRenderer
    private geometry!: SchwarzschildGeometry
    private state!: Ship
    private shipDynamics!: ShipDynamics
    private overrideIntegrator!: Integrator
    private keyboard!: KeyboardController
    
    private mission: Mission = blackHoleFlybyObj
    private missionContext!: MissionContext
    
    private ghostRecorder!: GhostRecorder
    private ghostPlayer: GhostPlayer | null = null
    private ghostVisible: boolean = true
    private runCompleted: boolean = false
    
    private statusEl: HTMLElement | null = null;
    private ghostBtn: HTMLElement | null = null;

    setup(canvas: HTMLCanvasElement): void {
        this.renderer = new ShipRenderer(canvas, this.mass)
        this.geometry = new SchwarzschildGeometry(this.mass)
        this.shipDynamics = new ShipDynamics(this.geometry)
        
        this.overrideIntegrator = new RK4()

        this.resetState()
    }

    private resetState() {
        const x = [0, 30, 0] 
        const v = [1.0, 0, 0]

        this.state = {
            id: 'player-ship',
            x,
            v,
            tau: 0,
            orientation: Math.PI / 2, 
            thrust: 0,
            trail: [[...x]]
        }

        if (this.keyboard) {
            this.keyboard.destroy()
        }
        this.keyboard = new KeyboardController(this.state)

        this.missionContext = {
            ship: this.state,
            coordinateTime: 0,
            properTime: 0,
            checkpoints: this.mission.checkpoints.map(c => ({...c}))
        }
        this.mission.setup(this.missionContext)
        
        this.ghostRecorder = new GhostRecorder()
        this.runCompleted = false
        
        // Load best tau run if exists
        const savedGhostFrames = GhostStorage.loadRun(this.mission.id, 'best-tau')
        if (savedGhostFrames && savedGhostFrames.length > 0) {
            this.ghostPlayer = new GhostPlayer(savedGhostFrames)
        } else {
            this.ghostPlayer = null
        }

        this.updateUIStatus('Mission Active', 'yellow')
        this.updateUIGhostToggle()
    }

    createControls(container: HTMLElement): void {
        const root = document.createElement('div')
        root.innerHTML = `
            <div style="color: #ccc; margin-top: 10px; padding: 10px; background: rgba(255,100,0,0.1); border: 1px solid rgba(255,100,0,0.5); border-radius: 4px;">
                <strong>WARNING:</strong> Navigation requires an understanding of orbital mechanics in curved spacetime. Thrust sparingly!
            </div>
            <div id="mission-status" style="margin-top: 15px; font-weight: bold; font-size: 1.2em; color: yellow;">Mission Active</div>
            <div id="ghost-controls" style="margin-top: 15px;">
                <button id="toggle-ghost-btn" style="padding: 5px 10px; background: #333; color: #fff; border: 1px solid #555; cursor: pointer; border-radius: 4px; display: none;">Toggle Ghost</button>
            </div>
        `
        container.appendChild(root)
        this.statusEl = root.querySelector('#mission-status')
        this.ghostBtn = root.querySelector('#toggle-ghost-btn')
        
        if (this.ghostBtn) {
            this.ghostBtn.addEventListener('click', () => {
                this.ghostVisible = !this.ghostVisible
                this.updateUIGhostToggle()
            })
        }
        this.updateUIStatus('Mission Active', 'yellow')
        this.updateUIGhostToggle()
    }

    private updateUIGhostToggle() {
        if (!this.ghostBtn) return
        if (this.ghostPlayer) {
            this.ghostBtn.style.display = 'block'
            this.ghostBtn.innerText = this.ghostVisible ? 'Hide Ghost' : 'Show Ghost'
        } else {
            this.ghostBtn.style.display = 'none'
        }
    }

    private updateUIStatus(text: string, color: string) {
        if (this.statusEl) {
            this.statusEl.innerText = text
            this.statusEl.style.color = color
        }
    }

    reset(): void {
        this.resetState()
    }

    updateState(dt: number, _integrator: Integrator): { isRunning: boolean } {
        if (this.runCompleted) return { isRunning: false };

        this.keyboard.update(dt)

        const nextState = this.overrideIntegrator.step(this.state, this.shipDynamics, dt)

        this.state.x = nextState.x
        this.state.v = nextState.v
        if (nextState.tau !== undefined) {
            this.state.tau = nextState.tau
        }
        
        this.missionContext.coordinateTime = this.state.x[0]
        this.missionContext.properTime = this.state.tau || 0

        // Trail Update
        if (this.state.trail.length === 0 || Math.abs(this.state.x[0] - this.state.trail[this.state.trail.length - 1][0]) > 2) {
            this.state.trail.push([...this.state.x])
        }
        if (this.state.trail.length > 500) {
            this.state.trail.shift()
        }
        
        // Record ghost
        this.ghostRecorder.recordFrame(this.state.x[0], this.state.x, this.state.v, this.state.tau || 0, this.state.orientation)

        // Mission update
        this.mission.update(this.missionContext, dt)
        
        const r = this.state.x[1]
        let isRunning = true
        
        if (this.mission.isComplete(this.missionContext)) {
            this.updateUIStatus(`MISSION CLEAR! Proper Time: ${(this.state.tau || 0).toFixed(2)}`, '#00ff00')
            isRunning = false
            this.runCompleted = true
            
            // Save logic
            const prevBest = GhostStorage.loadRun(this.mission.id, 'best-tau')
            if (!prevBest || (this.state.tau || 0) < prevBest[prevBest.length-1].tau) {
                 GhostStorage.saveRun(this.mission.id, 'best-tau', this.ghostRecorder.getFrames())
            }
        } else if (r <= 2 * this.mass + 0.1) {
            this.updateUIStatus('CRITICAL FAILURE: Event Horizon Crossed.', '#ff0000')
            isRunning = false
            this.runCompleted = true
        } else {
            const nextIdx = this.missionContext.checkpoints.findIndex(c => !c.reached)
            if (nextIdx !== -1) {
                const nextCheckpoint = this.missionContext.checkpoints[nextIdx]
                const totalCount = this.missionContext.checkpoints.length
                
                let phi = this.state.x[2] % (2 * Math.PI)
                if (phi < 0) phi += 2 * Math.PI
                const dx = r * Math.cos(phi) - nextCheckpoint.position[0] * Math.cos(nextCheckpoint.position[1])
                const dy = r * Math.sin(phi) - nextCheckpoint.position[0] * Math.sin(nextCheckpoint.position[1])
                const dist = Math.sqrt(dx*dx + dy*dy)
                
                this.updateUIStatus(`Checkpoint ${nextIdx + 1}/${totalCount} - Distance: ${dist.toFixed(1)}`, 'yellow')
            }
        }

        return { isRunning }
    }

    renderState(): void {
        this.renderer.clear()
        this.renderer.drawEnvironment() // no more waypoint arguments
        
        // Draw Checkpoints
        const nextIdx = this.missionContext.checkpoints.findIndex(c => !c.reached)
        this.missionContext.checkpoints.forEach((c, idx) => {
            if (!c.reached) {
                this.renderer.drawCheckpoint(c, idx === nextIdx)
            }
        })
        
        // Draw Ghost
        if (this.ghostPlayer && this.ghostVisible) {
            const frame = this.ghostPlayer.getGhostState(this.missionContext.coordinateTime)
            if (frame) {
                this.renderer.drawGhost(frame)
            }
        }

        this.renderer.drawShip(this.state)
    }

    getStatus(_time: number): string {
        const ship = this.state
        const metricSpeedSq = -ship.v[0]*ship.v[0]*(1 - 2*this.mass/ship.x[1]) 
            + ship.v[1]*ship.v[1] / (1 - 2*this.mass/ship.x[1]) 
            + ship.v[2]*ship.v[2] * (ship.x[1]*ship.x[1])

        return `Coordinate Time (t): ${this.missionContext.coordinateTime.toFixed(3)}
Proper Time (τ): ${this.missionContext.properTime.toFixed(3)}
Speed Sq (invariant): ${metricSpeedSq.toFixed(5)}
Heading (deg): ${((ship.orientation * 180) / Math.PI % 360).toFixed(1)}
Thrust: ${(ship.thrust > 0 ? 'ON' : 'OFF')}
        `
    }
}
