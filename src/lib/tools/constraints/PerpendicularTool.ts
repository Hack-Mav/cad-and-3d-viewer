import { ConstraintTool } from './ConstraintTool';
import { GeometryElement } from '@/lib/geometry/sketch/GeometryElement';
import { PerpendicularConstraint } from '@/lib/geometry/constraints/Constraint';

/**
 * Tool for applying perpendicular constraints between lines
 */
export class PerpendicularTool extends ConstraintTool {
  constructor() {
    super(
      'perpendicular',
      'Perpendicular',
      'Make two lines perpendicular',
      'perpendicular-lines',
      2, // Requires 2 elements
      ['Line'], // Only works with lines
      'Shift+P'
    );
  }

  /**
   * Build perpendicular constraint
   */
  protected buildConstraint(elements: GeometryElement[]): PerpendicularConstraint | null {
    if (elements.length < 2) {
      return null;
    }

    const [line1, line2] = elements;
    
    if (line1.type !== 'Line' || line2.type !== 'Line') {
      throw new Error('Perpendicular constraint requires two lines');
    }

    return new PerpendicularConstraint(line1, line2);
  }

  /**
   * Get help text
   */
  getHelpText(): string {
    return 'Select two lines to make them perpendicular. Press Escape to cancel.';
  }
}