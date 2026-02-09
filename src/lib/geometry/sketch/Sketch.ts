import { Point } from '../core/Point';
import { Plane } from '../core/Plane';
import { GeometryElement, Line, Arc, Circle } from './GeometryElement';

/**
 * Validation result for sketch operations
 */
export interface SketchValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Represents a 2D sketch on a plane with geometric elements
 */
export class Sketch {
  public id: string;
  public name: string;
  public plane: Plane;
  public elements: Map<string, GeometryElement>;
  private nextElementIndex: number;

  constructor(plane: Plane, name?: string, id?: string) {
    this.id = id || this.generateId();
    this.name = name || `Sketch_${this.id}`;
    this.plane = plane.clone();
    this.elements = new Map();
    this.nextElementIndex = 1;
  }

  /**
   * Generate a unique ID for this sketch
   */
  private generateId(): string {
    return `sketch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Add a geometric element to the sketch
   */
  addElement(element: GeometryElement): void {
    this.elements.set(element.id, element);
  }

  /**
   * Remove a geometric element from the sketch
   */
  removeElement(elementId: string): boolean {
    return this.elements.delete(elementId);
  }

  /**
   * Get a geometric element by ID
   */
  getElement(elementId: string): GeometryElement | undefined {
    return this.elements.get(elementId);
  }

  /**
   * Get all geometric elements
   */
  getAllElements(): GeometryElement[] {
    return Array.from(this.elements.values());
  }

  /**
   * Get elements by type
   */
  getElementsByType<T extends GeometryElement>(type: new (...args: any[]) => T): T[] {
    return this.getAllElements().filter(element => element instanceof type) as T[];
  }

  /**
   * Clear all elements from the sketch
   */
  clear(): void {
    this.elements.clear();
    this.nextElementIndex = 1;
  }

  /**
   * Create a line in the sketch
   */
  createLine(startPoint: Point, endPoint: Point): Line {
    // Convert world coordinates to sketch plane coordinates
    const sketchStart = this.plane.worldToPlane(startPoint);
    const sketchEnd = this.plane.worldToPlane(endPoint);
    
    const line = new Line(sketchStart, sketchEnd);
    this.addElement(line);
    return line;
  }

  /**
   * Create an arc in the sketch
   */
  createArc(center: Point, radius: number, startAngle: number, endAngle: number): Arc {
    // Convert world coordinates to sketch plane coordinates
    const sketchCenter = this.plane.worldToPlane(center);
    
    const arc = new Arc(sketchCenter, radius, startAngle, endAngle);
    this.addElement(arc);
    return arc;
  }

  /**
   * Create a circle in the sketch
   */
  createCircle(center: Point, radius: number): Circle {
    // Convert world coordinates to sketch plane coordinates
    const sketchCenter = this.plane.worldToPlane(center);
    
    const circle = new Circle(sketchCenter, radius);
    this.addElement(circle);
    return circle;
  }

  /**
   * Convert sketch coordinates to world coordinates
   */
  sketchToWorld(sketchPoint: Point): Point {
    return this.plane.planeToWorld(sketchPoint);
  }

  /**
   * Convert world coordinates to sketch coordinates
   */
  worldToSketch(worldPoint: Point): Point {
    return this.plane.worldToPlane(worldPoint);
  }

  /**
   * Find elements at a given point within tolerance
   */
  findElementsAt(point: Point, tolerance: number = 1e-6): GeometryElement[] {
    const sketchPoint = this.worldToSketch(point);
    return this.getAllElements().filter(element => 
      element.containsPoint(sketchPoint, tolerance)
    );
  }

  /**
   * Find the closest element to a given point
   */
  findClosestElement(point: Point): { element: GeometryElement; distance: number } | null {
    const sketchPoint = this.worldToSketch(point);
    let closestElement: GeometryElement | null = null;
    let minDistance = Infinity;

    for (const element of this.getAllElements()) {
      const closestPointOnElement = element.getClosestPoint(sketchPoint);
      const distance = sketchPoint.distanceTo(closestPointOnElement);
      
      if (distance < minDistance) {
        minDistance = distance;
        closestElement = element;
      }
    }

    return closestElement ? { element: closestElement, distance: minDistance } : null;
  }

  /**
   * Get bounding box of all elements in the sketch
   */
  getBoundingBox(): { min: Point; max: Point } | null {
    const elements = this.getAllElements();
    if (elements.length === 0) {
      return null;
    }

    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

    for (const element of elements) {
      const bbox = element.getBoundingBox();
      minX = Math.min(minX, bbox.min.x);
      minY = Math.min(minY, bbox.min.y);
      minZ = Math.min(minZ, bbox.min.z);
      maxX = Math.max(maxX, bbox.max.x);
      maxY = Math.max(maxY, bbox.max.y);
      maxZ = Math.max(maxZ, bbox.max.z);
    }

    return {
      min: new Point(minX, minY, minZ),
      max: new Point(maxX, maxY, maxZ)
    };
  }

  /**
   * Validate the sketch and return validation results
   */
  validate(): SketchValidationResult {
    const result: SketchValidationResult = {
      isValid: true,
      errors: [],
      warnings: []
    };

    // Check if sketch has elements
    if (this.elements.size === 0) {
      result.warnings.push('Sketch is empty');
    }

    // Validate each element
    for (const element of this.getAllElements()) {
      if (!element.isValid()) {
        result.isValid = false;
        result.errors.push(`Invalid element: ${element.toString()}`);
      }
    }

    // Check for duplicate elements (same geometry)
    const elements = this.getAllElements();
    for (let i = 0; i < elements.length; i++) {
      for (let j = i + 1; j < elements.length; j++) {
        if (this.areElementsIdentical(elements[i], elements[j])) {
          result.warnings.push(`Duplicate elements found: ${elements[i].id} and ${elements[j].id}`);
        }
      }
    }

    return result;
  }

  /**
   * Check if two elements are geometrically identical
   */
  private areElementsIdentical(element1: GeometryElement, element2: GeometryElement, tolerance: number = 1e-6): boolean {
    if (element1.type !== element2.type) {
      return false;
    }

    const points1 = element1.getControlPoints();
    const points2 = element2.getControlPoints();

    if (points1.length !== points2.length) {
      return false;
    }

    for (let i = 0; i < points1.length; i++) {
      if (!points1[i].equals(points2[i], tolerance)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Check if the sketch forms closed loops
   */
  detectClosedLoops(): GeometryElement[][] {
    const loops: GeometryElement[][] = [];
    const visited = new Set<string>();

    for (const element of this.getAllElements()) {
      if (visited.has(element.id)) {
        continue;
      }

      const loop = this.traceLoop(element, visited);
      if (loop.length > 1) {
        loops.push(loop);
      }
    }

    return loops;
  }

  /**
   * Trace a loop starting from a given element
   */
  private traceLoop(startElement: GeometryElement, visited: Set<string>): GeometryElement[] {
    const loop: GeometryElement[] = [startElement];
    visited.add(startElement.id);

    // This is a simplified implementation
    // In a full implementation, you would need to check connectivity
    // between elements based on shared endpoints
    
    return loop;
  }

  /**
   * Get sketch statistics
   */
  getStatistics(): {
    elementCount: number;
    lineCount: number;
    arcCount: number;
    circleCount: number;
    totalLength: number;
  } {
    const elements = this.getAllElements();
    
    return {
      elementCount: elements.length,
      lineCount: this.getElementsByType(Line).length,
      arcCount: this.getElementsByType(Arc).length,
      circleCount: this.getElementsByType(Circle).length,
      totalLength: elements.reduce((sum, element) => sum + element.getLength(), 0)
    };
  }

  /**
   * Clone this sketch
   */
  clone(): Sketch {
    const clonedSketch = new Sketch(this.plane, this.name, this.id);
    
    for (const element of this.getAllElements()) {
      clonedSketch.addElement(element.clone());
    }

    return clonedSketch;
  }

  /**
   * Convert to JSON representation
   */
  toJSON(): any {
    return {
      id: this.id,
      name: this.name,
      plane: {
        origin: this.plane.origin.toArray(),
        normal: this.plane.normal.toArray(),
        xAxis: this.plane.xAxis.toArray(),
        yAxis: this.plane.yAxis.toArray()
      },
      elements: Array.from(this.elements.values()).map(element => ({
        id: element.id,
        type: element.type,
        controlPoints: element.getControlPoints().map(p => p.toArray())
      }))
    };
  }

  /**
   * Convert to string representation
   */
  toString(): string {
    const stats = this.getStatistics();
    return `Sketch(${this.name}, elements: ${stats.elementCount}, plane: ${this.plane.toString()})`;
  }

  /**
   * Create a sketch on the XY plane
   */
  static createXY(name?: string): Sketch {
    return new Sketch(Plane.XY(), name);
  }

  /**
   * Create a sketch on the XZ plane
   */
  static createXZ(name?: string): Sketch {
    return new Sketch(Plane.XZ(), name);
  }

  /**
   * Create a sketch on the YZ plane
   */
  static createYZ(name?: string): Sketch {
    return new Sketch(Plane.YZ(), name);
  }
}