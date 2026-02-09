import { Tool, ToolState, CursorType, type ToolMouseEvent, type ToolKeyboardEvent } from '../base/Tool';
import { GeometryElement, Line } from '@/lib/geometry/sketch/GeometryElement';
import { Point } from '@/lib/geometry/core/Point';
import { Vector } from '@/lib/geometry/core/Vector';

/**
 * Tool for creating chamfers (angled corners) between geometry elements
 */
export class ChamferTool extends Tool {
  private firstElement: GeometryElement | null = null;
  private secondElement: GeometryElement | null = null;
  private distance: number = 0.5;


  constructor() {
    super(
      'chamfer',
      'Chamfer',
      'Create angled corners between elements',
      'corner-up-right',
      CursorType.Crosshair,
      'C'
    );
  }

  /**
   * Check if tool requires a sketch
   */
  requiresSketch(): boolean {
    return true;
  }

  /**
   * Set chamfer distance
   */
  setDistance(distance: number): void {
    this.distance = Math.max(0.001, distance);
    this.updatePreview();
  }

  /**
   * Get current chamfer distance
   */
  getDistance(): number {
    return this.distance;
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
        message: 'No element found. Click on lines to create chamfer.',
        position: event.point,
        color: '#ff0000'
      });
      return;
    }

    const element = elements[0];

    // Only support lines for now
    if (!(element instanceof Line)) {
      this.addFeedback({
        type: 'error',
        message: 'Chamfer currently supports lines only',
        position: event.point,
        color: '#ff0000'
      });
      return;
    }

    if (!this.firstElement) {
      // Select first element
      this.firstElement = element;
      this.state = ToolState.InProgress;
      
      this.addFeedback({
        type: 'preview',
        message: `First line selected. Click second line to create chamfer (D=${this.distance.toFixed(2)})`,
        position: event.point,
        color: '#00ff00'
      });
    } else if (!this.secondElement && element !== this.firstElement) {
      // Select second element and create chamfer
      this.secondElement = element;
      this.createChamfer(event.point);
    } else {
      // Reset and start over
      this.reset();
      this.firstElement = element;
      this.state = ToolState.InProgress;
      
      this.addFeedback({
        type: 'preview',
        message: `First line selected. Click second line to create chamfer (D=${this.distance.toFixed(2)})`,
        position: event.point,
        color: '#00ff00'
      });
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
      
      if (!this.firstElement) {
        this.addFeedback({
          type: 'preview',
          message: `Click to select first line for chamfer (D=${this.distance.toFixed(2)})`,
          position: event.point,
          color: '#0080ff'
        });
      } else if (element !== this.firstElement && element instanceof Line) {
        this.addFeedback({
          type: 'preview',
          message: `Click to create chamfer with distance ${this.distance.toFixed(2)}`,
          position: event.point,
          color: '#0080ff'
        });

        // Show preview of chamfer
        if (this.firstElement instanceof Line && element instanceof Line) {
          this.showChamferPreview(this.firstElement, element);
        }
      } else if (element === this.firstElement) {
        this.addFeedback({
          type: 'preview',
          message: 'Same line selected. Choose a different line.',
          position: event.point,
          color: '#ff8000'
        });
      } else {
        this.addFeedback({
          type: 'preview',
          message: 'Chamfer currently supports lines only',
          position: event.point,
          color: '#ff8000'
        });
      }
    }

    // Show current state
    if (this.firstElement) {
      this.addFeedback({
        type: 'preview',
        message: `First line selected. Distance: ${this.distance.toFixed(2)}`,
        position: new Point(event.screenPoint.x, event.screenPoint.y - 20),
        color: '#00ff00'
      });
    }
  }

  /**
   * Show preview of chamfer line
   */
  private showChamferPreview(line1: Line, line2: Line): void {
    try {
      const chamferResult = this.calculateChamfer(line1, line2);
      
      if (chamferResult) {
        this.addFeedback({
          type: 'preview',
          geometry: {
            type: 'line',
            start: chamferResult.chamferLine.startPoint,
            end: chamferResult.chamferLine.endPoint
          },
          color: '#0080ff'
        });
      }
    } catch (error) {
      // Preview failed, don't show anything
    }
  }

  /**
   * Create chamfer between two lines
   */
  private createChamfer(clickPoint: Point): void {
    if (!this.firstElement || !this.secondElement || !this.activeSketch) {
      return;
    }

    try {
      const chamferResult = this.calculateChamfer(this.firstElement as Line, this.secondElement as Line);
      
      if (!chamferResult) {
        this.addFeedback({
          type: 'error',
          message: 'Cannot create chamfer - lines may be parallel or distance too large',
          position: clickPoint,
          color: '#ff0000'
        });
        return;
      }

      // Apply the chamfer
      this.applyChamfer(chamferResult);
      
      this.addFeedback({
        type: 'preview',
        message: `Chamfer created with distance ${this.distance.toFixed(2)}`,
        position: clickPoint,
        color: '#00ff00'
      });

      // Reset for next chamfer
      this.reset();

    } catch (error) {
      this.addFeedback({
        type: 'error',
        message: `Chamfer failed: ${error}`,
        position: clickPoint,
        color: '#ff0000'
      });
      this.reset();
    }
  }

  /**
   * Calculate chamfer line and trim points
   */
  private calculateChamfer(line1: Line, line2: Line): ChamferResult | null {
    // Find intersection point of the two lines (extended if necessary)
    const intersection = this.findLineIntersection(line1, line2, true);
    
    if (!intersection) {
      return null; // Lines are parallel
    }

    // Calculate direction vectors
    const dir1 = Vector.fromPoints(line1.startPoint, line1.endPoint).normalize();
    const dir2 = Vector.fromPoints(line2.startPoint, line2.endPoint).normalize();

    // Calculate angle between lines
    const angle = Math.acos(Math.max(-1, Math.min(1, dir1.dot(dir2))));
    
    if (Math.abs(angle) < 1e-6 || Math.abs(angle - Math.PI) < 1e-6) {
      return null; // Lines are parallel or collinear
    }

    // Calculate chamfer points on each line
    // Move distance away from intersection along each line
    const chamferPoint1 = new Point(
      intersection.x - dir1.x * this.distance,
      intersection.y - dir1.y * this.distance,
      intersection.z
    );

    const chamferPoint2 = new Point(
      intersection.x - dir2.x * this.distance,
      intersection.y - dir2.y * this.distance,
      intersection.z
    );

    // Verify points are within line segments (or close enough)
    if (!this.isPointOnLineSegment(chamferPoint1, line1, this.distance * 2) ||
        !this.isPointOnLineSegment(chamferPoint2, line2, this.distance * 2)) {
      return null; // Chamfer distance too large for line segments
    }

    // Create chamfer line
    const chamferLine = new Line(chamferPoint1, chamferPoint2);

    return {
      chamferLine,
      line1TrimPoint: chamferPoint1,
      line2TrimPoint: chamferPoint2,
      line1,
      line2
    };
  }

  /**
   * Check if point is on or near line segment
   */
  private isPointOnLineSegment(point: Point, line: Line, tolerance: number): boolean {
    const lineLength = line.startPoint.distanceTo(line.endPoint);
    const distanceToStart = line.startPoint.distanceTo(point);
    const distanceToEnd = line.endPoint.distanceTo(point);
    
    // Point should be within the line segment (with some tolerance for extension)
    return distanceToStart <= lineLength + tolerance && distanceToEnd <= lineLength + tolerance;
  }

  /**
   * Find intersection between two lines (optionally extended)
   */
  private findLineIntersection(line1: Line, line2: Line, extend: boolean = false): Point | null {
    const p1 = line1.startPoint;
    const p2 = line1.endPoint;
    const p3 = line2.startPoint;
    const p4 = line2.endPoint;

    const denom = (p1.x - p2.x) * (p3.y - p4.y) - (p1.y - p2.y) * (p3.x - p4.x);
    
    if (Math.abs(denom) < 1e-10) {
      return null; // Lines are parallel
    }

    const t = ((p1.x - p3.x) * (p3.y - p4.y) - (p1.y - p3.y) * (p3.x - p4.x)) / denom;
    const u = -((p1.x - p2.x) * (p1.y - p3.y) - (p1.y - p2.y) * (p1.x - p3.x)) / denom;

    if (!extend && (t < 0 || t > 1 || u < 0 || u > 1)) {
      return null; // Intersection outside line segments
    }

    const x = p1.x + t * (p2.x - p1.x);
    const y = p1.y + t * (p2.y - p1.y);
    return new Point(x, y, 0);
  }

  /**
   * Apply chamfer to the sketch
   */
  private applyChamfer(chamferResult: ChamferResult): void {
    if (!this.activeSketch) {
      return;
    }

    // Trim the original lines
    this.trimLineAtPoint(chamferResult.line1, chamferResult.line1TrimPoint);
    this.trimLineAtPoint(chamferResult.line2, chamferResult.line2TrimPoint);

    // Add the chamfer line
    this.activeSketch.addElement(chamferResult.chamferLine);
  }

  /**
   * Trim line at specified point
   */
  private trimLineAtPoint(line: Line, trimPoint: Point): void {
    // Determine which end to trim based on which is closer to the trim point
    const distanceToStart = line.startPoint.distanceTo(trimPoint);
    const distanceToEnd = line.endPoint.distanceTo(trimPoint);

    if (distanceToStart < distanceToEnd) {
      // Trim from start
      line.startPoint = trimPoint.clone();
    } else {
      // Trim from end
      line.endPoint = trimPoint.clone();
    }
  }

  /**
   * Update preview based on current settings
   */
  private updatePreview(): void {
    if (this.firstElement instanceof Line && this.secondElement instanceof Line) {
      this.showChamferPreview(this.firstElement, this.secondElement);
    }
  }

  /**
   * Handle key down event
   */
  onKeyDown(event: ToolKeyboardEvent): void {
    super.onKeyDown(event);

    // Allow distance adjustment with number keys
    if (event.key >= '1' && event.key <= '9') {
      const newDistance = parseFloat(event.key) * 0.1;
      this.setDistance(newDistance);
      
      this.addFeedback({
        type: 'preview',
        message: `Chamfer distance set to ${this.distance.toFixed(2)}`,
        position: new Point(0, 0),
        color: '#00ff00'
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
      message: `Chamfer mode: Click two lines to create angled corner. Current distance: ${this.distance.toFixed(2)}. Press 1-9 to set distance.`,
      position: new Point(10, 10),
      color: '#0080ff'
    });
  }

  /**
   * Reset tool state
   */
  protected onReset(): void {
    this.firstElement = null;
    this.secondElement = null;

    this.clearFeedback();
  }

  /**
   * Get help text
   */
  getHelpText(): string {
    return 'Click two lines to create a chamfer (angled corner). Press 1-9 to set distance (0.1-0.9). Current distance: ' + this.distance.toFixed(2);
  }
}

/**
 * Result of chamfer calculation
 */
interface ChamferResult {
  chamferLine: Line;
  line1TrimPoint: Point;
  line2TrimPoint: Point;
  line1: Line;
  line2: Line;
}