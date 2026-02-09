import { ConstraintTool } from './ConstraintTool';
import { GeometryElement } from '@/lib/geometry/sketch/GeometryElement';
import { DistanceConstraint } from '@/lib/geometry/constraints/Constraint';
import { ToolMouseEvent, ToolKeyboardEvent } from '../base/Tool';
import { Point } from '@/lib/geometry/core/Point';

/**
 * Tool for applying distance constraints with numeric input
 */
export class DistanceTool extends ConstraintTool {
  private targetDistance: number | null = null;
  private inputElement: HTMLInputElement | null = null;
  private inputPosition: Point | null = null;

  constructor() {
    super(
      'distance',
      'Distance',
      'Set distance between elements',
      'ruler',
      2, // Requires 2 elements
      ['Line', 'Circle', 'Arc'], // Works with various elements
      'D'
    );
  }

  /**
   * Handle mouse down event
   */
  onMouseDown(event: ToolMouseEvent): void {
    // If we're waiting for distance input, don't select more elements
    if (this.selectedElements.length >= this.requiredElementCount && this.targetDistance === null) {
      return;
    }

    super.onMouseDown(event);
  }

  /**
   * Create constraint after getting distance input
   */
  protected createConstraint(): void {
    if (this.selectedElements.length < this.requiredElementCount) {
      return;
    }

    if (this.targetDistance === null) {
      // Show distance input dialog
      this.showDistanceInput();
      return;
    }

    try {
      const constraint = this.buildConstraint(this.selectedElements);
      
      if (constraint && this.activeSketch) {
        this.onConstraintCreated(constraint);
        
        this.addFeedback({
          type: 'preview',
          message: `Distance constraint (${this.targetDistance}) applied`,
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
   * Show distance input dialog
   */
  private showDistanceInput(): void {
    // Calculate current distance between elements
    const currentDistance = this.calculateCurrentDistance();
    
    // Create input element
    this.inputElement = document.createElement('input');
    this.inputElement.type = 'number';
    this.inputElement.step = '0.01';
    this.inputElement.value = currentDistance.toFixed(2);
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
        this.acceptDistanceInput();
      } else if (e.key === 'Escape') {
        this.cancelDistanceInput();
      }
    });

    this.inputElement.addEventListener('blur', () => {
      this.acceptDistanceInput();
    });

    // Add to document and focus
    document.body.appendChild(this.inputElement);
    this.inputElement.focus();
    this.inputElement.select();

    this.addFeedback({
      type: 'preview',
      message: 'Enter distance value (Enter to confirm, Escape to cancel)',
      position: new Point(midpoint.x, midpoint.y - 25),
      color: '#0080ff'
    });
  }

  /**
   * Accept distance input
   */
  private acceptDistanceInput(): void {
    if (this.inputElement) {
      const value = parseFloat(this.inputElement.value);
      
      if (!isNaN(value) && value > 0) {
        this.targetDistance = value;
        this.createConstraint();
      } else {
        this.addFeedback({
          type: 'error',
          message: 'Invalid distance value',
          position: this.getConstraintMidpoint(),
          color: '#ff0000'
        });
      }

      this.removeInputElement();
    }
  }

  /**
   * Cancel distance input
   */
  private cancelDistanceInput(): void {
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
   * Calculate current distance between selected elements
   */
  private calculateCurrentDistance(): number {
    if (this.selectedElements.length < 2) {
      return 0;
    }

    const point1 = this.selectedElements[0].getPointAt(0.5);
    const point2 = this.selectedElements[1].getPointAt(0.5);
    
    return point1.distanceTo(point2);
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
   * Build distance constraint
   */
  protected buildConstraint(elements: GeometryElement[]): DistanceConstraint | null {
    if (elements.length < 2 || this.targetDistance === null) {
      return null;
    }

    const [elem1, elem2] = elements;
    return new DistanceConstraint(elem1, elem2, this.targetDistance);
  }

  /**
   * Reset tool state
   */
  protected onReset(): void {
    super.onReset();
    this.targetDistance = null;
    this.removeInputElement();
  }

  /**
   * Cancel operation
   */
  protected onCancel(): void {
    super.onCancel();
    this.targetDistance = null;
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
    return 'Select two elements to set distance constraint. Enter distance value when prompted. Press Escape to cancel.';
  }
}