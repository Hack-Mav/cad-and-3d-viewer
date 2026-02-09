import { Tool, ToolState, type ToolMouseEvent, type ToolKeyboardEvent } from './base/Tool';
import { SelectionManager } from './base/SelectionManager';
import { SnapManager } from './base/SnapManager';
import { Sketch } from '@/lib/geometry/sketch/Sketch';

// Import all tool types
import { LineTool, CircleTool, ArcTool, PolygonTool } from './sketching';
import { SelectTool, MoveTool, TrimTool, ExtendTool, FilletTool, ChamferTool } from './editing';
import { ParallelTool, PerpendicularTool, TangentTool, EqualTool, DistanceTool, AngleTool } from './constraints';

/**
 * Tool category enumeration
 */
export const ToolCategory = {
  Sketching: 'sketching',
  Editing: 'editing',
  Constraints: 'constraints',
  View: 'view'
} as const;

export type ToolCategory = typeof ToolCategory[keyof typeof ToolCategory];

/**
 * Tool registration interface
 */
export interface ToolRegistration {
  tool: Tool;
  category: ToolCategory;
  group?: string;
}

/**
 * Manages all CAD tools and their interactions
 */
export class ToolManager {
  private tools: Map<string, ToolRegistration>;
  private activeTool: Tool | null;
  private selectionManager: SelectionManager;
  private snapManager: SnapManager;
  private activeSketch?: Sketch;

  constructor() {
    this.tools = new Map();
    this.activeTool = null;
    this.selectionManager = new SelectionManager();
    this.snapManager = new SnapManager();
    
    this.registerDefaultTools();
  }

  /**
   * Register default tools
   */
  private registerDefaultTools(): void {
    // Sketching tools
    this.registerTool(new LineTool(), ToolCategory.Sketching, 'Basic');
    this.registerTool(new CircleTool(), ToolCategory.Sketching, 'Basic');
    this.registerTool(new ArcTool(), ToolCategory.Sketching, 'Basic');
    this.registerTool(new PolygonTool(), ToolCategory.Sketching, 'Basic');

    // Editing tools
    this.registerTool(new SelectTool(), ToolCategory.Editing, 'Selection');
    this.registerTool(new MoveTool(), ToolCategory.Editing, 'Modify');
    this.registerTool(new TrimTool(), ToolCategory.Editing, 'Modify');
    this.registerTool(new ExtendTool(), ToolCategory.Editing, 'Modify');
    this.registerTool(new FilletTool(), ToolCategory.Editing, 'Modify');
    this.registerTool(new ChamferTool(), ToolCategory.Editing, 'Modify');
    // this.registerTool(new DeleteTool(), ToolCategory.Editing, 'Modify');

    // Constraint tools
    this.registerTool(new ParallelTool(), ToolCategory.Constraints, 'Geometric');
    this.registerTool(new PerpendicularTool(), ToolCategory.Constraints, 'Geometric');
    this.registerTool(new TangentTool(), ToolCategory.Constraints, 'Geometric');
    this.registerTool(new EqualTool(), ToolCategory.Constraints, 'Geometric');
    this.registerTool(new DistanceTool(), ToolCategory.Constraints, 'Dimensional');
    this.registerTool(new AngleTool(), ToolCategory.Constraints, 'Dimensional');
  }

  /**
   * Register a tool
   */
  registerTool(tool: Tool, category: ToolCategory, group?: string): void {
    const registration: ToolRegistration = {
      tool,
      category,
      group
    };

    this.tools.set(tool.id, registration);
    this.setupTool(tool);
  }

  /**
   * Setup tool with managers
   */
  private setupTool(tool: Tool): void {
    // Set active sketch
    if (this.activeSketch) {
      tool.setActiveSketch(this.activeSketch);
    }

    // Setup tool-specific managers
    if ('setSelectionManager' in tool && typeof tool.setSelectionManager === 'function') {
      (tool as any).setSelectionManager(this.selectionManager);
    }

    if ('setSnapManager' in tool && typeof tool.setSnapManager === 'function') {
      (tool as any).setSnapManager(this.snapManager);
    }
  }

  /**
   * Get tool by ID
   */
  getTool(toolId: string): Tool | undefined {
    return this.tools.get(toolId)?.tool;
  }

  /**
   * Get all tools
   */
  getAllTools(): ToolRegistration[] {
    return Array.from(this.tools.values());
  }

