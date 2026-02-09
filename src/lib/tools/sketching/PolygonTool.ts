import { Tool, ToolState, CursorType, type ToolMouseEvent, type ToolKeyboardEvent } from '../base/Tool';
import { SnapManager } from '../base/SnapManager';
import { Point } from '@/lib/geometry/core/Point';

/**
 * Tool for creating polygons
 */
export class PolygonTool extends Tool {
  private snapManager: SnapManager;
  private points: Point[] = [];
  private currentPoint: Point | null = null;
  private isClosing: boolean = false;

  constructor() {
    super(
      'polygon',
      'Polygon',
      'Create polygons',
      'hexagon',
      CursorType.Crosshair,
      'P'
    );
    
    this.snapManager = new SnapManager();
  }

  /**
   * Set snap manager
   */
  setSnapManager(snapManager: SnapManager): void {
    this.snapManager = snapManager;
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

    const snapResult = this.snapManager.findSnapPoint(event.point);
    const point = snapResult ? snapResult.point : event.point;

    // Check if clicking near the first point to close polygon
    if (this.points.length >= 3) {
      const distanceToFirst = point.distanceTo(this.points[0]);
      if (distanceToFirst < 0.1) { // Close tolerance
        this.closePolygon();
        return;
      }
    }

    // Add point to polygon
    this.points.push(point.clone());
    this.state = ToolState.InProgress;

    this.addFeedback({
      type: 'preview',
      message: `Point ${this.points.length} added. ${this.points.length >= 3 ? 'Click first point to close, ' : ''}Double-click to finish.`,
      position: point,
      color: '#00ff00'
    });

    if (snapResult) {
      this.addFeedback({
        type: 'snap',
        message: snapResult.message,
        position: snapResult.point,
        color: '#ff8000'
      });
    }

    // Create line segment if we have at least 2 points
    if (this.points.length >= 2) {
      this.createLineSegment(this.points[this.points.length - 2], this.points[this.points.length - 1]);
    }
  }

  /**
   * Handle mouse double-click event
   */
  onMouseDoubleClick(event: ToolMouseEvent): void {
    if (this.points.length >= 3) {
      this.finishPolygon();
    } else if (this.points.length >= 2) {
      // Finish as open polyline
      this.addFeedback({
        type: 'preview',
        message: `Polyline finished with ${this.points.length} points`,
        position: event.point,
        color: '#00ff00'
      });
      this.reset();
    }
  }

  /**
   * Handle mouse move event
   */
  onMouseMove(event: ToolMouseEvent): void {
    this.clearFeedback();

    const snapResult = this.snapManager.findSnapPoint(event.point);
    const point = snapResult ? snapResult.point : event.point;
    this.currentPoint = point.clone();

    if (this.points.length === 0) {
      this.addFeedback({
        type: 'preview',
        message: 'Click to start polygon',
        position: point,
        color: '#0080ff'
      });
    } else {
      // Show preview line to current point
      this.showPreviewLines();
      
      // Check if near first point for closing
      if (this.points.length >= 3) {
        const distanceToFirst = point.distanceTo(this.points[0]);
        if (distanceToFirst < 0.1) {
          this.isClosing = true;
          this.addFeedback({
            type: 'preview',
            message: 'Click to close polygon',
            position: this.points[0],
            color: '#00ff00'
          });
        } else {
          this.isClosing = false;
          this.addFeedback({
            type: 'preview',
            message: `Point ${this.points.length + 1} - Click to add, double-click to finish`,
            position: point,
            color: '#0080ff'
          });
        }
      } else {
        this.addFeedback({
          type: 'preview',
          message: `Point ${this.points.length + 1} - Click to add`,
          position: point,
          color: '#0080ff'
        });
      }
    }

    // Show snap feedback
    if (snapResult) {
      this.addFeedback({
        type: 'snap',
        message: snapResult.message,
        position: snapResult.point,
        color: '#ff8000'
      });
    }

    // Show polygon info
    if (this.points.length > 0) {
      const perimeter = this.calculatePerimeter();
      this.addFeedback({
        type: 'preview',
        message: `Points: ${this.points.length}, Perimeter: ${perimeter.toFixed(2)}`,
        position: new Point(event.screenPoint.x, event.screenPoint.y - 20),
        color: '#808080'
      });
    }
  }

