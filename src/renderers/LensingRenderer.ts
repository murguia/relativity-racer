import { RayTracer } from './RayTracer'
import { SchwarzschildGeometry } from '../geometry/SchwarzschildGeometry'

export class LensingRenderer {
    private canvas: HTMLCanvasElement
    private ctx: CanvasRenderingContext2D
    
    // Internal coarse resolution buffer
    private resWidth: number
    private resHeight: number
    private imageData: ImageData

    private rayTracer: RayTracer
    
    // Observer Settings
    private observerR: number = 15
    private observerPhi: number = Math.PI / 2 // "Top" looking down
    private fov: number = Math.PI / 2 // 90 degree field of view
    
    // Simulation constraints
    private mass: number = 1.0
    private horizonRadius: number = 2.0 * this.mass + 0.05 // epsilon safety
    private maxRadius: number = 50.0 // escapes to infinity
    
    constructor(canvas: HTMLCanvasElement, resWidth: number = 80, resHeight: number = 60) {
        this.canvas = canvas
        this.ctx = canvas.getContext('2d')!
        
        this.resWidth = resWidth
        this.resHeight = resHeight
        this.imageData = this.ctx.createImageData(resWidth, resHeight)
        
        const geometry = new SchwarzschildGeometry(this.mass)
        this.rayTracer = new RayTracer(geometry, 1500)
    }

    private needsRender: boolean = true
    private isRendering: boolean = false
    private renderX: number = 0
    private renderY: number = 0

    public setResolution(w: number, h: number) {
        if (this.resWidth === w && this.resHeight === h) return
        this.resWidth = w
        this.resHeight = h
        this.imageData = this.ctx.createImageData(w, h)
        this.needsRender = true
    }

    public setObserverDistance(r: number) {
        if (this.observerR === r) return
        this.observerR = r
        this.needsRender = true
    }

    /**
     * Deterministic Sky Pattern based on accumulated deflection and screen angle.
     * This creates a checkerboard grid out at infinity to clearly show Einstein Rings!
     */
    private sampleSky2D(deltaPhi: number, screenAngle: number): [number, number, number, number] {
        // We can make rings based on deltaPhi
        const rBands = Math.floor(Math.abs(deltaPhi) / (Math.PI / 8))
        
        // And slices based on screenAngle (-PI to PI)
        const slices = Math.floor((screenAngle + Math.PI) / (Math.PI / 6))
        
        if ((rBands + slices) % 2 === 0) {
            return [20, 20, 50, 255] // Deep space blue
        } else {
            return [200, 200, 220, 255] // Bright starlight band
        }
    }

    /**
     * Renders progressively per frame
     */
    public render() {
        if (this.needsRender) {
            this.needsRender = false
            this.isRendering = true
            this.renderX = 0
            this.renderY = 0
            // Paint screen gray to indicate generating
            for(let i = 0; i < this.imageData.data.length; i+=4) {
                this.imageData.data[i] = 30
                this.imageData.data[i+1] = 30
                this.imageData.data[i+2] = 30
                this.imageData.data[i+3] = 255
            }
        }

        if (this.isRendering) {
            const obsPos = [0, this.observerR, this.observerPhi]
            const dt = 0.05 
            
            const PIXELS_PER_FRAME = 2000
            let pixelsRendered = 0

            const aspect = this.resWidth / this.resHeight

            while (pixelsRendered < PIXELS_PER_FRAME && this.isRendering) {
                const x = this.renderX
                const y = this.renderY
                
                const ndcX = (x / this.resWidth) * 2 - 1 
                const ndcY = -((y / this.resHeight) * 2 - 1) / aspect
                
                const rScreen = Math.sqrt(ndcX * ndcX + ndcY * ndcY)
                const screenAngle = Math.atan2(ndcY, ndcX)
                
                const vr = -1.0
                const vphi = (rScreen * Math.tan(this.fov / 2)) / this.observerR

                const photonState = this.rayTracer.initializeNullRay(obsPos, [vr, vphi])

                const result = this.rayTracer.traceBackward(
                    photonState, 
                    dt, 
                    this.horizonRadius, 
                    this.maxRadius
                )

                let color: [number, number, number, number] = [0, 0, 0, 255] 

                if (result.escaped && result.terminalPos) {
                    const deltaPhi = result.terminalPos[2] - obsPos[2]
                    color = this.sampleSky2D(deltaPhi, screenAngle)
                }

                const pxIdx = (y * this.resWidth + x) * 4
                this.imageData.data[pxIdx] = color[0]
                this.imageData.data[pxIdx+1] = color[1]
                this.imageData.data[pxIdx+2] = color[2]
                this.imageData.data[pxIdx+3] = color[3]

                pixelsRendered++
                this.renderX++
                
                if (this.renderX >= this.resWidth) {
                    this.renderX = 0
                    this.renderY++
                    if (this.renderY >= this.resHeight) {
                        this.isRendering = false // Frame complete!
                    }
                }
            }
        }

        this.ctx.imageSmoothingEnabled = false
        const tempCanvas = document.createElement('canvas')
        tempCanvas.width = this.resWidth
        tempCanvas.height = this.resHeight
        const tempCtx = tempCanvas.getContext('2d')!
        tempCtx.putImageData(this.imageData, 0, 0)
        
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
        this.ctx.drawImage(tempCanvas, 0, 0, this.resWidth, this.resHeight, 0, 0, this.canvas.width, this.canvas.height)
    }
}
