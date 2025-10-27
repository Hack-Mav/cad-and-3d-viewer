import { GeometryElement } from '../sketch/GeometryElement';
import { Point } from '../core/Point';
import { Vector } from '../core/Vector';

/**
 * Status of a constraint
 */
export enum ConstraintStatus {
  Satisfied = 'satisfied',
  Violated = 'violated',
  Conflicted = 'conflicted',
  Redundant = 'redundant'
}

/**
 * Base class for all geometric constraints
 */
export abstract class Constraint {
  public id: string;
  public type: string;
  public elements: GeometryElement[];
  public status: ConstraintStatus;
  public priority: number;
  public tolerance: number;

  constructor(type: string, elements: GeometryElement[], id?: string) {
    this.id = id || this.generateId();
    this.type = type;
    this.elements = [...elements];
    this.status = ConstraintStatus.Violated;
    this.priority = 1;
    this.tolerance = 1e-6;
  }

  /**
   * Generate a unique ID for this constraint
   */
  private generateId(): string {
    return `${this.type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Calculate the constraint error (0 = satisfied)
   */
  abstract calculateError(): number;

  /**
   * Calculate the gradient of the constraint with respect to element parameters
   */
  abstract calculateGradient(): number[];

  /**
   * Check if the constraint is satisfied within tolerance
   */
  isSatisfied(): boolean {
    return Math.abs(this.calculateError()) < this.tolerance;
  }

  /**
   * Update constraint status based on current error
   */
  updateStatus(): void {
    if (this.isSatisfied()) {
      this.status = ConstraintStatus.Satisfied;
    } else {
      this.status = ConstraintStatus.Violated;
    }
  }

  /**
   * Get constraint visualization data
   */
  abstract getVisualizationData(): ConstraintVisualization;

  /**
   * Clone this constraint
   */
  abstract clone(): Constraint;

  /**
   * Convert to string representation
   */
  toString(): string {
    return `${this.type}(${this.id}, status: ${this.status})`;
  }
}

/**
 * Visualization data for constraints
 */
export interface ConstraintVisualization {
  type: string;
  position: Point;
  symbol: string;
  color: string;
  size: number;
}

/**
 * Parallel constraint between two lines
 */
export class ParallelConstraint extends Constraint {
  constructor(line1: GeometryElement, line2: GeometryElement, id?: string) {
    super('Parallel', [line1, line2], id);
  }

  calculateError(): number {
    const [line1, line2] = this.elements;
    if (line1.type !== 'Line' || line2.type !== 'Line') {
      return Infinity;
    }

    const points1 = line1.getControlPoints();
    const points2 = line2.getControlPoints();
    
    const dir1 = Vector.fromPoints(points1[0], points1[1]).normalize();
    const dir2 = Vector.fromPoints(points2[0], points2[1]).normalize();
    
    // Error is the sine of the angle between directions
    const cross = dir1.cross(dir2);
    return cross.length();
  }

  calculateGradient(): number[] {
    // Simplified gradient calculation
    // In a full implementation, this would calculate partial derivatives
    return [0, 0, 0, 0]; // [dx1, dy1, dx2, dy2] for line endpoints
  }

  getVisualizationData(): ConstraintVisualization {
    const midpoint1 = this.elements[0].getPointAt(0.5);
    const midpoint2 = this.elements[1].getPointAt(0.5);
    const position = new Point(
      (midpoint1.x + midpoint2.x) / 2,
      (midpoint1.y + midpoint2.y) / 2,
      (midpoint1.z + midpoint2.z) / 2
    );

    return {
      type: 'parallel',
      position,
      symbol: '∥',
      color: this.status === ConstraintStatus.Satisfied ? '#00ff00' : '#ff0000',
      size: 12
    };
  }

  clone(): ParallelConstraint {
    return new ParallelConstraint(this.elements[0], this.elements[1], this.id);
  }
}

/**
 * Perpendicular constraint between two lines
 */
export class PerpendicularConstraint extends Constraint {
  constructor(line1: GeometryElement, line2: GeometryElement, id?: string) {
    super('Perpendicular', [line1, line2], id);
  }

  calculateError(): number {
    const [line1, line2] = this.elements;
    if (line1.type !== 'Line' || line2.type !== 'Line') {
      return Infinity;
    }

    const points1 = line1.getControlPoints();
    const points2 = line2.getControlPoints();
    
    const dir1 = Vector.fromPoints(points1[0], points1[1]).normalize();
    const dir2 = Vector.fromPoints(points2[0], points2[1]).normalize();
    
    // Error is the cosine of the angle between directions
    return Math.abs(dir1.dot(dir2));
  }

  calculateGradient(): number[] {
    // Simplified gradient calculation
    return [0, 0, 0, 0];
  }

  getVisualizationData(): ConstraintVisualization {
    const midpoint1 = this.elements[0].getPointAt(0.5);
    const midpoint2 = this.elements[1].getPointAt(0.5);
    const position = new Point(
      (midpoint1.x + midpoint2.x) / 2,
      (midpoint1.y + midpoint2.y) / 2,
      (midpoint1.z + midpoint2.z) / 2
    );

    return {
      type: 'perpendicular',
      position,
      symbol: '⊥',
      color: this.status === ConstraintStatus.Satisfied ? '#00ff00' : '#ff0000',
      size: 12
    };
  }

  clone(): PerpendicularConstraint {
    return new PerpendicularConstraint(this.elements[0], this.elements[1], this.id);
  }
}

/**
 * Tangent constraint between a line and a circle/arc
 */
export class TangentConstraint extends Constraint {
  constructor(line: GeometryElement, curve: GeometryElement, id?: string) {
    super('Tangent', [line, curve], id);
  }

  calculateError(): number {
    const [line, curve] = this.elements;
    
    if (line.type !== 'Line' || (curve.type !== 'Circle' && curve.type !== 'Arc')) {
      return Infinity;
    }

    const linePoints = line.getControlPoints();
    const curvePoints = curve.getControlPoints();
    
    // For circle/arc, first control point is center
    const center = curvePoints[0];
    const radius = curve.type === 'Circle' ? 
      center.distanceTo(curvePoints[1]) : 
      (curve as any).radius;

    // Calculate distance from center to line
    const lineStart = linePoints[0];
    const lineEnd = linePoints[1];
    const lineDir = Vector.fromPoints(lineStart, lineEnd).normalize();
    const centerToStart = Vector.fromPoints(lineStart, center);
    
    const distanceToLine = Math.abs(centerToStart.cross(lineDir).length());
    
    // Error is the difference between distance and radius
    return Math.abs(distanceToLine - radius);
  }

  calculateGradient(): number[] {
    return [0, 0, 0, 0];
  }

  getVisualizationData(): ConstraintVisualization {
    const linePoint = this.elements[0].getPointAt(0.5);
    const curvePoint = this.elements[1].getPointAt(0.5);
    const position = new Point(
      (linePoint.x + curvePoint.x) / 2,
      (linePoint.y + curvePoint.y) / 2,
      (linePoint.z + curvePoint.z) / 2
    );

    return {
      type: 'tangent',
      position,
      symbol: '⊤',
      color: this.status === ConstraintStatus.Satisfied ? '#00ff00' : '#ff0000',
      size: 12
    };
  }

  clone(): TangentConstraint {
    return new TangentConstraint(this.elements[0], this.elements[1], this.id);
  }
}

/**
 * Equal length constraint between two lines
 */
export class EqualLengthConstraint extends Constraint {
  constructor(line1: GeometryElement, line2: GeometryElement, id?: string) {
    super('EqualLength', [line1, line2], id);
  }

  calculateError(): number {
    const [line1, line2] = this.elements;
    
    if (line1.type !== 'Line' || line2.type !== 'Line') {
      return Infinity;
    }

    const length1 = line1.getLength();
    const length2 = line2.getLength();
    
    return Math.abs(length1 - length2);
  }

  calculateGradient(): number[] {
    return [0, 0, 0, 0];
  }

  getVisualizationData(): ConstraintVisualization {
    const midpoint1 = this.elements[0].getPointAt(0.5);
    const midpoint2 = this.elements[1].getPointAt(0.5);
    const position = new Point(
      (midpoint1.x + midpoint2.x) / 2,
      (midpoint1.y + midpoint2.y) / 2,
      (midpoint1.z + midpoint2.z) / 2
    );

    return {
      type: 'equal',
      position,
      symbol: '=',
      color: this.status === ConstraintStatus.Satisfied ? '#00ff00' : '#ff0000',
      size: 12
    };
  }

  clone(): EqualLengthConstraint {
    return new EqualLengthConstraint(this.elements[0], this.elements[1], this.id);
  }
}

/**
 * Distance constraint between two points or point and line
 */
export class DistanceConstraint extends Constraint {
  public targetDistance: number;

  constructor(element1: GeometryElement, element2: GeometryElement, distance: number, id?: string) {
    super('Distance', [element1, element2], id);
    this.targetDistance = distance;
  }

  calculateError(): number {
    const [elem1, elem2] = this.elements;
    
    // Simplified: assume we're measuring between midpoints
    const point1 = elem1.getPointAt(0.5);
    const point2 = elem2.getPointAt(0.5);
    
    const actualDistance = point1.distanceTo(point2);
    return Math.abs(actualDistance - this.targetDistance);
  }

  calculateGradient(): number[] {
    return [0, 0, 0, 0];
  }

  getVisualizationData(): ConstraintVisualization {
    const point1 = this.elements[0].getPointAt(0.5);
    const point2 = this.elements[1].getPointAt(0.5);
    const position = new Point(
      (point1.x + point2.x) / 2,
      (point1.y + point2.y) / 2,
      (point1.z + point2.z) / 2
    );

    return {
      type: 'distance',
      position,
      symbol: this.targetDistance.toFixed(2),
      color: this.status === ConstraintStatus.Satisfied ? '#00ff00' : '#ff0000',
      size: 10
    };
  }

  clone(): DistanceConstraint {
    return new DistanceConstraint(this.elements[0], this.elements[1], this.targetDistance, this.id);
  }
}