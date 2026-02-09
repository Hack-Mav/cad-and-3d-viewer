import { Point } from '@/lib/geometry/core/Point';
import { GeometryElement } from '@/lib/geometry/sketch/GeometryElement';
import { Sketch } from '@/lib/geometry/sketch/Sketch';

/**
 * Selection mode enumeration
 */
export enum SelectionMode {
  Single = 'single',
  Multiple = 'multiple',
  Window = 'window',
  Crossing = 'crossing'
}

/**
 * Selection filter function type
 */
export type SelectionFilter = (element: GeometryElement) => boolean;

/**
 * Selection event data
 */
export interface SelectionEvent {
  type: 'added' | 'removed' | 'cleared';
  elements: GeometryElement[];
  totalSelected: number;
}

/**
 * Selection listener function type
 */
export type SelectionListener = (event: SelectionEvent) => void;

/**
 * Manages selection of geometry elements in sketches
 */
export class SelectionManager {
  private selectedElements: Set<string>;
  private activeSketch?: Sketch;
  private mode: SelectionMode;
  private filter?: SelectionFilter;
  private listeners: SelectionListener[];
  private tolerance: number;

  constructor() {
    this.selectedElements = new Set();
    this.mode = SelectionMode.Single;
    this.listeners = [];
    this.tolerance = 5; // pixels
  }

  /**
   * Set the active sketch for selection
   */
  setActiveSketch(sketch: Sketch | undefined): void {
    this.activeSketch = sketch;
    this.clearSelection();
  }

  /**
   * Set selection mode
   */
  setMode(mode: SelectionMode): void {
    this.mode = mode;
  }

  /**
   * Get current selection mode
   */
  getMode(): SelectionMode {
    return this.mode;
  }

  /**
   * Set selection filter
   */
  setFilter(filter: SelectionFilter | undefined): void {
    this.filter = filter;
  }

  /**
   * Set selection tolerance in pixels
   */
  setTolerance(tolerance: number): void {
    this.tolerance = tolerance;
  }

  /**
   * Add selection listener
   */
  addListener(listener: SelectionListener): void {
    this.listeners.push(listener);
  }

  /**
   * Remove selection listener
   */
  removeListener(listener: SelectionListener): void {
    const index = this.listeners.indexOf(listener);
    if (index >= 0) {
      this.listeners.splice(index, 1);
    }
  }

  /**
   * Select element at point
   */
  selectAt(point: Point, addToSelection: boolean = false): GeometryElement[] {
    if (!this.activeSketch) {
      return [];
    }

    const element = this.findElementAt(point);
    if (!element) {
      if (!addToSelection) {
        this.clearSelection();
      }
      return [];
    }

    if (addToSelection || this.mode === SelectionMode.Multiple) {
      this.toggleElement(element);
    } else {
      this.setSelection([element]);
    }

    return [element];
  }

  /**
   * Select elements in window (rectangle selection)
   */
  selectInWindow(startPoint: Point, endPoint: Point, addToSelection: boolean = false): GeometryElement[] {
    if (!this.activeSketch) {
      return [];
    }

    const elements = this.findElementsInWindow(startPoint, endPoint, false);
    
    if (addToSelection) {
      elements.forEach(element => this.addToSelection(element));
    } else {
      this.setSelection(elements);
    }

    return elements;
  }

  /**
   * Select elements crossing window (elements that intersect the rectangle)
   */
  selectCrossing(startPoint: Point, endPoint: Point, addToSelection: boolean = false): GeometryElement[] {
    if (!this.activeSketch) {
      return [];
    }

    const elements = this.findElementsInWindow(startPoint, endPoint, true);
    
    if (addToSelection) {
      elements.forEach(element => this.addToSelection(element));
    } else {
      this.setSelection(elements);
    }

    return elements;
  }

  /**
   * Add element to selection
   */
  addToSelection(element: GeometryElement): void {
    if (this.filter && !this.filter(element)) {
      return;
    }

    if (!this.selectedElements.has(element.id)) {
      this.selectedElements.add(element.id);
      this.notifyListeners('added', [element]);
    }
  }

  /**
   * Remove element from selection
   */
  removeFromSelection(element: GeometryElement): void {
    if (this.selectedElements.has(element.id)) {
      this.selectedElements.delete(element.id);
      this.notifyListeners('removed', [element]);
    }
  }

  /**
   * Toggle element selection
   */
  toggleElement(element: GeometryElement): void {
    if (this.selectedElements.has(element.id)) {
      this.removeFromSelection(element);
    } else {
      this.addToSelection(element);
    }
  }

