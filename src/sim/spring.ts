/** Damped spring integrated with semi-implicit Euler and fixed sub-steps for stability. */
export class Spring {
  value = 0
  velocity = 0
  target = 0

  stiffness: number
  damping: number

  constructor(stiffness = 160, damping = 15) {
    this.stiffness = stiffness
    this.damping = damping
  }

  step(dt: number): number {
    const steps = Math.max(1, Math.ceil(dt / (1 / 240)))
    const h = dt / steps
    for (let i = 0; i < steps; i++) {
      const force = (this.target - this.value) * this.stiffness - this.velocity * this.damping
      this.velocity += force * h
      this.value += this.velocity * h
    }
    return this.value
  }
}
