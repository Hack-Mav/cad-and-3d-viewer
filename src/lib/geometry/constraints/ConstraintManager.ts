import { 
  Constraint, 
  ConstraintStatus, 
  ParallelConstraint,
  PerpendicularConstraint,
  TangentConstraint,
  EqualLengthConstraint,
  DistanceConstraint
} from './Constraint';
import type { ConstraintVisualization } from './Constraint';
import { ConstraintSolver } from './ConstraintSolver';
import type { SolverResult, SolverConfig } from './ConstraintSolver';
import { GeometryElement } from '../sketch/GeometryElement';
import { Sketch } from '../sketch/Sketch';

/**
 * Event types for constraint manager
 */
export type ConstraintEvent = 
  | 'constraint-added'
  | 'constraint-removed'
  | 'constraint-updated'
  | 'solver-completed'
  | 'conflict-detected';

/**
 * Event listener for constraint events
 */
export type ConstraintEventListener = (event: ConstraintEvent, data: any) => void;

/**
 * Manages constraints for a sketch and provides high-level constraint operations
 */
export class ConstraintManager {
  private sketch: Sketch;
  private solver: ConstraintSolver;
  private constraints: Map<string, Constraint>;
  private eventListeners: Map<ConstraintEvent, ConstraintEventListener[]>;
  private autoSolve: boolean;

  constructor(sketch: Sketch, solverConfig?: Partial<SolverConfig>) {
    this.sketch = sketch;
    this.solver = new ConstraintSolver(solverConfig);
    this.constraints = new Map();
    this.eventListeners = new Map();
    this.autoSolve = true;
  }

