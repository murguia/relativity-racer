export interface GhostFrame {
    // simulation coordinate time for accurate interpolation
    time: number;
    x: number[];
    v: number[];
    tau: number;
    orientation: number;
}

export class GhostRecorder {
    private frames: GhostFrame[] = [];

    recordFrame(time: number, x: number[], v: number[], tau: number, orientation: number) {
        this.frames.push({
            time,
            x: [...x],
            v: [...v],
            tau,
            orientation
        });
    }

    getFrames(): GhostFrame[] {
        return this.frames;
    }
}

export class GhostPlayer {
    private frames: GhostFrame[];
    private currentIndex: number = 0;

    constructor(frames: GhostFrame[]) {
        this.frames = frames;
    }

    // Interpolates between recorded frames based on the current simulation time
    getGhostState(time: number): GhostFrame | null {
        if (this.frames.length === 0) return null;
        if (time <= this.frames[0].time) return this.frames[0];
        if (time >= this.frames[this.frames.length - 1].time) return this.frames[this.frames.length - 1];

        // Find the right interval
        while (this.currentIndex < this.frames.length - 1 && this.frames[this.currentIndex + 1].time <= time) {
            this.currentIndex++;
        }
        while (this.currentIndex > 0 && this.frames[this.currentIndex].time > time) {
            this.currentIndex--;
        }

        const frame1 = this.frames[this.currentIndex];
        const frame2 = this.frames[this.currentIndex + 1];

        if (!frame2) return frame1; // Safeguard

        const tRange = frame2.time - frame1.time;
        if (tRange === 0) return frame1;

        const w2 = (time - frame1.time) / tRange;
        const w1 = 1.0 - w2;

        const x = frame1.x.map((x1, i) => x1 * w1 + frame2.x[i] * w2);
        const v = frame1.v.map((v1, i) => v1 * w1 + frame2.v[i] * w2);
        
        // Handle orientation wrapping properly for interpolation
        let oDiff = frame2.orientation - frame1.orientation;
        while (oDiff > Math.PI) oDiff -= 2 * Math.PI;
        while (oDiff < -Math.PI) oDiff += 2 * Math.PI;
        
        const orientation = frame1.orientation + oDiff * w2;

        return {
            time: time,
            x,
            v,
            tau: frame1.tau * w1 + frame2.tau * w2,
            orientation
        };
    }
}

export class GhostStorage {
    static saveRun(missionId: string, runId: string, frames: GhostFrame[]) {
        try {
            const key = `ghost_${missionId}_${runId}`;
            localStorage.setItem(key, JSON.stringify(frames));
        } catch (e) {
            console.error("Failed to save ghost run.", e);
        }
    }

    static loadRun(missionId: string, runId: string): GhostFrame[] | null {
        try {
            const key = `ghost_${missionId}_${runId}`;
            const data = localStorage.getItem(key);
            if (data) {
                return JSON.parse(data) as GhostFrame[];
            }
        } catch (e) {
            console.error("Failed to load ghost run.", e);
        }
        return null;
    }
}
