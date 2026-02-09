/**
 * Represents a point in 2D or 3D space
 */
export class Point {
  public x: number;
  public y: number;
  public z: number;

  constructor(x: number = 0, y: number = 0, z: number = 0) {
    this.x = x;
    this.y = y;
    this.z = z;
  }

  /**
   * Create a copy of this point
   */
  clone(): Point {
    return new Point(this.x, this.y, this.z);
  }

  /**
   * Calculate distance to another point
   */
  distanceTo(other: Point): number {
    const dx = this.x - other.x;
    const dy = this.y - other.y;
    const dz = this.z - other.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  /**
   * Calculate squared distance to another point (faster than distanceTo)
   */
  distanceToSquared(other: Point): number {
    const dx = this.x - other.x;
    const dy = this.y - other.y;
    const dz = this.z - other.z;
    return dx * dx + dy * dy + dz * dz;
  }

  /**
   * Add another point to this point
   */
  add(other: Point): Point {
    return new Point(this.x + other.x, this.y + other.y, this.z + other.z);
  }

  /**
   * Subtract another point from this point
   */
  subtract(other: Point): Point {
    return new Point(this.x - other.x, this.y - other.y, this.z - other.z);
  }

  /**
   * Scale this point by a scalar
   */
  scale(scalar: number): Point {
    return new Point(this.x * scalar, this.y * scalar, this.z * scalar);
  }

  /**
   * Calculate dot product with another point (treating as vector)
   */
  dot(other: Point): number {
    return this.x * other.x + this.y * other.y + this.z * other.z;
  }

  /**
   * Check if this point equals another point within tolerance
   */
  equals(other: Point, tolerance: number = 1e-6): boolean {
    return (
      Math.abs(this.x - other.x) < tolerance &&
      Math.abs(this.y - other.y) < tolerance &&
      Math.abs(this.z - other.z) < tolerance
    );
  }

  /**
   * Convert to array format [x, y, z]
   */
  toArray(): [number, number, number] {
    return [this.x, this.y, this.z];
  }

  /**
   * Convert to string representation
   */
  toString(): string {
    return `Point(${this.x.toFixed(6)}, ${this.y.toFixed(6)}, ${this.z.toFixed(6)})`;
  }

  /**
   * Create a 2D point (z = 0)
   */
  static create2D(x: number, y: number): Point {
    return new Point(x, y, 0);
  }

  /**
   * Create a 3D point
   */
  static create3D(x: number, y: number, z: number): Point {
    return new Point(x, y, z);
  }

  /**
   * Create point from array
   */
  static fromArray(coords: number[]): Point {
    return new Point(coords[0] || 0, coords[1] || 0, coords[2] || 0);
  }
}