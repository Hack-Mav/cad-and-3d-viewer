import { Tool, ToolState, CursorType, type ToolMouseEvent, type ToolKeyboardEvent } from '../base/Tool';
import { GeometryElement, Line, Arc } from '@/lib/geometry/sketch/GeometryElement';
import { Point } from '@/lib/geometry/core/Point';
import { Vector } from '@/lib/geometry/core/Vector';

/**
 * Tool for extending geometry elements to boundaries
 */
export class ExtendTool extends Tool {
  private boundaryElements: GeometryElement[] = [];
  private elementToExtend: GeometryElement | null = null;

  constructor() {
    super(
      'extend',
      'Extend',
      'Extend geometry elements to boundaries',
      'arrow-up-right',
      CursorType.Crosshair,
      'X'
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
        message: 'No element found to extend',
        position: event.point,
        color: '#ff0000'
      });
      return;
    }

    const element = elements[0];

    if (event.shiftKey) {
      // Shift+click to select boundary elements
      if (!this.boundaryElements.includes(element)) {
        this.boundaryElements.push(element);
        
        this.addFeedback({
          type: 'preview',
          message: `Added boundary element: ${element.type} (${this.boundaryElements.length} total)`,
          position: event.point,
          color: '#00ff00'
        });
      }
    } else {
      // Regular click to extend element
      this.elementToExtend = element;
      this.performExtend(event.point);
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
      const isBoundaryElement = this.boundaryElements.includes(element);
      
      if (event.shiftKey) {
        this.addFeedback({
          type: 'preview',
          message: `Shift+click to ${isBoundaryElement ? 'remove' : 'add'} boundary element: ${element.type}`,
          position: event.point,
          color: isBoundaryElement ? '#ff8000' : '#0080ff'
        });
      } else {
        this.addFeedback({
          type: 'preview',
          message: `Click to extend ${element.type}`,
          position: event.point,
          color: '#0080ff'
        });

        // Show potential extension points
        const extensionPoints = this.findExtensionPoints(element);
        extensionPoints.forEach((point, index) => {
          this.addFeedback({
            type: 'preview',
            geometry: {
              type: 'point',
              position: point,
              size: 3
            },
            message: `Extension point ${index + 1}`,
            color: '#00ff00'
          });
        });
      }
    }

    // Show boundary elements status
    if (this.boundaryElements.length > 0) {
      this.addFeedback({
        type: 'preview',
        message: `Boundary elements: ${this.boundaryElements.length}`,
        position: new Point(event.screenPoint.x, event.screenPoint.y - 20),
        color: '#00ff00'
      });
    }
  }

  /**
   * Perform extend operation
   */
  private performExtend(clickPoint: Point): void {
    if (!this.elementToExtend || !this.activeSketch) {
      return;
    }

    try {
      // Find extension points with boundary elements
      const extensionResult = this.calculateExtension(this.elementToExtend, clickPoint);
      
      if (!extensionResult) {
        this.addFeedback({
          type: 'error',
          message: 'No valid extension found',
          position: clickPoint,
          color: '#ff0000'
        });
        return;
      }

      // Apply the extension
      this.applyExtension(this.elementToExtend, extensionResult);
      
      this.addFeedback({
        type: 'preview',
        message: `Extended ${this.elementToExtend.type}`,
        position: clickPoint,
        color: '#00ff00'
      });

    } catch (error) {
      this.addFeedback({
        type: 'error',
        message: `Extension failed: ${error}`,
        position: clickPoint,
        color: '#ff0000'
      });
    }

    this.elementToExtend = null;
  }

  /**
   * Calculate extension for an element
   */
  private calculateExtension(element: GeometryElement, clickPoint: Point): ExtensionResult | null {
    // Find which end of the element is closer to the click point
    const startPoint = element.getPointAt(0);
    const endPoint = element.getPointAt(1);
    
    const distanceToStart = clickPoint.distanceTo(startPoint);
    const distanceToEnd = clickPoint.distanceTo(endPoint);
    
    const extendFromStart = distanceToStart < distanceToEnd;
    
    // Find intersection with boundary elements
    const intersectionPoint = this.findExtensionIntersection(element, extendFromStart);
    
    if (!intersectionPoint) {
      return null;
    }

    return {
      extendFromStart,
      newEndPoint: intersectionPoint,
      originalStartPoint: startPoint,
      originalEndPoint: endPoint
    };
  }

  /**
   * Find intersection point for extension
   */
  private findExtensionIntersection(element: GeometryElement, extendFromStart: boolean): Point | null {
    if (!(element instanceof Line)) {
      return null; // Currently only support line extension
    }

    // Create extended line for intersection testing
    const direction = extendFromStart ? 
      Vector.fromPoints(element.endPoint, element.startPoint).normalize() :
      Vector.fromPoints(element.startPoint, element.endPoint).normalize();

    // Extend line by a large distance for intersection testing
    const extensionDistance = 1000;
    const extensionVector = direction.multiply(extensionDistance);
    
    const extensionStart = extendFromStart ? element.startPoint : element.endPoint;
    const extensionEnd = new Point(
      extensionStart.x + extensionVector.x,
      extensionStart.y + extensionVector.y,
      extensionStart.z + extensionVector.z
    );

    const extendedLine = new Line(extensionStart, extensionEnd);

    // Find closest intersection with boundary elements
    let closestIntersection: Point | null = null;
    let minDistance = Infinity;

    for (const boundaryElement of this.boundaryElements) {
      const intersections = this.findElementIntersections(extendedLine, boundaryElement);
      
      for (const intersection of intersections) {
        // Check if intersection is in the extension direction
        const distanceFromStart = extensionStart.distanceTo(intersection);
        
        if (distanceFromStart > 1e-6 && distanceFromStart < minDistance) {
          minDistance = distanceFromStart;
          closestIntersection = intersection;
        }
      }
    }

    return closestIntersection;
  }

  /**
   * Find intersections between two elements
   */
  private findElementIntersections(element1: GeometryElement, element2: GeometryElement): Point[] {
    // Simplified intersection calculation - same as in TrimTool
    if (element1 instanceof Line && element2 instanceof Line) {
      return this.findLineLineIntersection(element1, element2);
    }
    
    // Add more intersection types as needed
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

    // For extension, we don't limit t to [0,1] for the first line
    if (u >= 0 && u <= 1) {
      const x = p1.x + t * (p2.x - p1.x);
      const y = p1.y + t * (p2.y - p1.y);
      return [new Point(x, y, 0)];
    }

    return [];
  }

  /**
   * Apply extension to element
   */
  private applyExtension(element: GeometryElement, extensionResult: ExtensionResult): void {
    if (element instanceof Line) {
      if (extensionResult.extendFromStart) {
        element.startPoint = extensionResult.newEndPoint.clone();
      } else {
        element.endPoint = extensionResult.newEndPoint.clone();
      }
    }
    // Add support for other element types as needed
  }

  /**
   * Find all potential extension points for an element
   */
  private findExtensionPoints(element: GeometryElement): Point[] {
    const points: Point[] = [];

    // Find intersections in both directions
    const startExtension = this.findExtensionIntersection(element, true);
    const endExtension = this.findExtensionIntersection(element, false);

    if (startExtension) {
      points.push(startExtension);
    }
    
    if (endExtension) {
      points.push(endExtension);
    }

    return points;
  }

  /**
   * Handle key down event
   */
  onKeyDown(event: ToolKeyboardEvent): void {
    super.onKeyDown(event);

    if (event.key === 'b' || event.key === 'B') {
      // Clear boundary elements
      this.boundaryElements = [];
      this.addFeedback({
        type: 'preview',
        message: 'Cleared boundary elements',
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
      message: 'Extend mode: Shift+click to select boundary elements, click to extend. Press B to clear boundaries.',
      position: new Point(10, 10),
      color: '#0080ff'
    });
  }

  /**
   * Reset tool state
   */
  protected onReset(): void {
    this.boundaryElements = [];
    this.elementToExtend = null;
    this.clearFeedback();
  }

  /**
   * Get help text
   */
  getHelpText(): string {
    return 'Shift+click to select boundary elements, then click on elements to extend them to boundaries. Press B to clear boundaries.';
  }
}

/**
 * Result of extension calculation
 */
interface ExtensionResult {
  extendFromStart: boolean;
  newEndPoint: Point;
  originalStartPoint: Point;
  originalEndPoint: Point;
}