  /**
   * Get tools by category
   */
  getToolsByCategory(category: ToolCategory): ToolRegistration[] {
    return Array.from(this.tools.values()).filter(reg => reg.category === category);
  }

  /**
   * Get tools by group
   */
  getToolsByGroup(group: string): ToolRegistration[] {
    return Array.from(this.tools.values()).filter(reg => reg.group === group);
  }

  /**
   * Activate a tool
   */
  activateTool(toolId: string): boolean {
    const tool = this.getTool(toolId);
    if (!tool) {
      return false;
    }

    // Check if tool can be activated
    if (!tool.canActivate()) {
      return false;
    }

    // Check if tool requires a sketch
    if (tool.requiresSketch() && !this.activeSketch) {
      console.warn(`Tool ${toolId} requires an active sketch`);
      return false;
    }

    // Deactivate current tool
    if (this.activeTool) {
      this.activeTool.deactivate();
    }

    // Activate new tool
    this.activeTool = tool;
    tool.activate();

    return true;
  }

  /**
   * Deactivate current tool
   */
  deactivateCurrentTool(): void {
    if (this.activeTool) {
      this.activeTool.deactivate();
      this.activeTool = null;
    }
  }

  /**
   * Get active tool
   */
  getActiveTool(): Tool | null {
    return this.activeTool;
  }

  /**
   * Set active sketch
   */
  setActiveSketch(sketch: Sketch | undefined): void {
    this.activeSketch = sketch;
    
    // Update all tools
    for (const registration of this.tools.values()) {
      registration.tool.setActiveSketch(sketch);
    }

    // Update managers
    this.selectionManager.setActiveSketch(sketch);
    this.snapManager.setActiveSketch(sketch);
  }

  /**
   * Handle mouse down event
   */
  onMouseDown(event: ToolMouseEvent): void {
    if (this.activeTool) {
      this.activeTool.onMouseDown(event);
    }
  }

  /**
   * Handle mouse move event
   */
  onMouseMove(event: ToolMouseEvent): void {
    if (this.activeTool) {
      this.activeTool.onMouseMove(event);
    }
  }

  /**
   * Handle mouse up event
   */
  onMouseUp(event: ToolMouseEvent): void {
    if (this.activeTool) {
      this.activeTool.onMouseUp(event);
    }
  }

  /**
   * Handle mouse double-click event
   */
  onMouseDoubleClick(event: ToolMouseEvent): void {
    if (this.activeTool) {
      this.activeTool.onMouseDoubleClick(event);
    }
  }

  /**
   * Handle key down event
   */
  onKeyDown(event: ToolKeyboardEvent): void {
    // Check for tool shortcuts first
    if (!event.ctrlKey && !event.altKey) {
      for (const registration of this.tools.values()) {
        const tool = registration.tool;
        if (tool.shortcut && tool.shortcut.toLowerCase() === event.key.toLowerCase()) {
          this.activateTool(tool.id);
          event.preventDefault();
          return;
        }
      }
    }

    // Pass to active tool
    if (this.activeTool) {
      this.activeTool.onKeyDown(event);
    }
  }

  /**
   * Handle key up event
   */
  onKeyUp(event: ToolKeyboardEvent): void {
    if (this.activeTool) {
      this.activeTool.onKeyUp(event);
    }
  }

  /**
   * Get selection manager
   */
  getSelectionManager(): SelectionManager {
    return this.selectionManager;
  }

  /**
   * Get snap manager
   */
  getSnapManager(): SnapManager {
    return this.snapManager;
  }

  /**
   * Get tool feedback for rendering
   */
  getToolFeedback(): any[] {
    if (this.activeTool) {
      return this.activeTool.getFeedback();
    }
    return [];
  }

  /**
   * Reset all tools
   */
  resetAllTools(): void {
    for (const registration of this.tools.values()) {
      registration.tool.reset();
    }
  }

  /**
   * Get tool statistics
   */
  getStatistics(): {
    totalTools: number;
    toolsByCategory: Record<string, number>;
    activeToolId?: string;
    activeToolState?: ToolState;
  } {
    const toolsByCategory: Record<string, number> = {};
    
    for (const registration of this.tools.values()) {
      const category = registration.category;
      toolsByCategory[category] = (toolsByCategory[category] || 0) + 1;
    }

    return {
      totalTools: this.tools.size,
      toolsByCategory,
      activeToolId: this.activeTool?.id,
      activeToolState: this.activeTool?.getState()
    };
  }
}