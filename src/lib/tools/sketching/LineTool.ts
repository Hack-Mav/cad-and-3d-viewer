import { Tool, ToolState, CursorType, type ToolMouseEvent, type ToolKeyboardEvent } from '../base/Tool';
import { SnapManager } from '../base/SnapManager';
import { Line } from '@/lib/geometry/sketch/GeometryElement';
import { Point } from '@/lib/geometry/core/Point';

/**
 * Tool for creating line segments
 */
export class LineTool extends Tool {
  private snapManager: SnapManager;
  private startPoint: Point | null = null;
  private currentPoint: Point | null = null;


  constructor() {
    super(
      'line',
      'Line',
      'Create line segments',
      'minus',
      CursorType.Crosshair,
      'L'
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

    if (!this.startPoint) {
      // Set start point
      this.startPoint = point.clone();
      this.state = ToolState.InProgress;
      
      this.addFeedback({
        type: 'preview',
        message: 'Start point set. Click to set end point.',
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
    } else {
      // Create line
      this.createLine(point);
      
      if (event.shiftKey) {
        // Continue creating lines (chain mode)
        this.startPoint = point.clone();
        this.addFeedback({
          type: 'preview',
          message: 'Line created. Click to continue chain or Escape to finish.',
          position: point,
          color: '#00ff00'
        });
      } else {
        // Finish line creation
        this.reset();
      }
    }
  }

  /**
   * Handle mouse move event
   */
  onMouseMove(event: ToolMouseEvent): void {
    this.clearFeedback();

    const snapResult = this.snapManager.findSnapPoint(event.point);
    const point = snapResult ? snapResult.point : event.point;

    if (!this.startPoint) {
      // Show start point feedback
      this.addFeedback({
        type: 'preview',
        message: 'Click to set start point',
        position: point,
        color: '#0080ff'
      });
    } else {
      // Show preview line
      this.currentPoint = point.clone();
      this.showPreviewLine();
      
      const length = this.startPoint.distanceTo(point);
      this.addFeedback({
        type: 'preview',
        message: `Length: ${length.toFixed(2)} - Click to create line, Shift+click to chain`,
        position: point,
        color: '#0080ff'
      });
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
  }

  /**
   * Show preview line
   */
  private showPreviewLine(): void {
    if (this.startPoint && this.currentPoint) {
      this.addFeedback({
        type: 'preview',
        geometry: {
          type: 'line',
          start: this.startPoint,
          end: this.currentPoint
        },
        color: '#0080ff'
      });
    }
  }

  /**
   * Create line in the sketch
   */
  private createLine(endPoint: Point): void {
    if (!this.startPoint || !this.activeSketch) {
      return;
    }

    try {
      const line = this.activeSketch.createLine(this.startPoint, endPoint);
      
      this.addFeedback({
        type: 'preview',
        message: `Line created (Length: ${line.getLength().toFixed(2)})`,
        position: endPoint,
        color: '#00ff00'
      });

    } catch (error) {
      this.addFeedback({
        type: 'error',
        message: `Failed to create line: ${error}`,
        position: endPoint,
        color: '#ff0000'
      });
    }
  }

  /**
   * Handle key down event
   */
  onKeyDown(event: ToolKeyboardEvent): void {
    super.onKeyDown(event);

    switch (event.key) {
      case 'Enter':
        if (this.startPoint && this.currentPoint) {
          this.createLine(this.currentPoint);
          this.reset();
          event.preventDefault();
        }
        break;

      case 'c':
      case 'C':
        if (this.startPoint && this.currentPoint) {
          // Close the shape by connecting to start point
          this.createLine(this.startPoint);
          this.reset();
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
      message: 'Line tool: Click to set start point, then click to set end point. Shift+click to chain lines, C to close shape.',
      position: new Point(10, 10),
      color: '#0080ff'
    });
  }

  /**
   * Reset tool state
   */
  protected onReset(): void {
    this.startPoint = null;
    this.currentPoint = null;

    this.clearFeedback();
  }

  /**
   * Get help text
   */
  getHelpText(): string {
    return 'Click to set start point, then click to set end point. Shift+click to chain lines, C to close shape, Enter to finish.';
  }
}