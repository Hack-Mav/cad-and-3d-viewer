import { Tool, ToolState, CursorType, type ToolMouseEvent, type ToolKeyboardEvent } from '../base/Tool';
import { SelectionManager } from '../base/SelectionManager';
import { GeometryElement } from '@/lib/geometry/sketch/GeometryElement';
import { Point } from '@/lib/geometry/core/Point';

/**
 * Tool for deleting geometry elements
 */
export class DeleteTool extends Tool {
  private selectionManager: SelectionManager;
  private elementsToDelete: GeometryElement[] = [];

  constructor() {
    super(
      'delete',
      'Delete',
      'Delete selected geometry elements',
      'trash-2',
      CursorType.NotAllowed,
      'Delete'
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
    let elementsToDelete = this.selectionManager.getSelectedElements();
    
    if (elementsToDelete.length === 0) {
      // No selection, try to select element at point
      const elements = this.selectionManager.selectAt(event.point, false);
      elementsToDelete = elements;
    }

    if (elementsToDelete.length === 0) {
      this.addFeedback({
        type: 'error',
        message: 'No elements to delete. Select elements first or click on an element.',
        position: event.point,
        color: '#ff0000'
      });
      return;
    }

    // Confirm deletion
    this.elementsToDelete = [...elementsToDelete];
    this.state = ToolState.InProgress;

    this.addFeedback({
      type: 'preview',
      message: `Delete ${this.elementsToDelete.length} element(s)? Click again to confirm, Escape to cancel.`,
      position: event.point,
      color: '#ff8000'
    });
  }

  /**
   * Handle mouse move event
   */
  onMouseMove(event: ToolMouseEvent): void {
    this.clearFeedback();

    if (this.state === ToolState.InProgress) {
      // Show confirmation message
      this.addFeedback({
        type: 'preview',
        message: `Delete ${this.elementsToDelete.length} element(s)? Click to confirm, Escape to cancel.`,
        position: event.point,
        color: '#ff8000'
      });
      return;
    }

    // Show hover feedback
    const elements = this.activeSketch?.findElementsAt(event.point, 0.01) || [];
    
    if (elements.length > 0) {
      const element = elements[0];
      const isSelected = this.selectionManager.isSelected(element);
      
      this.addFeedback({
        type: 'preview',
        message: `${element.type}${isSelected ? ' (selected)' : ''} - Click to delete`,
        position: event.point,
        color: isSelected ? '#ff8000' : '#ff0000'
      });
    } else {
      const selectedCount = this.selectionManager.getSelectionCount();
      if (selectedCount > 0) {
        this.addFeedback({
          type: 'preview',
          message: `${selectedCount} element(s) selected - Click anywhere to delete`,
          position: event.point,
          color: '#ff8000'
        });
      } else {
        this.addFeedback({
          type: 'preview',
          message: 'Click on elements to delete them',
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
    if (this.state === ToolState.InProgress) {
      // Confirm deletion
      this.performDeletion(event.point);
    }
  }

  /**
   * Perform the deletion operation
   */
  private performDeletion(clickPoint: Point): void {
    if (!this.activeSketch || this.elementsToDelete.length === 0) {
      return;
    }

    try {
      // Store element info for feedback
      const deletedCount = this.elementsToDelete.length;
      const deletedTypes = this.elementsToDelete.map(el => el.type);

      // Remove elements from sketch
      this.elementsToDelete.forEach(element => {
        this.activeSketch!.removeElement(element.id);
      });

      // Clear selection
      this.selectionManager.clearSelection();

      this.addFeedback({
        type: 'preview',
        message: `Deleted ${deletedCount} element(s): ${deletedTypes.join(', ')}`,
        position: clickPoint,
        color: '#00ff00'
      });

      // Reset state
      this.elementsToDelete = [];
      this.state = ToolState.Active;

    } catch (error) {
      this.addFeedback({
        type: 'error',
        message: `Delete failed: ${error}`,
        position: clickPoint,
        color: '#ff0000'
      });
      this.reset();
    }
  }

  /**
   * Delete all selected elements immediately
   */
  deleteSelected(): void {
    const selectedElements = this.selectionManager.getSelectedElements();
    
    if (selectedElements.length === 0) {
      this.addFeedback({
        type: 'error',
        message: 'No elements selected to delete',
        position: new Point(0, 0),
        color: '#ff0000'
      });
      return;
    }

    this.elementsToDelete = [...selectedElements];
    this.performDeletion(new Point(0, 0));
  }

  /**
   * Handle key down event
   */
  onKeyDown(event: ToolKeyboardEvent): void {
    super.onKeyDown(event);

    switch (event.key) {
      case 'Delete':
      case 'Backspace':
        if (this.state === ToolState.InProgress) {
          // Confirm deletion with keyboard
          this.performDeletion(new Point(0, 0));
        } else {
          // Delete selected elements immediately
          this.deleteSelected();
        }
        event.preventDefault();
        break;

      case 'a':
      case 'A':
        if (event.ctrlKey) {
          // Select all for deletion
          this.selectionManager.selectAll();
          const count = this.selectionManager.getSelectionCount();
          this.addFeedback({
            type: 'preview',
            message: `Selected all ${count} elements for deletion`,
            position: new Point(0, 0),
            color: '#ff8000'
          });
          event.preventDefault();
        }
        break;

      case 'Enter':
        if (this.state === ToolState.InProgress) {
          // Confirm deletion with Enter
          this.performDeletion(new Point(0, 0));
          event.preventDefault();
        }
        break;
    }
  }

  /**
   * Cancel current operation
   */
  protected onCancel(): void {
    if (this.state === ToolState.InProgress) {
      this.addFeedback({
        type: 'preview',
        message: 'Delete operation cancelled',
        position: new Point(0, 0),
        color: '#0080ff'
      });
    }

    this.elementsToDelete = [];
  }

  /**
   * Activate the tool
   */
  protected onActivate(): void {
    if (this.activeSketch) {
      this.selectionManager.setActiveSketch(this.activeSketch);
    }

    const selectedCount = this.selectionManager.getSelectionCount();
    if (selectedCount > 0) {
      this.addFeedback({
        type: 'preview',
        message: `Delete mode: ${selectedCount} element(s) selected. Click to delete, or click on other elements. Ctrl+A to select all.`,
        position: new Point(10, 10),
        color: '#ff8000'
      });
    } else {
      this.addFeedback({
        type: 'preview',
        message: 'Delete mode: Click on elements to delete them. Ctrl+A to select all, Delete/Backspace to delete selected.',
        position: new Point(10, 10),
        color: '#ff0000'
      });
    }
  }

  /**
   * Deactivate the tool
   */
  protected onDeactivate(): void {
    if (this.state === ToolState.InProgress) {
      this.onCancel();
    }
    this.clearFeedback();
  }

  /**
   * Reset tool state
   */
  protected onReset(): void {
    this.elementsToDelete = [];
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
    return 'Click on elements to delete them. Delete/Backspace to delete selected elements. Ctrl+A to select all. Enter to confirm deletion.';
  }
}