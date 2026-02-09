import { Point } from './Point';

/**
 * Represents a vector in 2D or 3D space
 */
export class Vector {
  public x: number;
  public y: number;
  public z: number;

  constructor(x: number = 0, y: number = 0, z: number = 0) {
    this.x = x;
    this.y = y;
    this.z = z;
  }

  /**
   * Create a copy of this vector
   */
  clone(): Vector {
    return new Vector(this.x, this.y, this.z);
  }

  /**
   * Calculate the length (magnitude) of this vector
   */
  length(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
  }

  /**
   * Calculate the squared length of this vector (faster than length)
   */
  lengthSquared(): number {
    return this.x * this.x + this.y * this.y + this.z * this.z;
  }

  /**
   * Normalize this vector to unit length
   */
  normalize(): Vector {
    const len = this.length();
    if (len === 0) {
      return new Vector(0, 0, 0);
    }
    return new Vector(this.x / len, this.y / len, this.z / len);
  }

  /**
   * Add another vector to this vector
   */
  add(other: Vector): Vector {
    return new Vector(this.x + other.x, this.y + other.y, this.z + other.z);
  }

  /**
   * Subtract another vector from this vector
   */
  subtract(other: Vector): Vector {
    return new Vector(this.x - other.x, this.y - other.y, this.z - other.z);
  }

  /**
   * Multiply this vector by a scalar
   */
  multiply(scalar: number): Vector {
    return new Vector(this.x * scalar, this.y * scalar, this.z * scalar);
  }

  /**
   * Scale this vector by a scalar (alias for multiply)
   */
  scale(scalar: number): Vector {
    return this.multiply(scalar);
  }

  /**
   * Divide this vector by a scalar
   */
  divide(scalar: number): Vector {
    if (scalar === 0) {
      throw new Error('Cannot divide vector by zero');
    }
    return new Vector(this.x / scalar, this.y / scalar, this.z / scalar);
  }

  /**
   * Calculate dot product with another vector
   */
  dot(other: Vector): number {
    return this.x * other.x + this.y * other.y + this.z * other.z;
  }

  /**
   * Calculate cross product with another vector
   */
  cross(other: Vector): Vector {
    return new Vector(
      this.y * other.z - this.z * other.y,
      this.z * other.x - this.x * other.z,
      this.x * other.y - this.y * other.x
    );
  }

  /**
   * Calculate angle between this vector and another vector (in radians)
   */
  angleTo(other: Vector): number {
    const dot = this.dot(other);
    const lengths = this.length() * other.length();
    if (lengths === 0) {
      return 0;
    }
    return Math.acos(Math.max(-1, Math.min(1, dot / lengths)));
  }

  /**
   * Check if this vector is parallel to another vector
   */
  isParallel(other: Vector, tolerance: number = 1e-6): boolean {
    const cross = this.cross(other);
    return cross.length() < tolerance;
  }

  /**
   * Check if this vector is perpendicular to another vector
   */
  isPerpendicular(other: Vector, tolerance: number = 1e-6): boolean {
    return Math.abs(this.dot(other)) < tolerance;
  }

  /**
   * Check if this vector equals another vector within tolerance
   */
  equals(other: Vector, tolerance: number = 1e-6): boolean {
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
    return `Vector(${this.x.toFixed(6)}, ${this.y.toFixed(6)}, ${this.z.toFixed(6)})`;
  }

  /**
   * Create a 2D vector (z = 0)
   */
  static create2D(x: number, y: number): Vector {
    return new Vector(x, y, 0);
  }

  /**
   * Create a 3D vector
   */
  static create3D(x: number, y: number, z: number): Vector {
    return new Vector(x, y, z);
  }

  /**
   * Create vector from two points
   */
  static fromPoints(from: Point, to: Point): Vector {
    return new Vector(to.x - from.x, to.y - from.y, to.z - from.z);
  }

  /**
   * Create vector from array
   */
  static fromArray(coords: number[]): Vector {
    return new Vector(coords[0] || 0, coords[1] || 0, coords[2] || 0);
  }

  /**
   * Create unit vector along X axis
   */
  static unitX(): Vector {
    return new Vector(1, 0, 0);
  }

  /**
   * Create unit vector along Y axis
   */
  static unitY(): Vector {
    return new Vector(0, 1, 0);
  }

  /**
   * Create unit vector along Z axis
   */
  static unitZ(): Vector {
    return new Vector(0, 0, 1);
  }

  /**
   * Create zero vector
   */
  static zero(): Vector {
    return new Vector(0, 0, 0);
  }
}