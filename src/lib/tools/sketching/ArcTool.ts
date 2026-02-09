import { Tool, ToolState, CursorType, type ToolMouseEvent, type ToolKeyboardEvent } from '../base/Tool';
import { SnapManager } from '../base/SnapManager';
import { Point } from '@/lib/geometry/core/Point';

/**
 * Tool for creating arcs
 */
export class ArcTool extends Tool {
  private snapManager: SnapManager;
  private centerPoint: Point | null = null;
  private startPoint: Point | null = null;

  private radius: number = 0;
  private startAngle: number = 0;
  private endAngle: number = 0;
  private step: 'center' | 'start' | 'end' = 'center';

  constructor() {
    super(
      'arc',
      'Arc',
      'Create arcs',
      'rotate-ccw',
      CursorType.Crosshair,
      'A'
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

    switch (this.step) {
      case 'center':
        this.centerPoint = point.clone();
        this.step = 'start';
        this.state = ToolState.InProgress;
        
        this.addFeedback({
          type: 'preview',
          message: 'Center point set. Click to set start point.',
          position: point,
          color: '#00ff00'
        });
        break;

      case 'start':
        this.startPoint = point.clone();
        this.radius = this.centerPoint!.distanceTo(point);
        this.startAngle = Math.atan2(
          point.y - this.centerPoint!.y,
          point.x - this.centerPoint!.x
        );
        this.step = 'end';
        
        this.addFeedback({
          type: 'preview',
          message: 'Start point set. Click to set end point.',
          position: point,
          color: '#00ff00'
        });
        break;

      case 'end':
        this.endAngle = Math.atan2(
          point.y - this.centerPoint!.y,
          point.x - this.centerPoint!.x
        );
        this.createArc();
        this.reset();
        break;
    }

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
   * Handle mouse move event
   */
  onMouseMove(event: ToolMouseEvent): void {
    this.clearFeedback();

    const snapResult = this.snapManager.findSnapPoint(event.point);
    const point = snapResult ? snapResult.point : event.point;

    switch (this.step) {
      case 'center':
        this.addFeedback({
          type: 'preview',
          message: 'Click to set center point',
          position: point,
          color: '#0080ff'
        });
        break;

      case 'start':
        if (this.centerPoint) {
          const radius = this.centerPoint.distanceTo(point);
          this.addFeedback({
            type: 'preview',
            message: `Radius: ${radius.toFixed(2)} - Click to set start point`,
            position: point,
            color: '#0080ff'
          });

          // Show radius circle preview
          this.addFeedback({
            type: 'preview',
            geometry: {
              type: 'circle',
              center: this.centerPoint,
              radius: radius
            },
            color: '#404040'
          });
        }
        break;

      case 'end':
        if (this.centerPoint && this.startPoint) {
          this.endAngle = Math.atan2(
            point.y - this.centerPoint.y,
            point.x - this.centerPoint.x
          );
          
          const arcLength = this.calculateArcLength();
          this.addFeedback({
            type: 'preview',
            message: `Arc length: ${arcLength.toFixed(2)} - Click to create arc`,
            position: point,
            color: '#0080ff'
          });

          this.showPreviewArc();
        }
        break;
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
   * Show preview arc
   */
  private showPreviewArc(): void {
    if (this.centerPoint && this.radius > 0) {
      this.addFeedback({
        type: 'preview',
        geometry: {
          type: 'arc',
          center: this.centerPoint,
          radius: this.radius,
          startAngle: this.startAngle,
          endAngle: this.endAngle
        },
        color: '#0080ff'
      });
    }
  }

  /**
   * Calculate arc length
   */
  private calculateArcLength(): number {
    let angle = this.endAngle - this.startAngle;
    if (angle < 0) {
      angle += 2 * Math.PI;
    }
    return this.radius * angle;
  }

  /**
   * Create arc in the sketch
   */
  private createArc(): void {
    if (!this.centerPoint || this.radius <= 0 || !this.activeSketch) {
      return;
    }

    try {
      const arc = this.activeSketch.createArc(
        this.centerPoint,
        this.radius,
        this.startAngle,
        this.endAngle
      );
      
      this.addFeedback({
        type: 'preview',
        message: `Arc created (Radius: ${this.radius.toFixed(2)}, Length: ${arc.getLength().toFixed(2)})`,
        position: this.centerPoint,
        color: '#00ff00'
      });

    } catch (error) {
      this.addFeedback({
        type: 'error',
        message: `Failed to create arc: ${error}`,
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
        if (this.step === 'end' && this.centerPoint && this.radius > 0) {
          this.createArc();
          this.reset();
          event.preventDefault();
        }
        break;

      case 'f':
      case 'F':
        // Create full circle instead of arc
        if (this.step === 'start' && this.centerPoint) {
          const radius = this.radius;
          if (radius > 0 && this.activeSketch) {
            this.activeSketch.createCircle(this.centerPoint, radius);
            this.addFeedback({
              type: 'preview',
              message: `Full circle created (Radius: ${radius.toFixed(2)})`,
              position: this.centerPoint,
              color: '#00ff00'
            });
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
      message: 'Arc tool: Click center, then start point, then end point. Press F for full circle.',
      position: new Point(10, 10),
      color: '#0080ff'
    });
  }

  /**
   * Reset tool state
   */
  protected onReset(): void {
    this.centerPoint = null;
    this.startPoint = null;

    this.radius = 0;
    this.startAngle = 0;
    this.endAngle = 0;
    this.step = 'center';
    this.clearFeedback();
  }

  /**
   * Get help text
   */
  getHelpText(): string {
    return 'Click center point, then start point, then end point to create arc. Press F for full circle, Enter to finish.';
  }
}