import { Point } from '@/lib/geometry/core/Point';
import { GeometryElement, Line, Arc, Circle } from '@/lib/geometry/sketch/GeometryElement';
import { Sketch } from '@/lib/geometry/sketch/Sketch';

/**
 * Types of snap points
 */
export enum SnapType {
  Endpoint = 'endpoint',
  Midpoint = 'midpoint',
  Center = 'center',
  Intersection = 'intersection',
  Perpendicular = 'perpendicular',
  Tangent = 'tangent',
  Nearest = 'nearest',
  Grid = 'grid'
}

/**
 * Snap result containing the snapped point and information
 */
export interface SnapResult {
  point: Point;
  type: SnapType;
  element?: GeometryElement;
  distance: number;
  message: string;
}

/**
 * Snap settings
 */
export interface SnapSettings {
  enabled: boolean;
  tolerance: number;
  enabledTypes: Set<SnapType>;
  gridSize: number;
  showSnapIndicators: boolean;
}

/**
 * Manages snapping functionality for precise geometry creation
 */
export class SnapManager {
  private settings: SnapSettings;
  private activeSketch?: Sketch;

  constructor() {
    this.settings = {
      enabled: true,
      tolerance: 10, // pixels
      enabledTypes: new Set([
        SnapType.Endpoint,
        SnapType.Midpoint,
        SnapType.Center,
        SnapType.Intersection,
        SnapType.Nearest
      ]),
      gridSize: 1.0,
      showSnapIndicators: true
    };
  }

  /**
   * Set the active sketch for snapping
   */
  setActiveSketch(sketch: Sketch | undefined): void {
    this.activeSketch = sketch;
  }

  /**
   * Update snap settings
   */
  updateSettings(settings: Partial<SnapSettings>): void {
    this.settings = { ...this.settings, ...settings };
  }

  /**
   * Get current snap settings
   */
  getSettings(): SnapSettings {
    return { ...this.settings };
  }

  /**
   * Find the best snap point near the given point
   */
  findSnapPoint(point: Point, screenTolerance: number = this.settings.tolerance): SnapResult | null {
    if (!this.settings.enabled || !this.activeSketch) {
      return null;
    }

    const candidates: SnapResult[] = [];

    // Convert screen tolerance to world tolerance (simplified)
    const worldTolerance = screenTolerance * 0.01; // Rough conversion

    // Find snap points from geometry elements
    for (const element of this.activeSketch.getAllElements()) {
      candidates.push(...this.getElementSnapPoints(element, point, worldTolerance));
    }

    // Find intersection points
    if (this.settings.enabledTypes.has(SnapType.Intersection)) {
      candidates.push(...this.findIntersectionPoints(point, worldTolerance));
    }

    // Grid snapping
    if (this.settings.enabledTypes.has(SnapType.Grid)) {
      const gridSnap = this.findGridSnapPoint(point);
      if (gridSnap && gridSnap.distance < worldTolerance) {
        candidates.push(gridSnap);
      }
    }

    // Return the closest snap point
    if (candidates.length === 0) {
      return null;
    }

    return candidates.reduce((closest, current) => 
      current.distance < closest.distance ? current : closest
    );
  }

  /**
   * Get snap points for a specific geometry element
   */
  private getElementSnapPoints(element: GeometryElement, point: Point, tolerance: number): SnapResult[] {
    const snapPoints: SnapResult[] = [];

    // Endpoint snapping
    if (this.settings.enabledTypes.has(SnapType.Endpoint)) {
      const controlPoints = element.getControlPoints();
      
      if (element instanceof Line) {
        // Start and end points for lines
        snapPoints.push(
          this.createSnapResult(controlPoints[0], SnapType.Endpoint, element, point, 'Endpoint'),
          this.createSnapResult(controlPoints[1], SnapType.Endpoint, element, point, 'Endpoint')
        );
      } else if (element instanceof Arc) {
        // Start and end points for arcs
        snapPoints.push(
          this.createSnapResult(element.getPointAt(0), SnapType.Endpoint, element, point, 'Arc Start'),
          this.createSnapResult(element.getPointAt(1), SnapType.Endpoint, element, point, 'Arc End')
        );
      }
    }

    // Midpoint snapping
    if (this.settings.enabledTypes.has(SnapType.Midpoint)) {
      if (element instanceof Line) {
        const midpoint = element.getPointAt(0.5);
        snapPoints.push(
          this.createSnapResult(midpoint, SnapType.Midpoint, element, point, 'Midpoint')
        );
      }
    }

    // Center snapping
    if (this.settings.enabledTypes.has(SnapType.Center)) {
      if (element instanceof Circle || element instanceof Arc) {
        const center = element instanceof Circle ? element.center : (element as Arc).center;
        snapPoints.push(
          this.createSnapResult(center, SnapType.Center, element, point, 'Center')
        );
      }
    }

    // Nearest point snapping
    if (this.settings.enabledTypes.has(SnapType.Nearest)) {
      const nearestPoint = element.getClosestPoint(point);
      const distance = point.distanceTo(nearestPoint);
      if (distance < tolerance) {
        snapPoints.push(
          this.createSnapResult(nearestPoint, SnapType.Nearest, element, point, 'On Curve')
        );
      }
    }

    // Filter by tolerance
    return snapPoints.filter(snap => snap.distance < tolerance);
  }

