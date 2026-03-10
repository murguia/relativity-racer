export function add(a: number[], b: number[]): number[] {
  if (a.length !== b.length) throw new Error("Vector dimensions must match");
  return a.map((val, i) => val + b[i]);
}

export function subtract(a: number[], b: number[]): number[] {
  if (a.length !== b.length) throw new Error("Vector dimensions must match");
  return a.map((val, i) => val - b[i]);
}

export function scale(a: number[], s: number): number[] {
  return a.map(val => val * s);
}

export function dot(a: number[], b: number[]): number {
  if (a.length !== b.length) throw new Error("Vector dimensions must match");
  return a.reduce((sum, val, i) => sum + val * b[i], 0);
}

export function norm(a: number[]): number {
  return Math.sqrt(dot(a, a));
}
