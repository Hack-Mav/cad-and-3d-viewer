import { Point } from '@/lib/geometry/core/Point';
import { Sketch } from '@/lib/geometry/sketch/Sketch';

/**
 * Mouse button enumeration
 */
export enum MouseButton {
  Left = 0,
  Middle = 1,
  Right = 2
}

/**
 * Cursor types for tools
 */
export enum CursorType {
  Default = 'default',
  Crosshair = 'crosshair',
  Pointer = 'pointer',
  Move = 'move',
  Grab = 'grab',
  Grabbing = 'grabbing',
  NotAllowed = 'not-allowed',
  Custom = 'custom'
}

/**
 * Tool state enumeration
 */
export enum ToolState {
  Inactive = 'inactive',
  Active = 'active',
  InProgress = 'in-progress',
  Complete = 'complete'
}

/**
 * Mouse event data for tools
 */
export interface ToolMouseEvent {
  point: Point;
  screenPoint: Point;
  button: MouseButton;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  preventDefault: () => void;
  stopPropagation: () => void;
}

/**
 * Keyboard event data for tools
 */
export interface ToolKeyboardEvent {
  key: string;
  code: string;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  preventDefault: () => void;
  stopPropagation: () => void;
}

/**
 * Tool feedback for visual indicators
 */
export interface ToolFeedback {
  type: 'preview' | 'snap' | 'constraint' | 'error';
  geometry?: any;
  message?: string;
  position?: Point;
  color?: string;
}

/**
 * Base class for all CAD tools
 */
export abstract class Tool {
  public readonly id: string;
  public readonly name: string;
  public readonly description: string;
  public readonly icon: string;
  public readonly cursor: CursorType;
  public readonly shortcut?: string;
  
  protected state: ToolState;
  protected feedback: ToolFeedback[];
  protected activeSketch?: Sketch;

  constructor(
    id: string,
    name: string,
    description: string,
    icon: string,
    cursor: CursorType = CursorType.Default,
    shortcut?: string
  ) {
    this.id = id;
    this.name = name;
    this.description = description;
    this.icon = icon;
    this.cursor = cursor;
    this.shortcut = shortcut;
    this.state = ToolState.Inactive;
    this.feedback = [];
  }

  /**
   * Get current tool state
   */
  getState(): ToolState {
    return this.state;
  }

  /**
   * Get current feedback for rendering
   */
  getFeedback(): ToolFeedback[] {
    return [...this.feedback];
  }

  /**
   * Set the active sketch for this tool
   */
  setActiveSketch(sketch: Sketch | undefined): void {
    this.activeSketch = sketch;
  }

  /**
   * Activate the tool
   */
  activate(): void {
    if (this.state === ToolState.Inactive) {
      this.state = ToolState.Active;
      this.onActivate();
    }
  }

  /**
   * Deactivate the tool
   */
  deactivate(): void {
    if (this.state !== ToolState.Inactive) {
      this.onDeactivate();
      this.state = ToolState.Inactive;
      this.clearFeedback();
    }
  }

  /**
   * Reset tool to initial state
   */
  reset(): void {
    this.onReset();
    this.state = ToolState.Active;
    this.clearFeedback();
  }

  /**
   * Handle mouse down event
   */
  onMouseDown(event: ToolMouseEvent): void {
    // Override in subclasses
  }

  /**
   * Handle mouse move event
   */
  onMouseMove(event: ToolMouseEvent): void {
    // Override in subclasses
  }

  /**
   * Handle mouse up event
   */
  onMouseUp(event: ToolMouseEvent): void {
    // Override in subclasses
  }

  /**
   * Handle mouse double-click event
   */
  onMouseDoubleClick(event: ToolMouseEvent): void {
    // Override in subclasses
  }

  /**
   * Handle key down event
   */
  onKeyDown(event: ToolKeyboardEvent): void {
    // Handle common shortcuts
    if (event.key === 'Escape') {
      this.cancel();
      event.preventDefault();
    }
  }

  /**
   * Handle key up event
   */
  onKeyUp(event: ToolKeyboardEvent): void {
    // Override in subclasses
  }

  /**
   * Cancel current operation
   */
  cancel(): void {
    this.onCancel();
    this.reset();
  }

  /**
   * Complete current operation
   */
  complete(): void {
    if (this.state === ToolState.InProgress) {
      this.onComplete();
      this.state = ToolState.Complete;
    }
  }

  /**
   * Check if tool can be activated
   */
  canActivate(): boolean {
    return true;
  }

  /**
   * Check if tool requires a sketch
   */
  requiresSketch(): boolean {
    return false;
  }

  /**
   * Add feedback for rendering
   */
  protected addFeedback(feedback: ToolFeedback): void {
    this.feedback.push(feedback);
  }

  /**
   * Clear all feedback
   */
  protected clearFeedback(): void {
    this.feedback = [];
  }

  /**
   * Update feedback of a specific type
   */
  protected updateFeedback(type: string, feedback: ToolFeedback): void {
    this.feedback = this.feedback.filter(f => f.type !== type);
    this.feedback.push(feedback);
  }

  /**
   * Called when tool is activated
   */
  protected onActivate(): void {
    // Override in subclasses
  }

  /**
   * Called when tool is deactivated
   */
  protected onDeactivate(): void {
    // Override in subclasses
  }

  /**
   * Called when tool is reset
   */
  protected onReset(): void {
    // Override in subclasses
  }

  /**
   * Called when operation is cancelled
   */
  protected onCancel(): void {
    // Override in subclasses
  }

  /**
   * Called when operation is completed
   */
  protected onComplete(): void {
    // Override in subclasses
  }

  /**
   * Get tool information for UI
   */
  getInfo(): {
    id: string;
    name: string;
    description: string;
    icon: string;
    cursor: CursorType;
    shortcut?: string;
    state: ToolState;
  } {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      icon: this.icon,
      cursor: this.cursor,
      shortcut: this.shortcut,
      state: this.state
    };
  }

  /**
   * Convert to string representation
   */
  toString(): string {
    return `${this.name}(${this.id}, state: ${this.state})`;
  }
}