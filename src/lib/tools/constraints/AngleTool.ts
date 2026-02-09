import { ConstraintTool } from './ConstraintTool';
import { GeometryElement } from '@/lib/geometry/sketch/GeometryElement';
import { Constraint } from '@/lib/geometry/constraints/Constraint';
import { ToolMouseEvent } from '../base/Tool';
import { Point } from '@/lib/geometry/core/Point';
import { Vector } from '@/lib/geometry/core/Vector';

/**
 * Angle constraint between two lines
 */
export class AngleConstraint extends Constraint {
  public targetAngle: number; // in degrees

  constructor(line1: GeometryElement, line2: GeometryElement, angle: number, id?: string) {
    super('Angle', [line1, line2], id);
    this.targetAngle = angle;
  }

  calculateError(): number {
    const [line1, line2] = this.elements;
    
    if (line1.type !== 'Line' || line2.type !== 'Line') {
      return Infinity;
    }

    const points1 = line1.getControlPoints();
    const points2 = line2.getControlPoints();
    
    const dir1 = Vector.fromPoints(points1[0], points1[1]).normalize();
    const dir2 = Vector.fromPoints(points2[0], points2[1]).normalize();
    
    const dot = dir1.dot(dir2);
    const currentAngle = Math.acos(Math.max(-1, Math.min(1, dot))) * 180 / Math.PI;
    
    return Math.abs(currentAngle - this.targetAngle);
  }

  calculateGradient(): number[] {
    return [0, 0, 0, 0];
  }

  getVisualizationData() {
    const midpoint1 = this.elements[0].getPointAt(0.5);
    const midpoint2 = this.elements[1].getPointAt(0.5);
    const position = new Point(
      (midpoint1.x + midpoint2.x) / 2,
      (midpoint1.y + midpoint2.y) / 2,
      (midpoint1.z + midpoint2.z) / 2
    );

    return {
      type: 'angle',
      position,
      symbol: `${this.targetAngle}°`,
      color: this.status === 'satisfied' ? '#00ff00' : '#ff0000',
      size: 10
    };
  }

  clone(): AngleConstraint {
    return new AngleConstraint(this.elements[0], this.elements[1], this.targetAngle, this.id);
  }
}

/**
 * Tool for applying angle constraints between lines
 */
export class AngleTool extends ConstraintTool {
  private targetAngle: number | null = null;
  private inputElement: HTMLInputElement | null = null;

  constructor() {
    super(
      'angle',
      'Angle',
      'Set angle between two lines',
      'angle',
      2, // Requires 2 elements
      ['Line'], // Only works with lines
      'A'
    );
  }

  /**
   * Handle mouse down event
   */
  onMouseDown(event: ToolMouseEvent): void {
    // If we're waiting for angle input, don't select more elements
    if (this.selectedElements.length >= this.requiredElementCount && this.targetAngle === null) {
      return;
    }

    super.onMouseDown(event);
  }

  /**
   * Create constraint after getting angle input
   */
  protected createConstraint(): void {
    if (this.selectedElements.length < this.requiredElementCount) {
      return;
    }

    if (this.targetAngle === null) {
      // Show angle input dialog
      this.showAngleInput();
      return;
    }

    try {
      const constraint = this.buildConstraint(this.selectedElements);
      
      if (constraint && this.activeSketch) {
        this.onConstraintCreated(constraint);
        
        this.addFeedback({
          type: 'preview',
          message: `Angle constraint (${this.targetAngle}°) applied`,
          position: constraint.getVisualizationData().position,
          color: '#00ff00'
        });

        // Reset for next constraint
        this.reset();
      }
    } catch (error) {
      this.addFeedback({
        type: 'error',
        message: `Failed to create constraint: ${error}`,
        position: new Point(0, 0),
        color: '#ff0000'
      });
    }
  }