  /**
   * Find intersection points between geometry elements
   */
  private findIntersectionPoints(point: Point, tolerance: number): SnapResult[] {
    if (!this.activeSketch) {
      return [];
    }

    const intersections: SnapResult[] = [];
    const elements = this.activeSketch.getAllElements();

    for (let i = 0; i < elements.length; i++) {
      for (let j = i + 1; j < elements.length; j++) {
        const intersectionPoints = this.findElementIntersections(elements[i], elements[j]);
        
        for (const intersectionPoint of intersectionPoints) {
          const distance = point.distanceTo(intersectionPoint);
          if (distance < tolerance) {
            intersections.push({
              point: intersectionPoint,
              type: SnapType.Intersection,
              distance,
              message: 'Intersection'
            });
          }
        }
      }
    }

    return intersections;
  }

  /**
   * Find intersections between two geometry elements
   */
  private findElementIntersections(element1: GeometryElement, element2: GeometryElement): Point[] {
    // Simplified intersection calculation
    // In a full implementation, this would handle all geometry type combinations
    
    if (element1 instanceof Line && element2 instanceof Line) {
      return this.findLineLineIntersection(element1, element2);
    }
    
    if (element1 instanceof Line && element2 instanceof Circle) {
      return this.findLineCircleIntersection(element1, element2);
    }
    
    if (element1 instanceof Circle && element2 instanceof Line) {
      return this.findLineCircleIntersection(element2, element1);
    }

    return [];
  }

  /**
   * Find intersection between two lines
   */
  private findLineLineIntersection(line1: Line, line2: Line): Point[] {
    const p1 = line1.startPoint;
    const p2 = line1.endPoint;
    const p3 = line2.startPoint;
    const p4 = line2.endPoint;

    const denom = (p1.x - p2.x) * (p3.y - p4.y) - (p1.y - p2.y) * (p3.x - p4.x);
    
    if (Math.abs(denom) < 1e-10) {
      return []; // Lines are parallel
    }

    const t = ((p1.x - p3.x) * (p3.y - p4.y) - (p1.y - p3.y) * (p3.x - p4.x)) / denom;
    const u = -((p1.x - p2.x) * (p1.y - p3.y) - (p1.y - p2.y) * (p1.x - p3.x)) / denom;

    if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
      const x = p1.x + t * (p2.x - p1.x);
      const y = p1.y + t * (p2.y - p1.y);
      return [new Point(x, y, 0)];
    }

    return [];
  }

  /**
   * Find intersection between a line and a circle
   */
  private findLineCircleIntersection(line: Line, circle: Circle): Point[] {
    const dx = line.endPoint.x - line.startPoint.x;
    const dy = line.endPoint.y - line.startPoint.y;
    const fx = line.startPoint.x - circle.center.x;
    const fy = line.startPoint.y - circle.center.y;

    const a = dx * dx + dy * dy;
    const b = 2 * (fx * dx + fy * dy);
    const c = (fx * fx + fy * fy) - circle.radius * circle.radius;

    const discriminant = b * b - 4 * a * c;
    
    if (discriminant < 0) {
      return []; // No intersection
    }

    const intersections: Point[] = [];
    const sqrt = Math.sqrt(discriminant);

    const t1 = (-b - sqrt) / (2 * a);
    const t2 = (-b + sqrt) / (2 * a);

    if (t1 >= 0 && t1 <= 1) {
      const x = line.startPoint.x + t1 * dx;
      const y = line.startPoint.y + t1 * dy;
      intersections.push(new Point(x, y, 0));
    }

    if (t2 >= 0 && t2 <= 1 && Math.abs(t2 - t1) > 1e-10) {
      const x = line.startPoint.x + t2 * dx;
      const y = line.startPoint.y + t2 * dy;
      intersections.push(new Point(x, y, 0));
    }

    return intersections;
  }

  /**
   * Find grid snap point
   */
  private findGridSnapPoint(point: Point): SnapResult | null {
    const gridSize = this.settings.gridSize;
    const snappedX = Math.round(point.x / gridSize) * gridSize;
    const snappedY = Math.round(point.y / gridSize) * gridSize;
    const snappedPoint = new Point(snappedX, snappedY, point.z);

    return this.createSnapResult(snappedPoint, SnapType.Grid, undefined, point, 'Grid');
  }

  /**
   * Create a snap result
   */
  private createSnapResult(
    snapPoint: Point,
    type: SnapType,
    element: GeometryElement | undefined,
    originalPoint: Point,
    message: string
  ): SnapResult {
    return {
      point: snapPoint,
      type,
      element,
      distance: originalPoint.distanceTo(snapPoint),
      message
    };
  }

  /**
   * Enable/disable specific snap types
   */
  setSnapTypeEnabled(type: SnapType, enabled: boolean): void {
    if (enabled) {
      this.settings.enabledTypes.add(type);
    } else {
      this.settings.enabledTypes.delete(type);
    }
  }

  /**
   * Check if a snap type is enabled
   */
  isSnapTypeEnabled(type: SnapType): boolean {
    return this.settings.enabledTypes.has(type);
  }

  /**
   * Toggle snap system on/off
   */
  setEnabled(enabled: boolean): void {
    this.settings.enabled = enabled;
  }

  /**
   * Check if snap system is enabled
   */
  isEnabled(): boolean {
    return this.settings.enabled;
  }
}