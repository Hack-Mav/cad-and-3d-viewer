import { ConstraintTool } from './ConstraintTool';
import { GeometryElement } from '@/lib/geometry/sketch/GeometryElement';
import { EqualLengthConstraint } from '@/lib/geometry/constraints/Constraint';

/**
 * Tool for applying equal length constraints between lines
 */
export class EqualTool extends ConstraintTool {
  constructor() {
    super(
      'equal',
      'Equal',
      'Make two lines equal in length',
      'equal',
      2, // Requires 2 elements
      ['Line'], // Only works with lines
      'E'
    );
  }

  /**
   * Build equal length constraint
   */
  protected buildConstraint(elements: GeometryElement[]): EqualLengthConstraint | null {
    if (elements.length < 2) {
      return null;
    }

    const [line1, line2] = elements;
    
    if (line1.type !== 'Line' || line2.type !== 'Line') {
      throw new Error('Equal constraint requires two lines');
    }

    return new EqualLengthConstraint(line1, line2);
  }

  /**
   * Get help text
   */
  getHelpText(): string {
    return 'Select two lines to make them equal in length. Press Escape to cancel.';
  }
}