  /**
   * Show angle input dialog
   */
  private showAngleInput(): void {
    // Calculate current angle between lines
    const currentAngle = this.calculateCurrentAngle();
    
    // Create input element
    this.inputElement = document.createElement('input');
    this.inputElement.type = 'number';
    this.inputElement.step = '0.1';
    this.inputElement.min = '0';
    this.inputElement.max = '180';
    this.inputElement.value = currentAngle.toFixed(1);
    this.inputElement.style.position = 'absolute';
    this.inputElement.style.zIndex = '1000';
    this.inputElement.style.padding = '4px';
    this.inputElement.style.border = '1px solid #ccc';
    this.inputElement.style.borderRadius = '4px';
    this.inputElement.style.fontSize = '12px';
    
    // Position near the constraint location
    const midpoint = this.getConstraintMidpoint();
    this.inputElement.style.left = `${midpoint.x}px`;
    this.inputElement.style.top = `${midpoint.y}px`;

    // Add event listeners
    this.inputElement.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        this.acceptAngleInput();
      } else if (e.key === 'Escape') {
        this.cancelAngleInput();
      }
    });

    this.inputElement.addEventListener('blur', () => {
      this.acceptAngleInput();
    });

    // Add to document and focus
    document.body.appendChild(this.inputElement);
    this.inputElement.focus();
    this.inputElement.select();

    this.addFeedback({
      type: 'preview',
      message: 'Enter angle in degrees (Enter to confirm, Escape to cancel)',
      position: new Point(midpoint.x, midpoint.y - 25),
      color: '#0080ff'
    });
  }

  /**
   * Accept angle input
   */
  private acceptAngleInput(): void {
    if (this.inputElement) {
      const value = parseFloat(this.inputElement.value);
      
      if (!isNaN(value) && value >= 0 && value <= 180) {
        this.targetAngle = value;
        this.createConstraint();
      } else {
        this.addFeedback({
          type: 'error',
          message: 'Invalid angle value (0-180 degrees)',
          position: this.getConstraintMidpoint(),
          color: '#ff0000'
        });
      }

      this.removeInputElement();
    }
  }

  /**
   * Cancel angle input
   */
  private cancelAngleInput(): void {
    this.removeInputElement();
    this.reset();
  }

  /**
   * Remove input element
   */
  private removeInputElement(): void {
    if (this.inputElement && this.inputElement.parentNode) {
      this.inputElement.parentNode.removeChild(this.inputElement);
      this.inputElement = null;
    }
  }

  /**
   * Calculate current angle between selected lines
   */
  private calculateCurrentAngle(): number {
    if (this.selectedElements.length < 2) {
      return 0;
    }

    const [line1, line2] = this.selectedElements;
    const points1 = line1.getControlPoints();
    const points2 = line2.getControlPoints();
    
    const dir1 = Vector.fromPoints(points1[0], points1[1]).normalize();
    const dir2 = Vector.fromPoints(points2[0], points2[1]).normalize();
    
    const dot = dir1.dot(dir2);
    return Math.acos(Math.max(-1, Math.min(1, dot))) * 180 / Math.PI;
  }

  /**
   * Get midpoint for constraint visualization
   */
  private getConstraintMidpoint(): Point {
    if (this.selectedElements.length < 2) {
      return new Point(0, 0);
    }

    const point1 = this.selectedElements[0].getPointAt(0.5);
    const point2 = this.selectedElements[1].getPointAt(0.5);
    
    return new Point(
      (point1.x + point2.x) / 2,
      (point1.y + point2.y) / 2,
      (point1.z + point2.z) / 2
    );
  }

  /**
   * Build angle constraint
   */
  protected buildConstraint(elements: GeometryElement[]): AngleConstraint | null {
    if (elements.length < 2 || this.targetAngle === null) {
      return null;
    }

    const [line1, line2] = elements;
    
    if (line1.type !== 'Line' || line2.type !== 'Line') {
      throw new Error('Angle constraint requires two lines');
    }

    return new AngleConstraint(line1, line2, this.targetAngle);
  }

  /**
   * Reset tool state
   */
  protected onReset(): void {
    super.onReset();
    this.targetAngle = null;
    this.removeInputElement();
  }

  /**
   * Cancel operation
   */
  protected onCancel(): void {
    super.onCancel();
    this.targetAngle = null;
    this.removeInputElement();
  }

  /**
   * Deactivate tool
   */
  protected onDeactivate(): void {
    super.onDeactivate();
    this.removeInputElement();
  }

  /**
   * Get help text
   */
  getHelpText(): string {
    return 'Select two lines to set angle constraint. Enter angle value when prompted. Press Escape to cancel.';
  }
}