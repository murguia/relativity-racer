import type { Ship } from './Ship'

export class KeyboardController {
    ship: Ship
    activeKeys: Set<string> = new Set()

    constructor(ship: Ship) {
        this.ship = ship
        
        window.addEventListener('keydown', this.handleKeyDown)
        window.addEventListener('keyup', this.handleKeyUp)
    }

    handleKeyDown = (e: KeyboardEvent) => {
        this.activeKeys.add(e.key.toLowerCase())
    }

    handleKeyUp = (e: KeyboardEvent) => {
        this.activeKeys.delete(e.key.toLowerCase())
    }

    update(dt: number) {
        // Turning speed (radians per coordinate time second)
        const turnSpeed = Math.PI

        if (this.activeKeys.has('a')) {
            this.ship.orientation -= turnSpeed * dt
        }
        if (this.activeKeys.has('d')) {
            this.ship.orientation += turnSpeed * dt
        }

        // Thrust magnitude (acceleration per coordinate time second)
        const maxThrust = 0.5
        if (this.activeKeys.has('w')) {
            this.ship.thrust = maxThrust
        } else {
            this.ship.thrust = 0
        }
    }

    destroy() {
        window.removeEventListener('keydown', this.handleKeyDown)
        window.removeEventListener('keyup', this.handleKeyUp)
    }
}
