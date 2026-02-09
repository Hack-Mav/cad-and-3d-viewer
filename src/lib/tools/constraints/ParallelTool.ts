import { ConstraintTool } from './ConstraintTool';
import { GeometryElement } from '@/lib/geometry/sketch/GeometryElement';
import { ParallelConstraint } from '@/lib/geometry/constraints/Constraint';

/**
 * Tool for applying parallel constraints between lines
 */
export class ParallelTool extends ConstraintTool {
  constructor() {
    super(
      'parallel',
      'Parallel',
      'Make two lines parallel',
      'parallel-lines',
      2, // Requires 2 elements
      ['Line'], // Only works with lines
      'P'
    );
  }

  /**
   * Build parallel constraint
   */
  protected buildConstraint(elements: GeometryElement[]): ParallelConstraint | null {
    if (elements.length < 2) {
      return null;
    }

    const [line1, line2] = elements;
    
    if (line1.type !== 'Line' || line2.type !== 'Line') {
      throw new Error('Parallel constraint requires two lines');
    }

    return new ParallelConstraint(line1, line2);
  }

  /**
   * Get help text
   */
  getHelpText(): string {
    return 'Select two lines to make them parallel. Press Escape to cancel.';
  }
}