  /**
   * Add event listener
   */
  addEventListener(event: ConstraintEvent, listener: ConstraintEventListener): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(listener);
  }

  /**
   * Remove event listener
   */
  removeEventListener(event: ConstraintEvent, listener: ConstraintEventListener): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index >= 0) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * Emit event to listeners
   */
  private emit(event: ConstraintEvent, data: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(listener => listener(event, data));
    }
  }

  /**
   * Add a parallel constraint between two lines
   */
  addParallelConstraint(line1: GeometryElement, line2: GeometryElement): ParallelConstraint {
    if (line1.type !== 'Line' || line2.type !== 'Line') {
      throw new Error('Parallel constraint can only be applied to lines');
    }

    const constraint = new ParallelConstraint(line1, line2);
    this.addConstraint(constraint);
    return constraint;
  }

  /**
   * Add a perpendicular constraint between two lines
   */
  addPerpendicularConstraint(line1: GeometryElement, line2: GeometryElement): PerpendicularConstraint {
    if (line1.type !== 'Line' || line2.type !== 'Line') {
      throw new Error('Perpendicular constraint can only be applied to lines');
    }

    const constraint = new PerpendicularConstraint(line1, line2);
    this.addConstraint(constraint);
    return constraint;
  }

  /**
   * Add a tangent constraint between a line and a circle/arc
   */
  addTangentConstraint(line: GeometryElement, curve: GeometryElement): TangentConstraint {
    if (line.type !== 'Line') {
      throw new Error('Tangent constraint requires a line as first element');
    }
    if (curve.type !== 'Circle' && curve.type !== 'Arc') {
      throw new Error('Tangent constraint requires a circle or arc as second element');
    }

    const constraint = new TangentConstraint(line, curve);
    this.addConstraint(constraint);
    return constraint;
  }

  /**
   * Add an equal length constraint between two lines
   */
  addEqualLengthConstraint(line1: GeometryElement, line2: GeometryElement): EqualLengthConstraint {
    if (line1.type !== 'Line' || line2.type !== 'Line') {
      throw new Error('Equal length constraint can only be applied to lines');
    }

    const constraint = new EqualLengthConstraint(line1, line2);
    this.addConstraint(constraint);
    return constraint;
  }

  /**
   * Add a distance constraint between two elements
   */
  addDistanceConstraint(element1: GeometryElement, element2: GeometryElement, distance: number): DistanceConstraint {
    if (distance < 0) {
      throw new Error('Distance must be non-negative');
    }

    const constraint = new DistanceConstraint(element1, element2, distance);
    this.addConstraint(constraint);
    return constraint;
  }

  /**
   * Add a constraint to the manager
   */
  addConstraint(constraint: Constraint): void {
    // Validate that all elements belong to the sketch
    for (const element of constraint.elements) {
      if (!this.sketch.getElement(element.id)) {
        throw new Error(`Element ${element.id} not found in sketch`);
      }
    }

    this.constraints.set(constraint.id, constraint);
    this.solver.addConstraint(constraint);

    this.emit('constraint-added', { constraint });

    if (this.autoSolve) {
      this.solve();
    }
  }

  /**
   * Remove a constraint
   */
  removeConstraint(constraintId: string): boolean {
    const constraint = this.constraints.get(constraintId);
    if (!constraint) {
      return false;
    }

    this.constraints.delete(constraintId);
    this.solver.removeConstraint(constraintId);

    this.emit('constraint-removed', { constraint });

    if (this.autoSolve) {
      this.solve();
    }

    return true;
  }

  /**
   * Get all constraints
   */
  getConstraints(): Constraint[] {
    return Array.from(this.constraints.values());
  }

  /**
   * Get constraint by ID
   */
  getConstraint(constraintId: string): Constraint | undefined {
    return this.constraints.get(constraintId);
  }

  /**
   * Get constraints affecting a specific element
   */
  getConstraintsForElement(elementId: string): Constraint[] {
    return this.getConstraints().filter(constraint =>
      constraint.elements.some(element => element.id === elementId)
    );
  }

  /**
   * Clear all constraints
   */
  clearConstraints(): void {
    const removedConstraints = this.getConstraints();
    this.constraints.clear();
    this.solver.clear();

    for (const constraint of removedConstraints) {
      this.emit('constraint-removed', { constraint });
    }
  }

  /**
   * Solve all constraints
   */
  solve(): SolverResult {
    const result = this.solver.solve();
    
    this.emit('solver-completed', { result });

    if (result.conflictedConstraints.length > 0) {
      this.emit('conflict-detected', { 
        conflicts: result.conflictedConstraints 
      });
    }

    return result;
  }

  /**
   * Get constraint visualization data for rendering
   */
  getVisualizationData(): ConstraintVisualization[] {
    return this.getConstraints().map(constraint => constraint.getVisualizationData());
  }

  /**
   * Get constraints by status
   */
  getConstraintsByStatus(status: ConstraintStatus): Constraint[] {
    return this.getConstraints().filter(constraint => constraint.status === status);
  }

  /**
   * Get constraint statistics
   */
  getStatistics(): {
    total: number;
    satisfied: number;
    violated: number;
    conflicted: number;
    redundant: number;
    byType: Record<string, number>;
  } {
    const constraints = this.getConstraints();
    const byType: Record<string, number> = {};

    for (const constraint of constraints) {
      byType[constraint.type] = (byType[constraint.type] || 0) + 1;
    }

    return {
      total: constraints.length,
      satisfied: constraints.filter(c => c.status === ConstraintStatus.Satisfied).length,
      violated: constraints.filter(c => c.status === ConstraintStatus.Violated).length,
      conflicted: constraints.filter(c => c.status === ConstraintStatus.Conflicted).length,
      redundant: constraints.filter(c => c.status === ConstraintStatus.Redundant).length,
      byType
    };
  }

  /**
   * Validate all constraints
   */
  validate(): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const result = {
      isValid: true,
      errors: [] as string[],
      warnings: [] as string[]
    };

    // Validate individual constraints
    for (const constraint of this.constraints.values()) {
      // Check if constraint elements still exist in sketch
      for (const element of constraint.elements) {
        if (!this.sketch.getElement(element.id)) {
          result.isValid = false;
          result.errors.push(`Constraint ${constraint.id} references missing element ${element.id}`);
        }
      }

      // Check if constraint is applicable to element types
      if (!this.isConstraintApplicable(constraint)) {
        result.isValid = false;
        result.errors.push(`Constraint ${constraint.id} is not applicable to element types`);
      }
    }

    // Validate solver state
    const solverValidation = this.solver.validate();
    result.isValid = result.isValid && solverValidation.isValid;
    result.errors.push(...solverValidation.errors);
    result.warnings.push(...solverValidation.warnings);

    return result;
  }

  /**
   * Check if a constraint is applicable to its elements
   */
  private isConstraintApplicable(constraint: Constraint): boolean {
    switch (constraint.type) {
      case 'Parallel':
      case 'Perpendicular':
      case 'EqualLength':
        return constraint.elements.length === 2 && 
               constraint.elements.every(e => e.type === 'Line');
      
      case 'Tangent':
        return constraint.elements.length === 2 &&
               constraint.elements[0].type === 'Line' &&
               (constraint.elements[1].type === 'Circle' || constraint.elements[1].type === 'Arc');
      
      case 'Distance':
        return constraint.elements.length === 2;
      
      default:
        return true;
    }
  }

  /**
   * Enable or disable automatic solving
   */
  setAutoSolve(enabled: boolean): void {
    this.autoSolve = enabled;
  }

  /**
   * Get auto-solve status
   */
  isAutoSolveEnabled(): boolean {
    return this.autoSolve;
  }

  /**
   * Update solver configuration
   */
  updateSolverConfig(config: Partial<SolverConfig>): void {
    this.solver.updateConfig(config);
  }

  /**
   * Get solver configuration
   */
  getSolverConfig(): SolverConfig {
    return this.solver.getConfig();
  }

  /**
   * Get the associated sketch
   */
  getSketch(): Sketch {
    return this.sketch;
  }

  /**
   * Get the constraint solver
   */
  getSolver(): ConstraintSolver {
    return this.solver;
  }
}