import { Point } from '../core/Point';
import { Vector } from '../core/Vector';
import { Plane } from '../core/Plane';
import { Transform } from '../core/Transform';
import { GeometryElement, Line, Arc, Circle } from '../sketch/GeometryElement';
import { Sketch } from '../sketch/Sketch';
import { Part } from '../data/Part';
import { Assembly } from '../data/Assembly';
import { Material } from '../data/Material';

/**
 * Validation error severity levels
 */
export enum ValidationSeverity {
  Error = 'error',
  Warning = 'warning',
  Info = 'info'
}

/**
 * Validation error details
 */
export interface ValidationError {
  severity: ValidationSeverity;
  code: string;
  message: string;
  element?: string; // ID of the element causing the error
  suggestion?: string;
}

/**
 * Validation result
 */
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
  info: ValidationError[];
}

/**
 * Comprehensive geometry validation system
 */
export class GeometryValidator {
  private tolerance: number;

  constructor(tolerance: number = 1e-6) {
    this.tolerance = tolerance;
  }

  /**
   * Validate a point
   */
  validatePoint(point: Point): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      info: []
    };

    // Check for NaN or infinite values
    if (!isFinite(point.x) || !isFinite(point.y) || !isFinite(point.z)) {
      result.isValid = false;
      result.errors.push({
        severity: ValidationSeverity.Error,
        code: 'POINT_INVALID_COORDINATES',
        message: 'Point contains invalid coordinates (NaN or Infinity)',
        suggestion: 'Ensure all coordinate values are finite numbers'
      });
    }

    // Check for extremely large coordinates
    const maxCoordinate = Math.max(Math.abs(point.x), Math.abs(point.y), Math.abs(point.z));
    if (maxCoordinate > 1e10) {
      result.warnings.push({
        severity: ValidationSeverity.Warning,
        code: 'POINT_LARGE_COORDINATES',
        message: 'Point has very large coordinates which may cause precision issues',
        suggestion: 'Consider scaling down the geometry or using different units'
      });
    }

    return result;
  }

  /**
   * Validate a vector
   */
  validateVector(vector: Vector): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      info: []
    };

    // Check for NaN or infinite values
    if (!isFinite(vector.x) || !isFinite(vector.y) || !isFinite(vector.z)) {
      result.isValid = false;
      result.errors.push({
        severity: ValidationSeverity.Error,
        code: 'VECTOR_INVALID_COMPONENTS',
        message: 'Vector contains invalid components (NaN or Infinity)',
        suggestion: 'Ensure all vector components are finite numbers'
      });
    }

    // Check for zero vector where it might not be intended
    if (vector.length() < this.tolerance) {
      result.warnings.push({
        severity: ValidationSeverity.Warning,
        code: 'VECTOR_ZERO_LENGTH',
        message: 'Vector has zero or near-zero length',
        suggestion: 'Verify that a zero vector is intended for this operation'
      });
    }

    return result;
  }

  /**
   * Validate a plane
   */
  validatePlane(plane: Plane): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      info: []
    };

    // Validate origin point
    const originValidation = this.validatePoint(plane.origin);
    this.mergeValidationResults(result, originValidation);

    // Validate normal vector
    const normalValidation = this.validateVector(plane.normal);
    this.mergeValidationResults(result, normalValidation);

    // Check if normal is normalized
    const normalLength = plane.normal.length();
    if (Math.abs(normalLength - 1.0) > this.tolerance) {
      result.warnings.push({
        severity: ValidationSeverity.Warning,
        code: 'PLANE_NORMAL_NOT_NORMALIZED',
        message: 'Plane normal vector is not normalized',
        suggestion: 'Normalize the normal vector for consistent behavior'
      });
    }

    // Validate coordinate system orthogonality
    const uDotV = plane.uAxis.dot(plane.vAxis);
    if (Math.abs(uDotV) > this.tolerance) {
      result.errors.push({
        severity: ValidationSeverity.Error,
        code: 'PLANE_NON_ORTHOGONAL_AXES',
        message: 'Plane coordinate axes are not orthogonal',
        suggestion: 'Ensure U and V axes are perpendicular'
      });
      result.isValid = false;
    }

    return result;
  }

  /**
   * Validate a transform
   */
  validateTransform(transform: Transform): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      info: []
    };

    // Check determinant for invertibility
    const det = transform.determinant();
    if (Math.abs(det) < this.tolerance) {
      result.errors.push({
        severity: ValidationSeverity.Error,
        code: 'TRANSFORM_SINGULAR',
        message: 'Transform matrix is singular (not invertible)',
        suggestion: 'Ensure the transform matrix has a non-zero determinant'
      });
      result.isValid = false;
    }

    // Check for negative determinant (reflection)
    if (det < 0) {
      result.warnings.push({
        severity: ValidationSeverity.Warning,
        code: 'TRANSFORM_REFLECTION',
        message: 'Transform contains a reflection (negative determinant)',
        suggestion: 'Verify that reflection is intended'
      });
    }

    // Check matrix elements for validity
    const matrix = transform.getMatrix();
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        if (!isFinite(matrix[i][j])) {
          result.isValid = false;
          result.errors.push({
            severity: ValidationSeverity.Error,
            code: 'TRANSFORM_INVALID_ELEMENT',
            message: `Transform matrix contains invalid element at [${i}][${j}]`,
            suggestion: 'Ensure all matrix elements are finite numbers'
          });
        }
      }
    }

    return result;
  }

  /**
   * Validate a geometry element
   */
  validateGeometryElement(element: GeometryElement): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      info: []
    };

    // Basic element validation
    if (!element.isValid()) {
      result.isValid = false;
      result.errors.push({
        severity: ValidationSeverity.Error,
        code: 'ELEMENT_INVALID',
        message: `Geometry element ${element.id} is invalid`,
        element: element.id,
        suggestion: 'Check element parameters and constraints'
      });
    }

    // Validate control points
    const controlPoints = element.getControlPoints();
    for (let i = 0; i < controlPoints.length; i++) {
      const pointValidation = this.validatePoint(controlPoints[i]);
      if (!pointValidation.isValid) {
        result.isValid = false;
        result.errors.push({
          severity: ValidationSeverity.Error,
          code: 'ELEMENT_INVALID_CONTROL_POINT',
          message: `Control point ${i} of element ${element.id} is invalid`,
          element: element.id,
          suggestion: 'Verify control point coordinates'
        });
      }
    }

    // Type-specific validation
    if (element instanceof Line) {
      this.validateLine(element, result);
    } else if (element instanceof Arc) {
      this.validateArc(element, result);
    } else if (element instanceof Circle) {
      this.validateCircle(element, result);
    }

    return result;
  }

  /**
   * Validate a line element
   */
  private validateLine(line: Line, result: ValidationResult): void {
    const length = line.getLength();
    if (length < this.tolerance) {
      result.warnings.push({
        severity: ValidationSeverity.Warning,
        code: 'LINE_ZERO_LENGTH',
        message: 'Line has zero or near-zero length',
        element: line.id,
        suggestion: 'Verify that start and end points are different'
      });
    }
  }

  /**
   * Validate an arc element
   */
  private validateArc(arc: Arc, result: ValidationResult): void {
    if (arc.radius <= 0) {
      result.isValid = false;
      result.errors.push({
        severity: ValidationSeverity.Error,
        code: 'ARC_INVALID_RADIUS',
        message: 'Arc has invalid radius',
        element: arc.id,
        suggestion: 'Radius must be positive'
      });
    }

    const angleSpan = Math.abs(arc.endAngle - arc.startAngle);
    if (angleSpan < this.tolerance) {
      result.warnings.push({
        severity: ValidationSeverity.Warning,
        code: 'ARC_ZERO_SPAN',
        message: 'Arc has zero or near-zero angular span',
        element: arc.id,
        suggestion: 'Verify start and end angles are different'
      });
    }

    if (angleSpan > 2 * Math.PI + this.tolerance) {
      result.warnings.push({
        severity: ValidationSeverity.Warning,
        code: 'ARC_LARGE_SPAN',
        message: 'Arc spans more than 360 degrees',
        element: arc.id,
        suggestion: 'Consider using a circle instead'
      });
    }
  }

  /**
   * Validate a circle element
   */
  private validateCircle(circle: Circle, result: ValidationResult): void {
    if (circle.radius <= 0) {
      result.isValid = false;
      result.errors.push({
        severity: ValidationSeverity.Error,
        code: 'CIRCLE_INVALID_RADIUS',
        message: 'Circle has invalid radius',
        element: circle.id,
        suggestion: 'Radius must be positive'
      });
    }
  }

  /**
   * Validate a sketch
   */
  validateSketch(sketch: Sketch): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      info: []
    };

    // Validate sketch plane
    const planeValidation = this.validatePlane(sketch.plane);
    this.mergeValidationResults(result, planeValidation);

    // Validate all elements
    for (const element of sketch.getAllElements()) {
      const elementValidation = this.validateGeometryElement(element);
      this.mergeValidationResults(result, elementValidation);
    }

    // Check for duplicate elements
    const elements = sketch.getAllElements();
    for (let i = 0; i < elements.length; i++) {
      for (let j = i + 1; j < elements.length; j++) {
        if (this.areElementsCoincident(elements[i], elements[j])) {
          result.warnings.push({
            severity: ValidationSeverity.Warning,
            code: 'SKETCH_DUPLICATE_ELEMENTS',
            message: `Elements ${elements[i].id} and ${elements[j].id} are coincident`,
            suggestion: 'Remove duplicate elements'
          });
        }
      }
    }

    // Use sketch's own validation
    const sketchValidation = sketch.validate();
    if (!sketchValidation.isValid) {
      result.isValid = false;
      for (const error of sketchValidation.errors) {
        result.errors.push({
          severity: ValidationSeverity.Error,
          code: 'SKETCH_VALIDATION_ERROR',
          message: error,
          suggestion: 'Fix sketch validation errors'
        });
      }
    }

    return result;
  }

  /**
   * Validate a part
   */
  validatePart(part: Part): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      info: []
    };

    // Validate transform
    const transformValidation = this.validateTransform(part.transform);
    this.mergeValidationResults(result, transformValidation);

    // Validate features
    for (const feature of part.getAllFeatures()) {
      if (feature.sketch) {
        const sketchValidation = this.validateSketch(feature.sketch);
        this.mergeValidationResults(result, sketchValidation);
      }
    }

    // Use part's own validation
    const partValidation = part.validate();
    if (!partValidation.isValid) {
      result.isValid = false;
      for (const error of partValidation.errors) {
        result.errors.push({
          severity: ValidationSeverity.Error,
          code: 'PART_VALIDATION_ERROR',
          message: error,
          element: part.id,
          suggestion: 'Fix part validation errors'
        });
      }
    }

    return result;
  }

  /**
   * Validate an assembly
   */
  validateAssembly(assembly: Assembly): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      info: []
    };

    // Validate assembly transform
    const transformValidation = this.validateTransform(assembly.transform);
    this.mergeValidationResults(result, transformValidation);

    // Validate part instance transforms
    for (const instance of assembly.getAllPartInstances()) {
      const instanceTransformValidation = this.validateTransform(instance.transform);
      this.mergeValidationResults(result, instanceTransformValidation);
    }

    // Use assembly's own validation
    const assemblyValidation = assembly.validate();
    if (!assemblyValidation.isValid) {
      result.isValid = false;
      for (const error of assemblyValidation.errors) {
        result.errors.push({
          severity: ValidationSeverity.Error,
          code: 'ASSEMBLY_VALIDATION_ERROR',
          message: error,
          element: assembly.id,
          suggestion: 'Fix assembly validation errors'
        });
      }
    }

    return result;
  }

  /**
   * Check if two geometry elements are coincident
   */
  private areElementsCoincident(element1: GeometryElement, element2: GeometryElement): boolean {
    if (element1.type !== element2.type) {
      return false;
    }

    const points1 = element1.getControlPoints();
    const points2 = element2.getControlPoints();

    if (points1.length !== points2.length) {
      return false;
    }

    for (let i = 0; i < points1.length; i++) {
      if (!points1[i].equals(points2[i], this.tolerance)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Merge validation results
   */
  private mergeValidationResults(target: ValidationResult, source: ValidationResult): void {
    if (!source.isValid) {
      target.isValid = false;
    }
    target.errors.push(...source.errors);
    target.warnings.push(...source.warnings);
    target.info.push(...source.info);
  }

  /**
   * Set validation tolerance
   */
  setTolerance(tolerance: number): void {
    this.tolerance = tolerance;
  }

  /**
   * Get validation tolerance
   */
  getTolerance(): number {
    return this.tolerance;
  }
}