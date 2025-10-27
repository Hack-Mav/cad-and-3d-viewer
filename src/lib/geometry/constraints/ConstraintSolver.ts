import { Constraint, ConstraintStatus } from './Constraint';
import { GeometryElement } from '../sketch/GeometryElement';
import { Point } from '../core/Point';

/**
 * Result of constraint solving operation
 */
export interface SolverResult {
  success: boolean;
  iterations: number;
  finalError: number;
  conflictedConstraints: Constraint[];
  message: string;
}

/**
 * Configuration for the constraint solver
 */
export interface SolverConfig {
  maxIterations: number;
  tolerance: number;
  dampingFactor: number;
  stepSize: number;
}

/**
 * Constraint solver using iterative numerical methods
 */
export class ConstraintSolver {
  private config: SolverConfig;
  private constraints: Map<string, Constraint>;
  private elements: Map<string, GeometryElement>;

  constructor(config?: Partial<SolverConfig>) {
    this.config = {
      maxIterations: 100,
      tolerance: 1e-6,
      dampingFactor: 0.8,
      stepSize: 0.1,
      ...config
    };
    
    this.constraints = new Map();
    this.elements = new Map();
  }

  /**
   * Add a constraint to the solver
   */
  addConstraint(constraint: Constraint): void {
    this.constraints.set(constraint.id, constraint);
    
    // Add elements referenced by the constraint
    for (const element of constraint.elements) {
      this.elements.set(element.id, element);
    }
  }

