import { Tool, ToolState, CursorType, type ToolMouseEvent, type ToolKeyboardEvent } from '../base/Tool';
import { GeometryElement, Line, Arc } from '@/lib/geometry/sketch/GeometryElement';
import { Point } from '@/lib/geometry/core/Point';
import { Vector } from '@/lib/geometry/core/Vector';

/**
 * Tool for creating fillets (rounded corners) between geometry elements
 */
export class FilletTool extends Tool {
  private firstElement: GeometryElement | null = null;
  private secondElement: GeometryElement | null = null;
  private radius: number = 0.5;


  constructor() {
    super(
      'fillet',
      'Fillet',
      'Create rounded corners between elements',
      'corner-down-right',
      CursorType.Crosshair,
      'F'
    );
  }

  /**
   * Check if tool requires a sketch
   */
  requiresSketch(): boolean {
    return true;
  }

  /**
   * Set fillet radius
   */
  setRadius(radius: number): void {
    this.radius = Math.max(0.001, radius);
    this.updatePreview();
  }

  /**
   * Get current fillet radius
   */
  getRadius(): number {
    return this.radius;
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
        message: 'No element found. Click on lines to create fillet.',
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
        message: 'Fillet currently supports lines only',
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
        message: `First line selected. Click second line to create fillet (R=${this.radius.toFixed(2)})`,
        position: event.point,
        color: '#00ff00'
      });
    } else if (!this.secondElement && element !== this.firstElement) {
      // Select second element and create fillet
      this.secondElement = element;
      this.createFillet(event.point);
    } else {
      // Reset and start over
      this.reset();
      this.firstElement = element;
      this.state = ToolState.InProgress;
      
      this.addFeedback({
        type: 'preview',
        message: `First line selected. Click second line to create fillet (R=${this.radius.toFixed(2)})`,
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
          message: `Click to select first line for fillet (R=${this.radius.toFixed(2)})`,
          position: event.point,
          color: '#0080ff'
        });
      } else if (element !== this.firstElement && element instanceof Line) {
        this.addFeedback({
          type: 'preview',
          message: `Click to create fillet with radius ${this.radius.toFixed(2)}`,
          position: event.point,
          color: '#0080ff'
        });

        // Show preview of fillet
        if (this.firstElement instanceof Line && element instanceof Line) {
          this.showFilletPreview(this.firstElement, element);
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
          message: 'Fillet currently supports lines only',
          position: event.point,
          color: '#ff8000'
        });
      }
    }

    // Show current state
    if (this.firstElement) {
      this.addFeedback({
        type: 'preview',
        message: `First line selected. Radius: ${this.radius.toFixed(2)}`,
        position: new Point(event.screenPoint.x, event.screenPoint.y - 20),
        color: '#00ff00'
      });
    }
  }

  /**
   * Show preview of fillet arc
   */
  private showFilletPreview(line1: Line, line2: Line): void {
    try {
      const filletResult = this.calculateFillet(line1, line2);
      
      if (filletResult) {
        this.addFeedback({
          type: 'preview',
          geometry: {
            type: 'arc',
            center: filletResult.arc.center,
            radius: filletResult.arc.radius,
            startAngle: filletResult.arc.startAngle,
            endAngle: filletResult.arc.endAngle
          },
          color: '#0080ff'
        });
      }
    } catch (error) {
      // Preview failed, don't show anything
    }
  }

  /**
   * Create fillet between two lines
   */
  private createFillet(clickPoint: Point): void {
    if (!this.firstElement || !this.secondElement || !this.activeSketch) {
      return;
    }

    try {
      const filletResult = this.calculateFillet(this.firstElement as Line, this.secondElement as Line);
      
      if (!filletResult) {
        this.addFeedback({
          type: 'error',
          message: 'Cannot create fillet - lines may be parallel or radius too large',
          position: clickPoint,
          color: '#ff0000'
        });
        return;
      }

      // Apply the fillet
      this.applyFillet(filletResult);
      
      this.addFeedback({
        type: 'preview',
        message: `Fillet created with radius ${this.radius.toFixed(2)}`,
        position: clickPoint,
        color: '#00ff00'
      });

      // Reset for next fillet
      this.reset();

    } catch (error) {
      this.addFeedback({
        type: 'error',
        message: `Fillet failed: ${error}`,
        position: clickPoint,
        color: '#ff0000'
      });
      this.reset();
    }
  }

  /**
   * Calculate fillet arc and trim points
   */
  private calculateFillet(line1: Line, line2: Line): FilletResult | null {
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

    // Calculate distance from intersection to fillet center
    const centerDistance = this.radius / Math.sin(angle / 2);

    // Calculate bisector direction
    const bisector = dir1.add(dir2).normalize();
    
    // Calculate fillet center
    const center = new Point(
      intersection.x + bisector.x * centerDistance,
      intersection.y + bisector.y * centerDistance,
      intersection.z
    );

    // Calculate tangent points on each line
    const tangent1 = this.findTangentPoint(center, line1, this.radius);
    const tangent2 = this.findTangentPoint(center, line2, this.radius);

    if (!tangent1 || !tangent2) {
      return null;
    }

    // Calculate arc angles
    const startAngle = Math.atan2(tangent1.y - center.y, tangent1.x - center.x);
    const endAngle = Math.atan2(tangent2.y - center.y, tangent2.x - center.x);

    // Create fillet arc
    const arc = new Arc(center, this.radius, startAngle, endAngle);

    return {
      arc,
      line1TrimPoint: tangent1,
      line2TrimPoint: tangent2,
      line1,
      line2
    };
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
   * Find tangent point on line from circle center
   */
  private findTangentPoint(center: Point, line: Line, radius: number): Point | null {
    // Project center onto line
    const lineDir = Vector.fromPoints(line.startPoint, line.endPoint).normalize();
    const centerToStart = Vector.fromPoints(line.startPoint, center);
    
    const projection = centerToStart.dot(lineDir);
    const projectedPoint = new Point(
      line.startPoint.x + lineDir.x * projection,
      line.startPoint.y + lineDir.y * projection,
      line.startPoint.z
    );

    // Calculate distance from center to line
    const distanceToLine = center.distanceTo(projectedPoint);
    
    if (distanceToLine < radius) {
      return null; // Line is inside the circle
    }

    // Calculate tangent point
    const tangentDistance = Math.sqrt(distanceToLine * distanceToLine - radius * radius);
    const tangentDir = Vector.fromPoints(center, projectedPoint).normalize();
    
    return new Point(
      center.x + tangentDir.x * tangentDistance,
      center.y + tangentDir.y * tangentDistance,
      center.z
    );
  }

  /**
   * Apply fillet to the sketch
   */
  private applyFillet(filletResult: FilletResult): void {
    if (!this.activeSketch) {
      return;
    }

    // Trim the original lines
    this.trimLineAtPoint(filletResult.line1, filletResult.line1TrimPoint);
    this.trimLineAtPoint(filletResult.line2, filletResult.line2TrimPoint);

    // Add the fillet arc
    this.activeSketch.addElement(filletResult.arc);
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
      this.showFilletPreview(this.firstElement, this.secondElement);
    }
  }

  /**
   * Handle key down event
   */
  onKeyDown(event: ToolKeyboardEvent): void {
    super.onKeyDown(event);

    // Allow radius adjustment with number keys
    if (event.key >= '1' && event.key <= '9') {
      const newRadius = parseFloat(event.key) * 0.1;
      this.setRadius(newRadius);
      
      this.addFeedback({
        type: 'preview',
        message: `Fillet radius set to ${this.radius.toFixed(2)}`,
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
      message: `Fillet mode: Click two lines to create rounded corner. Current radius: ${this.radius.toFixed(2)}. Press 1-9 to set radius.`,
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
    return 'Click two lines to create a fillet (rounded corner). Press 1-9 to set radius (0.1-0.9). Current radius: ' + this.radius.toFixed(2);
  }
}

/**
 * Result of fillet calculation
 */
interface FilletResult {
  arc: Arc;
  line1TrimPoint: Point;
  line2TrimPoint: Point;
  line1: Line;
  line2: Line;
}