import { Tool, ToolState, CursorType, type ToolMouseEvent, type ToolKeyboardEvent } from '../base/Tool';
import { SelectionManager } from '../base/SelectionManager';
import { GeometryElement } from '@/lib/geometry/sketch/GeometryElement';
import { Point } from '@/lib/geometry/core/Point';
import { Vector } from '@/lib/geometry/core/Vector';

/**
 * Tool for moving geometry elements with drag-and-drop
 */
export class MoveTool extends Tool {
  private selectionManager: SelectionManager;
  private isDragging: boolean = false;
  private dragStartPoint: Point | null = null;
  private elementsToMove: GeometryElement[] = [];
  private originalPositions: Map<string, Point[]> = new Map();

  constructor() {
    super(
      'move',
      'Move',
      'Move selected geometry elements',
      'move',
      CursorType.Move,
      'M'
    );
    
    this.selectionManager = new SelectionManager();
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

    // Get selected elements or select element at point
    let elementsToMove = this.selectionManager.getSelectedElements();
    
    if (elementsToMove.length === 0) {
      // No selection, try to select element at point
      const elements = this.selectionManager.selectAt(event.point, false);
      elementsToMove = elements;
    }

    if (elementsToMove.length === 0) {
      this.addFeedback({
        type: 'error',
        message: 'No elements to move. Select elements first.',
        position: event.point,
        color: '#ff0000'
      });
      return;
    }

    // Start drag operation
    this.isDragging = true;
    this.dragStartPoint = event.point.clone();
    this.elementsToMove = [...elementsToMove];
    this.state = ToolState.InProgress;

    // Store original positions for undo/preview
    this.originalPositions.clear();
    this.elementsToMove.forEach(element => {
      this.originalPositions.set(element.id, element.getControlPoints());
    });

    this.addFeedback({
      type: 'preview',
      message: `Moving ${this.elementsToMove.length} element(s)`,
      position: event.point,
      color: '#00ff00'
    });
  }

  /**
   * Handle mouse move event
   */
  onMouseMove(event: ToolMouseEvent): void {
    this.clearFeedback();

    if (this.isDragging && this.dragStartPoint) {
      // Calculate movement vector
      const moveVector = Vector.fromPoints(this.dragStartPoint, event.point);
      
      // Preview movement
      this.previewMovement(moveVector);
      
      this.addFeedback({
        type: 'preview',
        message: `Moving: Δx=${moveVector.x.toFixed(2)}, Δy=${moveVector.y.toFixed(2)}`,
        position: event.point,
        color: '#0080ff'
      });
    } else {
      // Show hover feedback
      const elements = this.activeSketch?.findElementsAt(event.point, 0.01) || [];
      
      if (elements.length > 0) {
        const element = elements[0];
        const isSelected = this.selectionManager.isSelected(element);
        
        this.addFeedback({
          type: 'preview',
          message: `${element.type}${isSelected ? ' (selected)' : ''} - Click to move`,
          position: event.point,
          color: isSelected ? '#00ff00' : '#0080ff'
        });
      } else {
        this.addFeedback({
          type: 'preview',
          message: 'Click and drag to move elements',
          position: event.point,
          color: '#808080'
        });
      }
    }
  }

  /**
   * Handle mouse up event
   */
  onMouseUp(event: ToolMouseEvent): void {
    if (this.isDragging && this.dragStartPoint) {
      // Calculate final movement vector
      const moveVector = Vector.fromPoints(this.dragStartPoint, event.point);
      
      // Apply movement
      this.applyMovement(moveVector);
      
      this.addFeedback({
        type: 'preview',
        message: `Moved ${this.elementsToMove.length} element(s)`,
        position: event.point,
        color: '#00ff00'
      });

      // Reset state
      this.isDragging = false;
      this.dragStartPoint = null;
      this.elementsToMove = [];
      this.originalPositions.clear();
      this.state = ToolState.Active;
    }
  }