  /**
   * Remove a constraint from the solver
   */
  removeConstraint(constraintId: string): boolean {
    return this.constraints.delete(constraintId);
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
   * Clear all constraints
   */
  clear(): void {
    this.constraints.clear();
    this.elements.clear();
  }

  /**
   * Solve all constraints using iterative method
   */
  solve(): SolverResult {
    const startTime = Date.now();
    let iteration = 0;
    let totalError = this.calculateTotalError();
    const conflictedConstraints: Constraint[] = [];

    // Update initial constraint statuses
    this.updateConstraintStatuses();

    // Check for conflicts before solving
    const conflicts = this.detectConflicts();
    if (conflicts.length > 0) {
      return {
        success: false,
        iterations: 0,
        finalError: totalError,
        conflictedConstraints: conflicts,
        message: `Detected ${conflicts.length} conflicting constraints`
      };
    }

    // Iterative solving loop
    while (iteration < this.config.maxIterations && totalError > this.config.tolerance) {
      const previousError = totalError;
      
      // Apply constraint corrections
      this.applyConstraintCorrections();
      
      // Calculate new total error
      totalError = this.calculateTotalError();
      
      // Check for convergence
      if (Math.abs(totalError - previousError) < this.config.tolerance * 0.1) {
        break;
      }
      
      iteration++;
    }

    // Update final constraint statuses
    this.updateConstraintStatuses();

    // Identify any remaining violated constraints
    for (const constraint of this.constraints.values()) {
      if (constraint.status === ConstraintStatus.Violated) {
        conflictedConstraints.push(constraint);
      }
    }

    const success = totalError < this.config.tolerance;
    const message = success 
      ? `Solved successfully in ${iteration} iterations`
      : `Failed to converge after ${iteration} iterations (error: ${totalError.toFixed(6)})`;

    return {
      success,
      iterations: iteration,
      finalError: totalError,
      conflictedConstraints,
      message
    };
  }

  /**
   * Calculate total error across all constraints
   */
  private calculateTotalError(): number {
    let totalError = 0;
    
    for (const constraint of this.constraints.values()) {
      const error = constraint.calculateError();
      if (isFinite(error)) {
        totalError += error * error; // Sum of squared errors
      }
    }
    
    return Math.sqrt(totalError);
  }

  /**
   * Update status of all constraints
   */
  private updateConstraintStatuses(): void {
    for (const constraint of this.constraints.values()) {
      constraint.updateStatus();
    }
  }

  /**
   * Apply corrections to geometry based on constraint violations
   */
  private applyConstraintCorrections(): void {
    const corrections = new Map<string, Point[]>();
    
    // Initialize corrections for all elements
    for (const element of this.elements.values()) {
      const points = element.getControlPoints();
      corrections.set(element.id, points.map(p => new Point(0, 0, 0)));
    }

    // Calculate corrections for each constraint
    for (const constraint of this.constraints.values()) {
      if (constraint.status === ConstraintStatus.Satisfied) {
        continue;
      }

      const error = constraint.calculateError();
      if (!isFinite(error) || error < this.config.tolerance) {
        continue;
      }

      // Apply simple correction based on constraint type
      this.applyConstraintCorrection(constraint, corrections);
    }

    // Apply accumulated corrections to elements
    for (const element of this.elements.values()) {
      const elementCorrections = corrections.get(element.id);
      if (elementCorrections) {
        const currentPoints = element.getControlPoints();
        const correctedPoints = currentPoints.map((point, index) => {
          const correction = elementCorrections[index];
          return new Point(
            point.x + correction.x * this.config.stepSize,
            point.y + correction.y * this.config.stepSize,
            point.z + correction.z * this.config.stepSize
          );
        });
        
        element.updateFromPoints(correctedPoints);
      }
    }
  }

  /**
   * Apply correction for a specific constraint
   */
  private applyConstraintCorrection(constraint: Constraint, corrections: Map<string, Point[]>): void {
    // This is a simplified correction method
    // In a full implementation, you would use proper numerical methods
    // like Newton-Raphson or Levenberg-Marquardt
    
    const error = constraint.calculateError();
    const correctionMagnitude = error * this.config.dampingFactor;
    
    // Apply small random corrections to break symmetry
    for (const element of constraint.elements) {
      const elementCorrections = corrections.get(element.id);
      if (elementCorrections) {
        for (let i = 0; i < elementCorrections.length; i++) {
          const randomCorrection = (Math.random() - 0.5) * correctionMagnitude * 0.1;
          elementCorrections[i].x += randomCorrection;
          elementCorrections[i].y += randomCorrection;
        }
      }
    }
  }

  /**
   * Detect conflicting constraints
   */
  detectConflicts(): Constraint[] {
    const conflicts: Constraint[] = [];
    
    // Simple conflict detection: check for over-constrained systems
    const constraintsByElement = new Map<string, Constraint[]>();
    
    // Group constraints by elements they affect
    for (const constraint of this.constraints.values()) {
      for (const element of constraint.elements) {
        if (!constraintsByElement.has(element.id)) {
          constraintsByElement.set(element.id, []);
        }
        constraintsByElement.get(element.id)!.push(constraint);
      }
    }

    // Check for over-constrained elements
    for (const [elementId, elementConstraints] of constraintsByElement) {
      const element = this.elements.get(elementId);
      if (!element) continue;

      // Simple heuristic: too many constraints on one element
      const maxConstraints = this.getMaxConstraintsForElement(element);
      if (elementConstraints.length > maxConstraints) {
        conflicts.push(...elementConstraints.slice(maxConstraints));
      }
    }

    return conflicts;
  }

  /**
   * Get maximum number of constraints that can be applied to an element
   */
  private getMaxConstraintsForElement(element: GeometryElement): number {
    switch (element.type) {
      case 'Line':
        return 4; // 2 points × 2 coordinates
      case 'Circle':
        return 3; // center (2 coords) + radius
      case 'Arc':
        return 5; // center (2 coords) + radius + 2 angles
      default:
        return 2;
    }
  }

  /**
   * Get solver statistics
   */
  getStatistics(): {
    constraintCount: number;
    elementCount: number;
    satisfiedConstraints: number;
    violatedConstraints: number;
    totalError: number;
  } {
    const constraints = Array.from(this.constraints.values());
    
    return {
      constraintCount: constraints.length,
      elementCount: this.elements.size,
      satisfiedConstraints: constraints.filter(c => c.status === ConstraintStatus.Satisfied).length,
      violatedConstraints: constraints.filter(c => c.status === ConstraintStatus.Violated).length,
      totalError: this.calculateTotalError()
    };
  }

  /**
   * Validate the constraint system
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

    // Check for invalid constraints
    for (const constraint of this.constraints.values()) {
      if (constraint.elements.length === 0) {
        result.isValid = false;
        result.errors.push(`Constraint ${constraint.id} has no elements`);
      }

      for (const element of constraint.elements) {
        if (!element.isValid()) {
          result.isValid = false;
          result.errors.push(`Constraint ${constraint.id} references invalid element ${element.id}`);
        }
      }
    }

    // Check for potential conflicts
    const conflicts = this.detectConflicts();
    if (conflicts.length > 0) {
      result.warnings.push(`Detected ${conflicts.length} potentially conflicting constraints`);
    }

    // Check for redundant constraints
    const redundantCount = Array.from(this.constraints.values())
      .filter(c => c.status === ConstraintStatus.Redundant).length;
    if (redundantCount > 0) {
      result.warnings.push(`Found ${redundantCount} redundant constraints`);
    }

    return result;
  }

  /**
   * Update solver configuration
   */
  updateConfig(newConfig: Partial<SolverConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get current solver configuration
   */
  getConfig(): SolverConfig {
    return { ...this.config };
  }
}