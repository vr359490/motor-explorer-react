/**
 * Local type declarations for p5.
 *
 * p5 2.3.3 points at `./types/p5.d.ts` in its package exports, but that
 * directory is not in the published tarball, so TypeScript finds nothing. This
 * fills the gap.
 *
 * It deliberately covers only the instance-mode drawing API this project
 * actually calls, rather than declaring the module as `any`. That keeps the
 * sketch code type-checked and makes adding a new p5 call a conscious act: if
 * something is missing here, add it here.
 *
 * Remove this file if p5 ever ships its declarations.
 */
declare module 'p5' {
  export default class p5 {
    constructor(sketch: (p: p5) => void, node?: HTMLElement)

    /** Assigned by the sketch; p5 calls these. */
    setup: () => void
    draw: () => void
    windowResized: () => void

    remove(): void

    readonly width: number
    readonly height: number
    readonly drawingContext: CanvasRenderingContext2D
    readonly frameCount: number

    createCanvas(width: number, height: number): unknown
    resizeCanvas(width: number, height: number): void
    pixelDensity(density: number): void
    frameRate(fps: number): void
    noLoop(): void
    loop(): void

    clear(): void
    background(...args: (string | number)[]): void

    push(): void
    pop(): void
    translate(x: number, y: number): void
    rotate(angle: number): void
    scale(x: number, y?: number): void

    fill(...args: (string | number)[]): void
    noFill(): void
    stroke(...args: (string | number)[]): void
    noStroke(): void
    strokeWeight(weight: number): void
    strokeCap(cap: string): void
    strokeJoin(join: string): void

    circle(x: number, y: number, diameter: number): void
    ellipse(x: number, y: number, width: number, height?: number): void
    rect(x: number, y: number, width: number, height: number, radius?: number): void
    line(x1: number, y1: number, x2: number, y2: number): void
    arc(x: number, y: number, width: number, height: number, start: number, stop: number, mode?: string): void
    triangle(x1: number, y1: number, x2: number, y2: number, x3: number, y3: number): void
    point(x: number, y: number): void

    beginShape(kind?: string): void
    vertex(x: number, y: number): void
    endShape(mode?: string): void

    text(text: string, x: number, y: number): void
    textAlign(horizontal: string, vertical?: string): void
    textSize(size: number): void
    textFont(font: string): void
    textWidth(text: string): number

    angleMode(mode: string): void

    readonly CENTER: string
    readonly LEFT: string
    readonly RIGHT: string
    readonly TOP: string
    readonly BOTTOM: string
    readonly BASELINE: string
    readonly CLOSE: string
    readonly ROUND: string
    readonly SQUARE: string
    readonly PROJECT: string
    readonly RADIANS: string
    readonly DEGREES: string
    readonly PIE: string
    readonly OPEN: string
    readonly CHORD: string
  }
}