  /**
   * Preview movement without applying changes
   */
  private previewMovement(moveVector: Vector): void {
    // In a full implementation, this would update the visual representation
    // without modifying the actual geometry data
    
    // For now, we'll apply the movement and store it as feedback
    this.addFeedback({
      type: 'preview',
      geometry: {
        type: 'movement',
        elements: this.elementsToMove.map(element => ({
          id: element.id,
          originalPoints: this.originalPositions.get(element.id) || [],
          newPoints: this.calculateMovedPoints(element, moveVector)
        }))
      },
      color: '#0080ff'
    });
  }

  /**
   * Apply movement to elements
   */
  private applyMovement(moveVector: Vector): void {
    this.elementsToMove.forEach(element => {
      const movedPoints = this.calculateMovedPoints(element, moveVector);
      element.updateFromPoints(movedPoints);
    });
  }

  /**
   * Calculate new positions after movement
   */
  private calculateMovedPoints(element: GeometryElement, moveVector: Vector): Point[] {
    const originalPoints = this.originalPositions.get(element.id) || element.getControlPoints();
    
    return originalPoints.map(point => 
      new Point(
        point.x + moveVector.x,
        point.y + moveVector.y,
        point.z + moveVector.z
      )
    );
  }

  /**
   * Handle key down event
   */
  onKeyDown(event: ToolKeyboardEvent): void {
    super.onKeyDown(event);

    if (this.isDragging) {
      // Allow precise movement with arrow keys
      let moveVector: Vector | null = null;
      const step = event.shiftKey ? 1.0 : 0.1; // Larger step with Shift

      switch (event.key) {
        case 'ArrowLeft':
          moveVector = new Vector(-step, 0, 0);
          break;
        case 'ArrowRight':
          moveVector = new Vector(step, 0, 0);
          break;
        case 'ArrowUp':
          moveVector = new Vector(0, step, 0);
          break;
        case 'ArrowDown':
          moveVector = new Vector(0, -step, 0);
          break;
      }

      if (moveVector) {
        this.applyMovement(moveVector);
        
        // Update drag start point for relative movement
        if (this.dragStartPoint) {
          this.dragStartPoint = new Point(
            this.dragStartPoint.x + moveVector.x,
            this.dragStartPoint.y + moveVector.y,
            this.dragStartPoint.z + moveVector.z
          );
        }

        event.preventDefault();
      }
    }
  }

  /**
   * Cancel current operation
   */
  protected onCancel(): void {
    if (this.isDragging) {
      // Restore original positions
      this.elementsToMove.forEach(element => {
        const originalPoints = this.originalPositions.get(element.id);
        if (originalPoints) {
          element.updateFromPoints(originalPoints);
        }
      });

      this.addFeedback({
        type: 'preview',
        message: 'Move operation cancelled',
        position: new Point(0, 0),
        color: '#ff8000'
      });
    }

    this.isDragging = false;
    this.dragStartPoint = null;
    this.elementsToMove = [];
    this.originalPositions.clear();
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
      message: 'Move mode: Click and drag to move elements. Use arrow keys for precise movement.',
      position: new Point(10, 10),
      color: '#0080ff'
    });
  }

  /**
   * Deactivate the tool
   */
  protected onDeactivate(): void {
    if (this.isDragging) {
      this.onCancel();
    }
    this.clearFeedback();
  }

  /**
   * Reset tool state
   */
  protected onReset(): void {
    this.isDragging = false;
    this.dragStartPoint = null;
    this.elementsToMove = [];
    this.originalPositions.clear();
    this.clearFeedback();
  }

  /**
   * Check if tool requires a sketch
   */
  requiresSketch(): boolean {
    return true;
  }

  /**
   * Get help text
   */
  getHelpText(): string {
    return 'Click and drag to move elements. Use arrow keys for precise movement (Shift for larger steps). Escape to cancel.';
  }
}