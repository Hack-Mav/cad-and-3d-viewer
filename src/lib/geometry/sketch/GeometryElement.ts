import { Point } from '../core/Point';
import { Vector } from '../core/Vector';

/**
 * Base class for all geometric elements in a sketch
 */
export abstract class GeometryElement {
  public id: string;
  public type: string;
  public isConstruction: boolean;

  constructor(type: string, id?: string) {
    this.id = id || this.generateId();
    this.type = type;
    this.isConstruction = false;
  }

  /**
   * Generate a unique ID for this element
   */
  private generateId(): string {
    return `${this.type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get all control points of this element
   */
  abstract getControlPoints(): Point[];

  /**
   * Update the element with new control points
   */
  abstract updateFromPoints(points: Point[]): void;

  /**
   * Calculate the length of this element
   */
  abstract getLength(): number;

  /**
   * Get point at parameter t (0 to 1)
   */
  abstract getPointAt(t: number): Point;

  /**
   * Get tangent vector at parameter t (0 to 1)
   */
  abstract getTangentAt(t: number): Vector;

  /**
   * Check if a point lies on this element within tolerance
   */
  abstract containsPoint(point: Point, tolerance?: number): boolean;

  /**
   * Get the closest point on this element to a given point
   */
  abstract getClosestPoint(point: Point): Point;

  /**
   * Get parameter value for the closest point
   */
  abstract getClosestParameter(point: Point): number;

  /**
   * Get bounding box of this element
   */
  abstract getBoundingBox(): { min: Point; max: Point };

  /**
   * Clone this element
   */
  abstract clone(): GeometryElement;

  /**
   * Check if this element is valid
   */
  abstract isValid(): boolean;

  /**
   * Convert to string representation
   */
  toString(): string {
    return `${this.type}(${this.id})`;
  }
}

/**
 * Represents a line segment
 */
export class Line extends GeometryElement {
  public startPoint: Point;
  public endPoint: Point;

  constructor(startPoint: Point, endPoint: Point, id?: string) {
    super('Line', id);
    this.startPoint = startPoint.clone();
    this.endPoint = endPoint.clone();
  }

  getControlPoints(): Point[] {
    return [this.startPoint, this.endPoint];
  }

  updateFromPoints(points: Point[]): void {
    if (points.length >= 2) {
      this.startPoint = points[0].clone();
      this.endPoint = points[1].clone();
    }
  }

  getLength(): number {
    return this.startPoint.distanceTo(this.endPoint);
  }

  getPointAt(t: number): Point {
    const vector = Vector.fromPoints(this.startPoint, this.endPoint);
    const scaledVector = vector.multiply(t);
    return this.startPoint.add(new Point(scaledVector.x, scaledVector.y, scaledVector.z));
  }

  getTangentAt(t: number): Vector {
    return Vector.fromPoints(this.startPoint, this.endPoint).normalize();
  }

  containsPoint(point: Point, tolerance: number = 1e-6): boolean {
    const closestPoint = this.getClosestPoint(point);
    return point.distanceTo(closestPoint) < tolerance;
  }

  getClosestPoint(point: Point): Point {
    const lineVector = Vector.fromPoints(this.startPoint, this.endPoint);
    const pointVector = Vector.fromPoints(this.startPoint, point);
    
    const lineLength = lineVector.length();
    if (lineLength === 0) {
      return this.startPoint.clone();
    }

    const t = Math.max(0, Math.min(1, pointVector.dot(lineVector) / (lineLength * lineLength)));
    return this.getPointAt(t);
  }

  getClosestParameter(point: Point): number {
    const lineVector = Vector.fromPoints(this.startPoint, this.endPoint);
    const pointVector = Vector.fromPoints(this.startPoint, point);
    
    const lineLength = lineVector.length();
    if (lineLength === 0) {
      return 0;
    }

    return Math.max(0, Math.min(1, pointVector.dot(lineVector) / (lineLength * lineLength)));
  }

  getBoundingBox(): { min: Point; max: Point } {
    return {
      min: new Point(
        Math.min(this.startPoint.x, this.endPoint.x),
        Math.min(this.startPoint.y, this.endPoint.y),
        Math.min(this.startPoint.z, this.endPoint.z)
      ),
      max: new Point(
        Math.max(this.startPoint.x, this.endPoint.x),
        Math.max(this.startPoint.y, this.endPoint.y),
        Math.max(this.startPoint.z, this.endPoint.z)
      )
    };
  }

  clone(): Line {
    return new Line(this.startPoint, this.endPoint, this.id);
  }

  isValid(): boolean {
    return !this.startPoint.equals(this.endPoint);
  }

  /**
   * Get the direction vector of this line
   */
  getDirection(): Vector {
    return Vector.fromPoints(this.startPoint, this.endPoint).normalize();
  }

  /**
   * Check if this line is parallel to another line
   */
  isParallel(other: Line, tolerance: number = 1e-6): boolean {
    return this.getDirection().isParallel(other.getDirection(), tolerance);
  }

  /**
   * Check if this line is perpendicular to another line
   */
  isPerpendicular(other: Line, tolerance: number = 1e-6): boolean {
    return this.getDirection().isPerpendicular(other.getDirection(), tolerance);
  }
}

/**
 * Represents a circular arc
 */
export class Arc extends GeometryElement {
  public center: Point;
  public radius: number;
  public startAngle: number; // in radians
  public endAngle: number;   // in radians

  constructor(center: Point, radius: number, startAngle: number, endAngle: number, id?: string) {
    super('Arc', id);
    this.center = center.clone();
    this.radius = Math.abs(radius);
    this.startAngle = startAngle;
    this.endAngle = endAngle;
  }

  getControlPoints(): Point[] {
    return [
      this.center,
      this.getPointAt(0), // start point
      this.getPointAt(1)  // end point
    ];
  }

  updateFromPoints(points: Point[]): void {
    if (points.length >= 3) {
      this.center = points[0].clone();
      const startPoint = points[1];
      const endPoint = points[2];
      
      this.radius = this.center.distanceTo(startPoint);
      this.startAngle = Math.atan2(startPoint.y - this.center.y, startPoint.x - this.center.x);
      this.endAngle = Math.atan2(endPoint.y - this.center.y, endPoint.x - this.center.x);
    }
  }

  getLength(): number {
    let angle = this.endAngle - this.startAngle;
    if (angle < 0) {
      angle += 2 * Math.PI;
    }
    return this.radius * angle;
  }

  getPointAt(t: number): Point {
    let angle = this.startAngle + t * (this.endAngle - this.startAngle);
    return new Point(
      this.center.x + this.radius * Math.cos(angle),
      this.center.y + this.radius * Math.sin(angle),
      this.center.z
    );
  }

  getTangentAt(t: number): Vector {
    let angle = this.startAngle + t * (this.endAngle - this.startAngle);
    return new Vector(-Math.sin(angle), Math.cos(angle), 0);
  }

  containsPoint(point: Point, tolerance: number = 1e-6): boolean {
    const distance = this.center.distanceTo(point);
    if (Math.abs(distance - this.radius) > tolerance) {
      return false;
    }

    const angle = Math.atan2(point.y - this.center.y, point.x - this.center.x);
    return this.isAngleInRange(angle, tolerance);
  }

  private isAngleInRange(angle: number, tolerance: number = 1e-6): boolean {
    let start = this.startAngle;
    let end = this.endAngle;
    
    // Normalize angles to [0, 2π]
    while (start < 0) start += 2 * Math.PI;
    while (end < 0) end += 2 * Math.PI;
    while (angle < 0) angle += 2 * Math.PI;
    
    start = start % (2 * Math.PI);
    end = end % (2 * Math.PI);
    angle = angle % (2 * Math.PI);

    if (start <= end) {
      return angle >= start - tolerance && angle <= end + tolerance;
    } else {
      return angle >= start - tolerance || angle <= end + tolerance;
    }
  }

  getClosestPoint(point: Point): Point {
    const angle = Math.atan2(point.y - this.center.y, point.x - this.center.x);
    
    // Find the closest angle within the arc range
    let closestAngle = angle;
    if (!this.isAngleInRange(angle)) {
      const distToStart = Math.abs(angle - this.startAngle);
      const distToEnd = Math.abs(angle - this.endAngle);
      closestAngle = distToStart < distToEnd ? this.startAngle : this.endAngle;
    }

    return new Point(
      this.center.x + this.radius * Math.cos(closestAngle),
      this.center.y + this.radius * Math.sin(closestAngle),
      this.center.z
    );
  }

  getClosestParameter(point: Point): number {
    const angle = Math.atan2(point.y - this.center.y, point.x - this.center.x);
    let t = (angle - this.startAngle) / (this.endAngle - this.startAngle);
    return Math.max(0, Math.min(1, t));
  }

  getBoundingBox(): { min: Point; max: Point } {
    const points = [this.getPointAt(0), this.getPointAt(1)];
    
    // Check if arc crosses axis-aligned directions
    const angles = [0, Math.PI / 2, Math.PI, 3 * Math.PI / 2];
    for (const angle of angles) {
      if (this.isAngleInRange(angle)) {
        points.push(new Point(
          this.center.x + this.radius * Math.cos(angle),
          this.center.y + this.radius * Math.sin(angle),
          this.center.z
        ));
      }
    }

    const xs = points.map(p => p.x);
    const ys = points.map(p => p.y);
    const zs = points.map(p => p.z);

    return {
      min: new Point(Math.min(...xs), Math.min(...ys), Math.min(...zs)),
      max: new Point(Math.max(...xs), Math.max(...ys), Math.max(...zs))
    };
  }

  clone(): Arc {
    return new Arc(this.center, this.radius, this.startAngle, this.endAngle, this.id);
  }

  isValid(): boolean {
    return this.radius > 0 && this.startAngle !== this.endAngle;
  }
}

/**
 * Represents a circle
 */
export class Circle extends GeometryElement {
  public center: Point;
  public radius: number;

  constructor(center: Point, radius: number, id?: string) {
    super('Circle', id);
    this.center = center.clone();
    this.radius = Math.abs(radius);
  }

  getControlPoints(): Point[] {
    return [
      this.center,
      new Point(this.center.x + this.radius, this.center.y, this.center.z)
    ];
  }

  updateFromPoints(points: Point[]): void {
    if (points.length >= 2) {
      this.center = points[0].clone();
      this.radius = this.center.distanceTo(points[1]);
    }
  }

  getLength(): number {
    return 2 * Math.PI * this.radius;
  }

  getPointAt(t: number): Point {
    const angle = t * 2 * Math.PI;
    return new Point(
      this.center.x + this.radius * Math.cos(angle),
      this.center.y + this.radius * Math.sin(angle),
      this.center.z
    );
  }

  getTangentAt(t: number): Vector {
    const angle = t * 2 * Math.PI;
    return new Vector(-Math.sin(angle), Math.cos(angle), 0);
  }

  containsPoint(point: Point, tolerance: number = 1e-6): boolean {
    const distance = this.center.distanceTo(point);
    return Math.abs(distance - this.radius) < tolerance;
  }

  getClosestPoint(point: Point): Point {
    const direction = Vector.fromPoints(this.center, point).normalize();
    const scaledDirection = direction.multiply(this.radius);
    return this.center.add(new Point(scaledDirection.x, scaledDirection.y, scaledDirection.z));
  }

  getClosestParameter(point: Point): number {
    const angle = Math.atan2(point.y - this.center.y, point.x - this.center.x);
    return (angle + 2 * Math.PI) % (2 * Math.PI) / (2 * Math.PI);
  }

  getBoundingBox(): { min: Point; max: Point } {
    return {
      min: new Point(
        this.center.x - this.radius,
        this.center.y - this.radius,
        this.center.z
      ),
      max: new Point(
        this.center.x + this.radius,
        this.center.y + this.radius,
        this.center.z
      )
    };
  }

  clone(): Circle {
    return new Circle(this.center, this.radius, this.id);
  }

  isValid(): boolean {
    return this.radius > 0;
  }
}