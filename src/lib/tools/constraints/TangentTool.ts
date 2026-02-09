import { ConstraintTool } from './ConstraintTool';
import { GeometryElement } from '@/lib/geometry/sketch/GeometryElement';
import { TangentConstraint } from '@/lib/geometry/constraints/Constraint';

/**
 * Tool for applying tangent constraints between lines and curves
 */
export class TangentTool extends ConstraintTool {
  constructor() {
    super(
      'tangent',
      'Tangent',
      'Make a line tangent to a curve',
      'tangent',
      2, // Requires 2 elements
      ['Line', 'Circle', 'Arc'], // Works with lines and curves
      'T'
    );
  }

  /**
   * Build tangent constraint
   */
  protected buildConstraint(elements: GeometryElement[]): TangentConstraint | null {
    if (elements.length < 2) {
      return null;
    }

    const [elem1, elem2] = elements;
    
    // Find line and curve
    let line: GeometryElement | null = null;
    let curve: GeometryElement | null = null;

    if (elem1.type === 'Line' && (elem2.type === 'Circle' || elem2.type === 'Arc')) {
      line = elem1;
      curve = elem2;
    } else if (elem2.type === 'Line' && (elem1.type === 'Circle' || elem1.type === 'Arc')) {
      line = elem2;
      curve = elem1;
    } else {
      throw new Error('Tangent constraint requires one line and one circle/arc');
    }

    return new TangentConstraint(line, curve);
  }

  /**
   * Get help text
   */
  getHelpText(): string {
    return 'Select a line and a circle/arc to make them tangent. Press Escape to cancel.';
  }
}