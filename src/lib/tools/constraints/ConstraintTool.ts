import { Tool, ToolState, CursorType, ToolMouseEvent, ToolKeyboardEvent } from '../base/Tool';
import { GeometryElement } from '@/lib/geometry/sketch/GeometryElement';
import { Constraint } from '@/lib/geometry/constraints/Constraint';
import { SelectionManager } from '../base/SelectionManager';
import { Point } from '@/lib/geometry/core/Point';

/**
 * Base class for constraint application tools
 */
export abstract class ConstraintTool extends Tool {
  protected selectionManager: SelectionManager;
  protected selectedElements: GeometryElement[];
  protected requiredElementCount: number;
  protected allowedElementTypes: string[];

  constructor(
    id: string,
    name: string,
    description: string,
    icon: string,
    requiredElementCount: number,
    allowedElementTypes: string[] = [],
    shortcut?: string
  ) {
    super(id, name, description, icon, CursorType.Crosshair, shortcut);
    this.selectionManager = new SelectionManager();
    this.selectedElements = [];
    this.requiredElementCount = requiredElementCount;
    this.allowedElementTypes = allowedElementTypes;
  }

  /**
   * Check if tool requires a sketch
   */
  requiresSketch(): boolean {
    return true;
  }

  /**
   * Set selection manager
   */
  setSelectionManager(selectionManager: SelectionManager): void {
    this.selectionManager = selectionManager;
  }

  /**
   * Handle mouse down event
   */
  onMouseDown(event: ToolMouseEvent): void {
    if (event.button !== 0) return; // Only handle left mouse button

    const elements = this.selectionManager.selectAt(event.point, event.ctrlKey);
    
    if (elements.length > 0) {
      const element = elements[0];
      
      // Check if element type is allowed
      if (this.allowedElementTypes.length > 0 && 
          !this.allowedElementTypes.includes(element.type)) {
        this.addFeedback({
          type: 'error',
          message: `Cannot apply ${this.name} to ${element.type}`,
          position: event.point,
          color: '#ff0000'
        });
        return;
      }

      // Add to selected elements if not already selected
      if (!this.selectedElements.includes(element)) {
        this.selectedElements.push(element);
        this.state = ToolState.InProgress;
        
        this.addFeedback({
          type: 'preview',
          message: `Selected ${element.type} (${this.selectedElements.length}/${this.requiredElementCount})`,
          position: event.point,
          color: '#00ff00'
        });
      }

      // Check if we have enough elements to create constraint
      if (this.selectedElements.length >= this.requiredElementCount) {
        this.createConstraint();
      }
    }
  }

  /**
   * Handle mouse move event
   */
  onMouseMove(event: ToolMouseEvent): void {
    this.clearFeedback();
    
    // Show preview of what would be selected
    const elements = this.activeSketch?.findElementsAt(event.point, 0.01) || [];
    
    if (elements.length > 0) {
      const element = elements[0];
      
      if (this.allowedElementTypes.length > 0 && 
          !this.allowedElementTypes.includes(element.type)) {
        this.addFeedback({
          type: 'error',
          message: `Cannot apply ${this.name} to ${element.type}`,
          position: event.point,
          color: '#ff0000'
        });
      } else {
        this.addFeedback({
          type: 'preview',
          message: `Click to select ${element.type}`,
          position: event.point,
          color: '#0080ff'
        });
      }
    }

    // Show current selection status
    if (this.selectedElements.length > 0) {
      this.addFeedback({
        type: 'preview',
        message: `Selected: ${this.selectedElements.length}/${this.requiredElementCount} elements`,
        position: new Point(event.screenPoint.x, event.screenPoint.y - 20),
        color: '#00ff00'
      });
    }
  }

  /**
   * Handle key down event
   */
  onKeyDown(event: ToolKeyboardEvent): void {
    super.onKeyDown(event);
    
    if (event.key === 'Enter' && this.selectedElements.length >= this.requiredElementCount) {
      this.createConstraint();
      event.preventDefault();
    }
  }

  /**
   * Create the constraint with selected elements
   */
  protected createConstraint(): void {
    if (this.selectedElements.length < this.requiredElementCount) {
      return;
    }

    try {
      const constraint = this.buildConstraint(this.selectedElements);
      
      if (constraint && this.activeSketch) {
        // Add constraint to sketch (this would be handled by constraint manager)
        this.onConstraintCreated(constraint);
        
        this.addFeedback({
          type: 'preview',
          message: `${this.name} constraint applied`,
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
   * Build the specific constraint - to be implemented by subclasses
   */
  protected abstract buildConstraint(elements: GeometryElement[]): Constraint | null;

  /**
   * Called when constraint is successfully created
   */
  protected onConstraintCreated(constraint: Constraint): void {
    // Override in subclasses if needed
    console.log(`Created constraint: ${constraint.toString()}`);
  }

  /**
   * Reset tool state
   */
  protected onReset(): void {
    this.selectedElements = [];
    this.clearFeedback();
  }

  /**
   * Cancel current operation
   */
  protected onCancel(): void {
    this.selectedElements = [];
    this.clearFeedback();
  }

  /**
   * Activate the tool
   */
  protected onActivate(): void {
    if (this.activeSketch) {
      this.selectionManager.setActiveSketch(this.activeSketch);
    }
    
    this.addFeedback({
      type: 'preview',
      message: `${this.name}: Select ${this.requiredElementCount} element(s)`,
      position: new Point(10, 10),
      color: '#0080ff'
    });
  }

  /**
   * Deactivate the tool
   */
  protected onDeactivate(): void {
    this.selectedElements = [];
    this.clearFeedback();
  }

  /**
   * Check if tool can be activated
   */
  canActivate(): boolean {
    return this.activeSketch !== undefined;
  }

  /**
   * Get help text for the tool
   */
  getHelpText(): string {
    const elementTypes = this.allowedElementTypes.length > 0 ? 
      ` (${this.allowedElementTypes.join(', ')})` : '';
    
    return `Select ${this.requiredElementCount} element(s)${elementTypes} to apply ${this.name} constraint. Press Escape to cancel.`;
  }
}