  /**
   * Set selection to specific elements
   */
  setSelection(elements: GeometryElement[]): void {
    const filteredElements = this.filter ? 
      elements.filter(this.filter) : 
      elements;

    this.selectedElements.clear();
    filteredElements.forEach(element => {
      this.selectedElements.add(element.id);
    });

    this.notifyListeners('added', filteredElements);
  }

  /**
   * Clear all selection
   */
  clearSelection(): void {
    if (this.selectedElements.size > 0) {
      this.selectedElements.clear();
      this.notifyListeners('cleared', []);
    }
  }

  /**
   * Get selected elements
   */
  getSelectedElements(): GeometryElement[] {
    if (!this.activeSketch) {
      return [];
    }

    const elements: GeometryElement[] = [];
    for (const elementId of this.selectedElements) {
      const element = this.activeSketch.getElement(elementId);
      if (element) {
        elements.push(element);
      }
    }

    return elements;
  }

  /**
   * Get selected element IDs
   */
  getSelectedIds(): string[] {
    return Array.from(this.selectedElements);
  }

  /**
   * Check if element is selected
   */
  isSelected(element: GeometryElement): boolean {
    return this.selectedElements.has(element.id);
  }

  /**
   * Get selection count
   */
  getSelectionCount(): number {
    return this.selectedElements.size;
  }

  /**
   * Check if selection is empty
   */
  isEmpty(): boolean {
    return this.selectedElements.size === 0;
  }

  /**
   * Find element at point
   */
  private findElementAt(point: Point): GeometryElement | null {
    if (!this.activeSketch) {
      return null;
    }

    // Convert tolerance to world units (simplified)
    const worldTolerance = this.tolerance * 0.01;

    const elements = this.activeSketch.findElementsAt(point, worldTolerance);
    
    if (elements.length === 0) {
      return null;
    }

    // Return the closest element
    let closestElement = elements[0];
    let minDistance = Infinity;

    for (const element of elements) {
      const closestPoint = element.getClosestPoint(point);
      const distance = point.distanceTo(closestPoint);
      
      if (distance < minDistance) {
        minDistance = distance;
        closestElement = element;
      }
    }

    return closestElement;
  }

  /**
   * Find elements in window
   */
  private findElementsInWindow(startPoint: Point, endPoint: Point, crossing: boolean): GeometryElement[] {
    if (!this.activeSketch) {
      return [];
    }

    const minX = Math.min(startPoint.x, endPoint.x);
    const maxX = Math.max(startPoint.x, endPoint.x);
    const minY = Math.min(startPoint.y, endPoint.y);
    const maxY = Math.max(startPoint.y, endPoint.y);

    const elements: GeometryElement[] = [];

    for (const element of this.activeSketch.getAllElements()) {
      const bbox = element.getBoundingBox();
      
      if (crossing) {
        // Crossing selection: element intersects window
        if (bbox.max.x >= minX && bbox.min.x <= maxX &&
            bbox.max.y >= minY && bbox.min.y <= maxY) {
          elements.push(element);
        }
      } else {
        // Window selection: element completely inside window
        if (bbox.min.x >= minX && bbox.max.x <= maxX &&
            bbox.min.y >= minY && bbox.max.y <= maxY) {
          elements.push(element);
        }
      }
    }

    return elements;
  }

  /**
   * Notify listeners of selection changes
   */
  private notifyListeners(type: 'added' | 'removed' | 'cleared', elements: GeometryElement[]): void {
    const event: SelectionEvent = {
      type,
      elements,
      totalSelected: this.selectedElements.size
    };

    this.listeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in selection listener:', error);
      }
    });
  }

  /**
   * Select all elements in active sketch
   */
  selectAll(): void {
    if (!this.activeSketch) {
      return;
    }

    const allElements = this.activeSketch.getAllElements();
    this.setSelection(allElements);
  }

  /**
   * Invert selection
   */
  invertSelection(): void {
    if (!this.activeSketch) {
      return;
    }

    const allElements = this.activeSketch.getAllElements();
    const newSelection = allElements.filter(element => !this.isSelected(element));
    this.setSelection(newSelection);
  }

  /**
   * Select elements by type
   */
  selectByType(elementType: string): void {
    if (!this.activeSketch) {
      return;
    }

    const elements = this.activeSketch.getAllElements()
      .filter(element => element.type === elementType);
    
    this.setSelection(elements);
  }
}