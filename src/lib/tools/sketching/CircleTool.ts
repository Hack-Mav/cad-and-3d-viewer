import { Tool, ToolState, CursorType, type ToolMouseEvent, type ToolKeyboardEvent } from '../base/Tool';
import { SnapManager } from '../base/SnapManager';
import { Point } from '@/lib/geometry/core/Point';

/**
 * Tool for creating circles
 */
export class CircleTool extends Tool {
  private snapManager: SnapManager;
  private centerPoint: Point | null = null;

  private radius: number = 0;

  constructor() {
    super(
      'circle',
      'Circle',
      'Create circles',
      'circle',
      CursorType.Crosshair,
      'O'
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

    if (!this.centerPoint) {
      // Set center point
      this.centerPoint = point.clone();
      this.state = ToolState.InProgress;
      
      this.addFeedback({
        type: 'preview',
        message: 'Center point set. Click to set radius.',
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
      // Create circle
      this.radius = this.centerPoint.distanceTo(point);
      this.createCircle();
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

    if (!this.centerPoint) {
      // Show center point feedback
      this.addFeedback({
        type: 'preview',
        message: 'Click to set center point',
        position: point,
        color: '#0080ff'
      });
    } else {
      // Show preview circle
      this.radius = this.centerPoint.distanceTo(point);
      this.showPreviewCircle();
      
      this.addFeedback({
        type: 'preview',
        message: `Radius: ${this.radius.toFixed(2)} - Click to create circle`,
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
   * Show preview circle
   */
  private showPreviewCircle(): void {
    if (this.centerPoint && this.radius > 0) {
      this.addFeedback({
        type: 'preview',
        geometry: {
          type: 'circle',
          center: this.centerPoint,
          radius: this.radius
        },
        color: '#0080ff'
      });
    }
  }

  /**
   * Create circle in the sketch
   */
  private createCircle(): void {
    if (!this.centerPoint || this.radius <= 0 || !this.activeSketch) {
      return;
    }

    try {
      const circle = this.activeSketch.createCircle(this.centerPoint, this.radius);
      
      this.addFeedback({
        type: 'preview',
        message: `Circle created (Radius: ${this.radius.toFixed(2)}, Circumference: ${circle.getLength().toFixed(2)})`,
        position: this.centerPoint,
        color: '#00ff00'
      });

    } catch (error) {
      this.addFeedback({
        type: 'error',
        message: `Failed to create circle: ${error}`,
        position: this.centerPoint,
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
        if (this.centerPoint && this.radius > 0) {
          this.createCircle();
          this.reset();
          event.preventDefault();
        }
        break;

      // Allow radius input with number keys
      case '1':
      case '2':
      case '3':
      case '4':
      case '5':
      case '6':
      case '7':
      case '8':
      case '9':
        if (this.centerPoint) {
          this.radius = parseFloat(event.key);
          this.showPreviewCircle();
          
          this.addFeedback({
            type: 'preview',
            message: `Radius set to ${this.radius.toFixed(2)} - Press Enter to create or click to adjust`,
            position: this.centerPoint,
            color: '#00ff00'
          });
          
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
      message: 'Circle tool: Click to set center point, then click to set radius. Press 1-9 to set specific radius.',
      position: new Point(10, 10),
      color: '#0080ff'
    });
  }

  /**
   * Reset tool state
   */
  protected onReset(): void {
    this.centerPoint = null;

    this.radius = 0;
    this.clearFeedback();
  }

  /**
   * Get help text
   */
  getHelpText(): string {
    return 'Click to set center point, then click to set radius. Press 1-9 to set specific radius, Enter to create circle.';
  }
}