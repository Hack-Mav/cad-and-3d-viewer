import { Tool, ToolState, CursorType, type ToolMouseEvent, type ToolKeyboardEvent } from '../base/Tool';
import { SelectionManager, SelectionMode } from '../base/SelectionManager';
import { GeometryElement } from '@/lib/geometry/sketch/GeometryElement';
import { Point } from '@/lib/geometry/core/Point';

/**
 * Tool for selecting geometry elements
 */
export class SelectTool extends Tool {
  private selectionManager: SelectionManager;
  private isDragging: boolean = false;
  private dragStartPoint: Point | null = null;
  private dragCurrentPoint: Point | null = null;

  constructor() {
    super(
      'select',
      'Select',
      'Select geometry elements',
      'cursor-pointer',
      CursorType.Default,
      'S'
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
   * Get selection manager
   */
  getSelectionManager(): SelectionManager {
    return this.selectionManager;
  }

  /**
   * Handle mouse down event
   */
  onMouseDown(event: ToolMouseEvent): void {
    if (event.button !== 0) return; // Only handle left mouse button

    this.dragStartPoint = event.point.clone();
    this.isDragging = false;

    // Check if clicking on existing selection for potential drag operation
    const elementsAtPoint = this.activeSketch?.findElementsAt(event.point, 0.01) || [];
    const selectedElements = this.selectionManager.getSelectedElements();
    
    const clickedSelectedElement = elementsAtPoint.find(element => 
      selectedElements.some(selected => selected.id === element.id)
    );

    if (clickedSelectedElement && !event.ctrlKey && !event.shiftKey) {
      // Clicking on selected element - prepare for potential drag
      this.state = ToolState.InProgress;
      return;
    }

    // Regular selection
    const elements = this.selectionManager.selectAt(event.point, event.ctrlKey || event.shiftKey);
    
    if (elements.length > 0) {
      this.addFeedback({
        type: 'preview',
        message: `Selected: ${elements[0].type}`,
        position: event.point,
        color: '#00ff00'
      });
    } else if (!event.ctrlKey && !event.shiftKey) {
      // Clear selection if not adding to selection
      this.selectionManager.clearSelection();
    }
  }

  /**
   * Handle mouse move event
   */
  onMouseMove(event: ToolMouseEvent): void {
    this.clearFeedback();

    if (this.state === ToolState.InProgress && this.dragStartPoint) {
      const dragDistance = this.dragStartPoint.distanceTo(event.point);
      
      if (!this.isDragging && dragDistance > 0.05) { // Start dragging threshold
        this.isDragging = true;
        this.selectionManager.setMode(SelectionMode.Window);
      }

      if (this.isDragging) {
        // Show selection window
        this.dragCurrentPoint = event.point.clone();
        
        this.addFeedback({
          type: 'preview',
          geometry: {
            type: 'rectangle',
            start: this.dragStartPoint,
            end: this.dragCurrentPoint
          },
          message: 'Selection window',
          color: '#0080ff'
        });

        return;
      }
    }

    // Show hover feedback
    const elements = this.activeSketch?.findElementsAt(event.point, 0.01) || [];
    
    if (elements.length > 0) {
      const element = elements[0];
      const isSelected = this.selectionManager.isSelected(element);
      
      this.addFeedback({
        type: 'preview',
        message: `${element.type}${isSelected ? ' (selected)' : ''}`,
        position: event.point,
        color: isSelected ? '#00ff00' : '#0080ff'
      });
    }
  }

  /**
   * Handle mouse up event
   */
  onMouseUp(event: ToolMouseEvent): void {
    if (this.state === ToolState.InProgress) {
      if (this.isDragging && this.dragStartPoint && this.dragCurrentPoint) {
        // Complete window selection
        const elements = this.selectionManager.selectInWindow(
          this.dragStartPoint,
          this.dragCurrentPoint,
          event.ctrlKey || event.shiftKey
        );

        this.addFeedback({
          type: 'preview',
          message: `Selected ${elements.length} element(s)`,
          position: event.point,
          color: '#00ff00'
        });
      }

      this.isDragging = false;
      this.dragStartPoint = null;
      this.dragCurrentPoint = null;
      this.state = ToolState.Active;
      this.selectionManager.setMode(SelectionMode.Single);
    }
  }

  /**
   * Handle key down event
   */
  onKeyDown(event: ToolKeyboardEvent): void {
    super.onKeyDown(event);

    switch (event.key) {
      case 'a':
      case 'A':
        if (event.ctrlKey) {
          this.selectionManager.selectAll();
          this.addFeedback({
            type: 'preview',
            message: 'Selected all elements',
            position: new Point(0, 0),
            color: '#00ff00'
          });
          event.preventDefault();
        }
        break;

      case 'Delete':
      case 'Backspace':
        this.deleteSelected();
        event.preventDefault();
        break;

      case 'i':
      case 'I':
        if (event.ctrlKey) {
          this.selectionManager.invertSelection();
          this.addFeedback({
            type: 'preview',
            message: 'Inverted selection',
            position: new Point(0, 0),
            color: '#00ff00'
          });
          event.preventDefault();
        }
        break;
    }
  }

  /**
   * Delete selected elements
   */
  private deleteSelected(): void {
    const selectedElements = this.selectionManager.getSelectedElements();
    
    if (selectedElements.length === 0) {
      return;
    }

    // Remove elements from sketch
    if (this.activeSketch) {
      selectedElements.forEach(element => {
        this.activeSketch!.removeElement(element.id);
      });

      this.addFeedback({
        type: 'preview',
        message: `Deleted ${selectedElements.length} element(s)`,
        position: new Point(0, 0),
        color: '#ff8000'
      });

      // Clear selection
      this.selectionManager.clearSelection();
    }
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
      message: 'Select mode: Click to select, drag for window selection, Ctrl+click to add/remove',
      position: new Point(10, 10),
      color: '#0080ff'
    });
  }

  /**
   * Deactivate the tool
   */
  protected onDeactivate(): void {
    this.isDragging = false;
    this.dragStartPoint = null;
    this.dragCurrentPoint = null;
    this.clearFeedback();
  }

  /**
   * Reset tool state
   */
  protected onReset(): void {
    this.isDragging = false;
    this.dragStartPoint = null;
    this.dragCurrentPoint = null;
    this.clearFeedback();
  }

  /**
   * Get selected elements
   */
  getSelectedElements(): GeometryElement[] {
    return this.selectionManager.getSelectedElements();
  }

  /**
   * Clear selection
   */
  clearSelection(): void {
    this.selectionManager.clearSelection();
  }

  /**
   * Set selection mode
   */
  setSelectionMode(mode: SelectionMode): void {
    this.selectionManager.setMode(mode);
  }

  /**
   * Get help text
   */
  getHelpText(): string {
    return 'Click to select elements, drag for window selection. Ctrl+A: select all, Ctrl+I: invert selection, Delete: delete selected.';
  }
}