  /**
   * Show preview lines
   */
  private showPreviewLines(): void {
    if (this.points.length > 0 && this.currentPoint) {
      // Line from last point to current
      this.addFeedback({
        type: 'preview',
        geometry: {
          type: 'line',
          start: this.points[this.points.length - 1],
          end: this.currentPoint
        },
        color: '#0080ff'
      });

      // Closing line if near first point
      if (this.isClosing && this.points.length >= 3) {
        this.addFeedback({
          type: 'preview',
          geometry: {
            type: 'line',
            start: this.currentPoint,
            end: this.points[0]
          },
          color: '#00ff00'
        });
      }
    }

    // Show all existing points
    this.points.forEach((point, index) => {
      this.addFeedback({
        type: 'preview',
        geometry: {
          type: 'point',
          position: point,
          size: index === 0 ? 5 : 3
        },
        message: index === 0 ? 'Start' : `${index + 1}`,
        color: index === 0 ? '#00ff00' : '#0080ff'
      });
    });
  }

  /**
   * Calculate perimeter of current polygon
   */
  private calculatePerimeter(): number {
    if (this.points.length < 2) return 0;

    let perimeter = 0;
    for (let i = 0; i < this.points.length - 1; i++) {
      perimeter += this.points[i].distanceTo(this.points[i + 1]);
    }

    // Add current preview line
    if (this.currentPoint) {
      perimeter += this.points[this.points.length - 1].distanceTo(this.currentPoint);
    }

    return perimeter;
  }

  /**
   * Create line segment in sketch
   */
  private createLineSegment(start: Point, end: Point): void {
    if (!this.activeSketch) return;

    try {
      this.activeSketch.createLine(start, end);
    } catch (error) {
      this.addFeedback({
        type: 'error',
        message: `Failed to create line segment: ${error}`,
        position: end,
        color: '#ff0000'
      });
    }
  }

  /**
   * Close polygon by connecting last point to first
   */
  private closePolygon(): void {
    if (this.points.length >= 3 && this.activeSketch) {
      try {
        // Create closing line
        this.activeSketch.createLine(
          this.points[this.points.length - 1],
          this.points[0]
        );

        this.addFeedback({
          type: 'preview',
          message: `Polygon closed with ${this.points.length} sides`,
          position: this.points[0],
          color: '#00ff00'
        });

        this.reset();
      } catch (error) {
        this.addFeedback({
          type: 'error',
          message: `Failed to close polygon: ${error}`,
          position: this.points[0],
          color: '#ff0000'
        });
      }
    }
  }

  /**
   * Finish polygon without closing
   */
  private finishPolygon(): void {
    this.addFeedback({
      type: 'preview',
      message: `Polyline finished with ${this.points.length} points`,
      position: this.points[this.points.length - 1],
      color: '#00ff00'
    });
    this.reset();
  }

  /**
   * Handle key down event
   */
  onKeyDown(event: ToolKeyboardEvent): void {
    super.onKeyDown(event);

    switch (event.key) {
      case 'Enter':
        if (this.points.length >= 2) {
          this.finishPolygon();
          event.preventDefault();
        }
        break;

      case 'c':
      case 'C':
        if (this.points.length >= 3) {
          this.closePolygon();
          event.preventDefault();
        }
        break;

      case 'Backspace':
        if (this.points.length > 0) {
          // Remove last point
          this.points.pop();
          
          this.addFeedback({
            type: 'preview',
            message: `Last point removed. ${this.points.length} points remaining.`,
            position: new Point(0, 0),
            color: '#ff8000'
          });
          
          if (this.points.length === 0) {
            this.reset();
          }
          event.preventDefault();
        }
        break;
    }
  }

  /**
   * Activate the tool
   */
  protected onActivate(): void {
    if (this.activeSketch) {
      this.snapManager.setActiveSketch(this.activeSketch);
    }

    this.addFeedback({
      type: 'preview',
      message: 'Polygon tool: Click to add points, double-click to finish, C to close, Backspace to remove last point.',
      position: new Point(10, 10),
      color: '#0080ff'
    });
  }

  /**
   * Reset tool state
   */
  protected onReset(): void {
    this.points = [];
    this.currentPoint = null;
    this.isClosing = false;
    this.clearFeedback();
  }

  /**
   * Get help text
   */
  getHelpText(): string {
    return 'Click to add points to polygon. Double-click to finish, C to close, Backspace to remove last point.';
  }
}