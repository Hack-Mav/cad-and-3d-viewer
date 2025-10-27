import { Point } from './Point';
import { Vector } from './Vector';

/**
 * Represents a plane in 3D space defined by a point and normal vector
 */
export class Plane {
  public origin: Point;
  public normal: Vector;
  public uAxis: Vector;
  public vAxis: Vector;

  constructor(origin: Point, normal: Vector, uAxis?: Vector) {
    this.origin = origin.clone();
    this.normal = normal.normalize();
    
    // Create orthogonal coordinate system
    if (uAxis) {
      this.uAxis = uAxis.normalize();
      this.vAxis = this.normal.cross(this.uAxis).normalize();
    } else {
      // Create arbitrary orthogonal axes
      const tempVector = Math.abs(this.normal.x) < 0.9 
        ? Vector.unitX() 
        : Vector.unitY();
      this.uAxis = this.normal.cross(tempVector).normalize();
      this.vAxis = this.normal.cross(this.uAxis).normalize();
    }
  }

  /**
   * Create a copy of this plane
   */
  clone(): Plane {
    return new Plane(this.origin, this.normal, this.uAxis);
  }

  /**
   * Calculate distance from a point to this plane
   */
  distanceToPoint(point: Point): number {
    const vector = Vector.fromPoints(this.origin, point);
    return vector.dot(this.normal);
  }

  /**
   * Project a 3D point onto this plane
   */
  projectPoint(point: Point): Point {
    const distance = this.distanceToPoint(point);
    const projection = this.normal.multiply(distance);
    return point.subtract(new Point(projection.x, projection.y, projection.z));
  }

  /**
   * Convert 3D point to 2D coordinates on this plane
   */
  worldToPlane(point: Point): Point {
    const projected = this.projectPoint(point);
    const vector = Vector.fromPoints(this.origin, projected);
    const u = vector.dot(this.uAxis);
    const v = vector.dot(this.vAxis);
    return Point.create2D(u, v);
  }

  /**
   * Convert 2D plane coordinates to 3D world coordinates
   */
  planeToWorld(planePoint: Point): Point {
    const worldVector = this.uAxis.multiply(planePoint.x)
      .add(this.vAxis.multiply(planePoint.y));
    return this.origin.add(new Point(worldVector.x, worldVector.y, worldVector.z));
  }

  /**
   * Check if a point lies on this plane within tolerance
   */
  containsPoint(point: Point, tolerance: number = 1e-6): boolean {
    return Math.abs(this.distanceToPoint(point)) < tolerance;
  }

  /**
   * Check if this plane is parallel to another plane
   */
  isParallel(other: Plane, tolerance: number = 1e-6): boolean {
    return this.normal.isParallel(other.normal, tolerance);
  }

  /**
   * Check if this plane is perpendicular to another plane
   */
  isPerpendicular(other: Plane, tolerance: number = 1e-6): boolean {
    return this.normal.isPerpendicular(other.normal, tolerance);
  }

  /**
   * Calculate intersection line between this plane and another plane
   */
  intersectPlane(other: Plane): { point: Point; direction: Vector } | null {
    const direction = this.normal.cross(other.normal);
    
    // Check if planes are parallel
    if (direction.length() < 1e-6) {
      return null;
    }

    // Find a point on the intersection line
    // Use the point closest to origin
    const n1 = this.normal;
    const n2 = other.normal;
    const d1 = -n1.dot(Vector.fromPoints(Point.create3D(0, 0, 0), this.origin));
    const d2 = -n2.dot(Vector.fromPoints(Point.create3D(0, 0, 0), other.origin));

    const denom = n1.dot(n1) * n2.dot(n2) - n1.dot(n2) * n1.dot(n2);
    if (Math.abs(denom) < 1e-6) {
      return null;
    }

    const c1 = (d1 * n2.dot(n2) - d2 * n1.dot(n2)) / denom;
    const c2 = (d2 * n1.dot(n1) - d1 * n1.dot(n2)) / denom;

    const point = new Point(
      c1 * n1.x + c2 * n2.x,
      c1 * n1.y + c2 * n2.y,
      c1 * n1.z + c2 * n2.z
    );

    return { point, direction: direction.normalize() };
  }

  /**
   * Check if this plane equals another plane within tolerance
   */
  equals(other: Plane, tolerance: number = 1e-6): boolean {
    return (
      this.origin.equals(other.origin, tolerance) &&
      this.normal.equals(other.normal, tolerance)
    );
  }

  /**
   * Convert to string representation
   */
  toString(): string {
    return `Plane(origin: ${this.origin.toString()}, normal: ${this.normal.toString()})`;
  }

  /**
   * Create XY plane at origin
   */
  static XY(): Plane {
    return new Plane(Point.create3D(0, 0, 0), Vector.unitZ());
  }

  /**
   * Create XZ plane at origin
   */
  static XZ(): Plane {
    return new Plane(Point.create3D(0, 0, 0), Vector.unitY());
  }

  /**
   * Create YZ plane at origin
   */
  static YZ(): Plane {
    return new Plane(Point.create3D(0, 0, 0), Vector.unitX());
  }

  /**
   * Create plane from three points
   */
  static fromThreePoints(p1: Point, p2: Point, p3: Point): Plane {
    const v1 = Vector.fromPoints(p1, p2);
    const v2 = Vector.fromPoints(p1, p3);
    const normal = v1.cross(v2).normalize();
    return new Plane(p1, normal);
  }

  /**
   * Create plane from point and normal
   */
  static fromPointAndNormal(point: Point, normal: Vector): Plane {
    return new Plane(point, normal);
  }
}