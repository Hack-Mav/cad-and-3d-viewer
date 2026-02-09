import { Tool, ToolState, CursorType, type ToolMouseEvent, type ToolKeyboardEvent } from '../base/Tool';
import { GeometryElement, Line, Arc, Circle } from '@/lib/geometry/sketch/GeometryElement';
import { Point } from '@/lib/geometry/core/Point';

/**
 * Tool for trimming geometry elements at intersection points
 */
export class TrimTool extends Tool {
  private cuttingElements: GeometryElement[] = [];
  private elementToTrim: GeometryElement | null = null;

  constructor() {
    super(
      'trim',
      'Trim',
      'Trim geometry elements at intersections',
      'scissors',
      CursorType.Crosshair,
      'T'
    );
  }

  /**
   * Check if tool requires a sketch
   */
  requiresSketch(): boolean {
    return true;
  }

  /**
   * Handle mouse down event
   */
  onMouseDown(event: ToolMouseEvent): void {
    if (event.button !== 0) return; // Only handle left mouse button

    const elements = this.activeSketch?.findElementsAt(event.point, 0.01) || [];
    
    if (elements.length === 0) {
      this.addFeedback({
        type: 'error',
        message: 'No element found to trim',
        position: event.point,
        color: '#ff0000'
      });
      return;
    }

    const element = elements[0];

    if (event.shiftKey) {
      // Shift+click to select cutting elements
      if (!this.cuttingElements.includes(element)) {
        this.cuttingElements.push(element);
        
        this.addFeedback({
          type: 'preview',
          message: `Added cutting element: ${element.type} (${this.cuttingElements.length} total)`,
          position: event.point,
          color: '#00ff00'
        });
      }
    } else {
      // Regular click to trim element
      this.elementToTrim = element;
      this.performTrim(event.point);
    }
  }

  /**
   * Handle mouse move event
   */
  onMouseMove(event: ToolMouseEvent): void {
    this.clearFeedback();

    const elements = this.activeSketch?.findElementsAt(event.point, 0.01) || [];
    
    if (elements.length > 0) {
      const element = elements[0];
      const isCuttingElement = this.cuttingElements.includes(element);
      
      if (event.shiftKey) {
        this.addFeedback({
          type: 'preview',
          message: `Shift+click to ${isCuttingElement ? 'remove' : 'add'} cutting element: ${element.type}`,
          position: event.point,
          color: isCuttingElement ? '#ff8000' : '#0080ff'
        });
      } else {
        this.addFeedback({
          type: 'preview',
          message: `Click to trim ${element.type}`,
          position: event.point,
          color: '#0080ff'
        });

        // Show potential trim points
        const trimPoints = this.findTrimPoints(element);
        trimPoints.forEach((point, index) => {
          this.addFeedback({
            type: 'preview',
            geometry: {
              type: 'point',
              position: point,
              size: 3
            },
            message: `Trim point ${index + 1}`,
            color: '#ff0000'
          });
        });
      }
    }

    // Show cutting elements status
    if (this.cuttingElements.length > 0) {
      this.addFeedback({
        type: 'preview',
        message: `Cutting elements: ${this.cuttingElements.length}`,
        position: new Point(event.screenPoint.x, event.screenPoint.y - 20),
        color: '#00ff00'
      });
    }
  }

  /**
   * Perform trim operation
   */
  private performTrim(clickPoint: Point): void {
    if (!this.elementToTrim || !this.activeSketch) {
      return;
    }

    try {
      // Find intersection points with cutting elements
      const intersectionPoints = this.findIntersectionPoints(this.elementToTrim);
      
      if (intersectionPoints.length === 0) {
        this.addFeedback({
          type: 'error',
          message: 'No intersections found for trimming',
          position: clickPoint,
          color: '#ff0000'
        });
        return;
      }

      // Find the trim segment based on click point
      const trimResult = this.calculateTrimSegment(this.elementToTrim, intersectionPoints, clickPoint);
      
      if (!trimResult) {
        this.addFeedback({
          type: 'error',
          message: 'Cannot determine trim segment',
          position: clickPoint,
          color: '#ff0000'
        });
        return;
      }

      // Apply the trim
      this.applyTrim(this.elementToTrim, trimResult);
      
      this.addFeedback({
        type: 'preview',
        message: `Trimmed ${this.elementToTrim.type}`,
        position: clickPoint,
        color: '#00ff00'
      });

    } catch (error) {
      this.addFeedback({
        type: 'error',
        message: `Trim failed: ${error}`,
        position: clickPoint,
        color: '#ff0000'
      });
    }

    this.elementToTrim = null;
  }

  /**
   * Find intersection points between element and cutting elements
   */
  private findIntersectionPoints(element: GeometryElement): Point[] {
    const intersections: Point[] = [];

    for (const cuttingElement of this.cuttingElements) {
      const elementIntersections = this.findElementIntersections(element, cuttingElement);
      intersections.push(...elementIntersections);
    }

    // Remove duplicate points
    const uniqueIntersections: Point[] = [];
    for (const point of intersections) {
      const isDuplicate = uniqueIntersections.some(existing => 
        existing.distanceTo(point) < 1e-6
      );
      if (!isDuplicate) {
        uniqueIntersections.push(point);
      }
    }

    return uniqueIntersections;
  }

  /**
   * Find intersections between two elements
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
    
    const x = p1.x + t * (p2.x - p1.x);
    const y = p1.y + t * (p2.y - p1.y);
    return [new Point(x, y, 0)];
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
   * Calculate which segment to trim based on click point
   */
  private calculateTrimSegment(element: GeometryElement, intersections: Point[], clickPoint: Point): TrimResult | null {
    if (intersections.length === 0) {
      return null;
    }

    // Sort intersections by parameter along the element
    const sortedIntersections = intersections
      .map(point => ({
        point,
        parameter: element.getClosestParameter(point)
      }))
      .sort((a, b) => a.parameter - b.parameter);

    // Find which segment the click point is in
    const clickParameter = element.getClosestParameter(clickPoint);
    
    for (let i = 0; i < sortedIntersections.length - 1; i++) {
      const start = sortedIntersections[i];
      const end = sortedIntersections[i + 1];
      
      if (clickParameter >= start.parameter && clickParameter <= end.parameter) {
        return {
          startParameter: start.parameter,
          endParameter: end.parameter,
          startPoint: start.point,
          endPoint: end.point
        };
      }
    }

    // Check if click is before first intersection
    if (clickParameter < sortedIntersections[0].parameter) {
      return {
        startParameter: 0,
        endParameter: sortedIntersections[0].parameter,
        startPoint: element.getPointAt(0),
        endPoint: sortedIntersections[0].point
      };
    }

    // Check if click is after last intersection
    if (clickParameter > sortedIntersections[sortedIntersections.length - 1].parameter) {
      const lastIntersection = sortedIntersections[sortedIntersections.length - 1];
      return {
        startParameter: lastIntersection.parameter,
        endParameter: 1,
        startPoint: lastIntersection.point,
        endPoint: element.getPointAt(1)
      };
    }

    return null;
  }

  /**
   * Apply trim to element
   */
  private applyTrim(element: GeometryElement, trimResult: TrimResult): void {
    if (!this.activeSketch) {
      return;
    }

    // Remove the original element
    this.activeSketch.removeElement(element.id);

    // Create new element(s) for the remaining segments
    if (element instanceof Line) {
      this.trimLine(element, trimResult);
    } else if (element instanceof Arc) {
      this.trimArc(element, trimResult);
    }
    // Add more element types as needed
  }

  /**
   * Trim a line element
   */
  private trimLine(line: Line, trimResult: TrimResult): void {
    if (!this.activeSketch) {
      return;
    }

    // Create segments before and after the trim
    if (trimResult.startParameter > 0) {
      // Segment before trim
      const beforeEnd = line.getPointAt(trimResult.startParameter);
      const beforeLine = new Line(line.startPoint, beforeEnd);
      this.activeSketch.addElement(beforeLine);
    }

    if (trimResult.endParameter < 1) {
      // Segment after trim
      const afterStart = line.getPointAt(trimResult.endParameter);
      const afterLine = new Line(afterStart, line.endPoint);
      this.activeSketch.addElement(afterLine);
    }
  }

  /**
   * Trim an arc element
   */
  private trimArc(arc: Arc, trimResult: TrimResult): void {
    if (!this.activeSketch) {
      return;
    }

    // Calculate new arc parameters
    const totalAngle = arc.endAngle - arc.startAngle;
    
    if (trimResult.startParameter > 0) {
      // Arc before trim
      const beforeEndAngle = arc.startAngle + trimResult.startParameter * totalAngle;
      const beforeArc = new Arc(arc.center, arc.radius, arc.startAngle, beforeEndAngle);
      this.activeSketch.addElement(beforeArc);
    }

    if (trimResult.endParameter < 1) {
      // Arc after trim
      const afterStartAngle = arc.startAngle + trimResult.endParameter * totalAngle;
      const afterArc = new Arc(arc.center, arc.radius, afterStartAngle, arc.endAngle);
      this.activeSketch.addElement(afterArc);
    }
  }

  /**
   * Find all potential trim points for an element
   */
  private findTrimPoints(element: GeometryElement): Point[] {
    return this.findIntersectionPoints(element);
  }

  /**
   * Handle key down event
   */
  onKeyDown(event: ToolKeyboardEvent): void {
    super.onKeyDown(event);

    if (event.key === 'c' || event.key === 'C') {
      // Clear cutting elements
      this.cuttingElements = [];
      this.addFeedback({
        type: 'preview',
        message: 'Cleared cutting elements',
        position: new Point(0, 0),
        color: '#ff8000'
      });
      event.preventDefault();
    }
  }

  /**
   * Activate the tool
   */
  protected onActivate(): void {
    this.addFeedback({
      type: 'preview',
      message: 'Trim mode: Shift+click to select cutting elements, click to trim. Press C to clear cutting elements.',
      position: new Point(10, 10),
      color: '#0080ff'
    });
  }

  /**
   * Reset tool state
   */
  protected onReset(): void {
    this.cuttingElements = [];
    this.elementToTrim = null;
    this.clearFeedback();
  }

  /**
   * Get help text
   */
  getHelpText(): string {
    return 'Shift+click to select cutting elements, then click on elements to trim them at intersections. Press C to clear cutting elements.';
  }
}

/**
 * Result of trim calculation
 */
interface TrimResult {
  startParameter: number;
  endParameter: number;
  startPoint: Point;
  endPoint: Point;
}