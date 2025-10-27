import { Point } from './Point';
import { Vector } from './Vector';

/**
 * Represents a 4x4 transformation matrix for 3D transformations
 */
export class Transform {
  private matrix: number[][];

  constructor(matrix?: number[][]) {
    if (matrix) {
      this.matrix = matrix.map(row => [...row]);
    } else {
      // Initialize as identity matrix
      this.matrix = [
        [1, 0, 0, 0],
        [0, 1, 0, 0],
        [0, 0, 1, 0],
        [0, 0, 0, 1]
      ];
    }
  }

  /**
   * Create a copy of this transform
   */
  clone(): Transform {
    return new Transform(this.matrix);
  }

  /**
   * Get the transformation matrix
   */
  getMatrix(): number[][] {
    return this.matrix.map(row => [...row]);
  }

  /**
   * Set the transformation matrix
   */
  setMatrix(matrix: number[][]): void {
    this.matrix = matrix.map(row => [...row]);
  }

  /**
   * Transform a point using this transformation
   */
  transformPoint(point: Point): Point {
    const x = this.matrix[0][0] * point.x + this.matrix[0][1] * point.y + this.matrix[0][2] * point.z + this.matrix[0][3];
    const y = this.matrix[1][0] * point.x + this.matrix[1][1] * point.y + this.matrix[1][2] * point.z + this.matrix[1][3];
    const z = this.matrix[2][0] * point.x + this.matrix[2][1] * point.y + this.matrix[2][2] * point.z + this.matrix[2][3];
    const w = this.matrix[3][0] * point.x + this.matrix[3][1] * point.y + this.matrix[3][2] * point.z + this.matrix[3][3];
    
    if (Math.abs(w) < 1e-10) {
      throw new Error('Invalid transformation: w component is zero');
    }
    
    return new Point(x / w, y / w, z / w);
  }

  /**
   * Transform a vector using this transformation (ignores translation)
   */
  transformVector(vector: Vector): Vector {
    const x = this.matrix[0][0] * vector.x + this.matrix[0][1] * vector.y + this.matrix[0][2] * vector.z;
    const y = this.matrix[1][0] * vector.x + this.matrix[1][1] * vector.y + this.matrix[1][2] * vector.z;
    const z = this.matrix[2][0] * vector.x + this.matrix[2][1] * vector.y + this.matrix[2][2] * vector.z;
    
    return new Vector(x, y, z);
  }

  /**
   * Multiply this transform with another transform
   */
  multiply(other: Transform): Transform {
    const result = new Transform();
    const a = this.matrix;
    const b = other.matrix;
    
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        result.matrix[i][j] = 0;
        for (let k = 0; k < 4; k++) {
          result.matrix[i][j] += a[i][k] * b[k][j];
        }
      }
    }
    
    return result;
  }

  /**
   * Calculate the inverse of this transform
   */
  inverse(): Transform {
    const m = this.matrix;
    const inv = Array(4).fill(0).map(() => Array(4).fill(0));
    
    // Calculate determinant
    const det = this.determinant();
    if (Math.abs(det) < 1e-10) {
      throw new Error('Transform is not invertible (determinant is zero)');
    }
    
    // Calculate adjugate matrix
    inv[0][0] = m[1][1] * (m[2][2] * m[3][3] - m[2][3] * m[3][2]) - m[1][2] * (m[2][1] * m[3][3] - m[2][3] * m[3][1]) + m[1][3] * (m[2][1] * m[3][2] - m[2][2] * m[3][1]);
    inv[0][1] = -(m[0][1] * (m[2][2] * m[3][3] - m[2][3] * m[3][2]) - m[0][2] * (m[2][1] * m[3][3] - m[2][3] * m[3][1]) + m[0][3] * (m[2][1] * m[3][2] - m[2][2] * m[3][1]));
    inv[0][2] = m[0][1] * (m[1][2] * m[3][3] - m[1][3] * m[3][2]) - m[0][2] * (m[1][1] * m[3][3] - m[1][3] * m[3][1]) + m[0][3] * (m[1][1] * m[3][2] - m[1][2] * m[3][1]);
    inv[0][3] = -(m[0][1] * (m[1][2] * m[2][3] - m[1][3] * m[2][2]) - m[0][2] * (m[1][1] * m[2][3] - m[1][3] * m[2][1]) + m[0][3] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]));
    
    inv[1][0] = -(m[1][0] * (m[2][2] * m[3][3] - m[2][3] * m[3][2]) - m[1][2] * (m[2][0] * m[3][3] - m[2][3] * m[3][0]) + m[1][3] * (m[2][0] * m[3][2] - m[2][2] * m[3][0]));
    inv[1][1] = m[0][0] * (m[2][2] * m[3][3] - m[2][3] * m[3][2]) - m[0][2] * (m[2][0] * m[3][3] - m[2][3] * m[3][0]) + m[0][3] * (m[2][0] * m[3][2] - m[2][2] * m[3][0]);
    inv[1][2] = -(m[0][0] * (m[1][2] * m[3][3] - m[1][3] * m[3][2]) - m[0][2] * (m[1][0] * m[3][3] - m[1][3] * m[3][0]) + m[0][3] * (m[1][0] * m[3][2] - m[1][2] * m[3][0]));
    inv[1][3] = m[0][0] * (m[1][2] * m[2][3] - m[1][3] * m[2][2]) - m[0][2] * (m[1][0] * m[2][3] - m[1][3] * m[2][0]) + m[0][3] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]);
    
    inv[2][0] = m[1][0] * (m[2][1] * m[3][3] - m[2][3] * m[3][1]) - m[1][1] * (m[2][0] * m[3][3] - m[2][3] * m[3][0]) + m[1][3] * (m[2][0] * m[3][1] - m[2][1] * m[3][0]);
    inv[2][1] = -(m[0][0] * (m[2][1] * m[3][3] - m[2][3] * m[3][1]) - m[0][1] * (m[2][0] * m[3][3] - m[2][3] * m[3][0]) + m[0][3] * (m[2][0] * m[3][1] - m[2][1] * m[3][0]));
    inv[2][2] = m[0][0] * (m[1][1] * m[3][3] - m[1][3] * m[3][1]) - m[0][1] * (m[1][0] * m[3][3] - m[1][3] * m[3][0]) + m[0][3] * (m[1][0] * m[3][1] - m[1][1] * m[3][0]);
    inv[2][3] = -(m[0][0] * (m[1][1] * m[2][3] - m[1][3] * m[2][1]) - m[0][1] * (m[1][0] * m[2][3] - m[1][3] * m[2][0]) + m[0][3] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]));
    
    inv[3][0] = -(m[1][0] * (m[2][1] * m[3][2] - m[2][2] * m[3][1]) - m[1][1] * (m[2][0] * m[3][2] - m[2][2] * m[3][0]) + m[1][2] * (m[2][0] * m[3][1] - m[2][1] * m[3][0]));
    inv[3][1] = m[0][0] * (m[2][1] * m[3][2] - m[2][2] * m[3][1]) - m[0][1] * (m[2][0] * m[3][2] - m[2][2] * m[3][0]) + m[0][2] * (m[2][0] * m[3][1] - m[2][1] * m[3][0]);
    inv[3][2] = -(m[0][0] * (m[1][1] * m[3][2] - m[1][2] * m[3][1]) - m[0][1] * (m[1][0] * m[3][2] - m[1][2] * m[3][0]) + m[0][2] * (m[1][0] * m[3][1] - m[1][1] * m[3][0]));
    inv[3][3] = m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
    
    // Divide by determinant
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        inv[i][j] /= det;
      }
    }
    
    return new Transform(inv);
  }

  /**
   * Calculate the determinant of this transform
   */
  determinant(): number {
    const m = this.matrix;
    return (
      m[0][0] * (m[1][1] * (m[2][2] * m[3][3] - m[2][3] * m[3][2]) - m[1][2] * (m[2][1] * m[3][3] - m[2][3] * m[3][1]) + m[1][3] * (m[2][1] * m[3][2] - m[2][2] * m[3][1])) -
      m[0][1] * (m[1][0] * (m[2][2] * m[3][3] - m[2][3] * m[3][2]) - m[1][2] * (m[2][0] * m[3][3] - m[2][3] * m[3][0]) + m[1][3] * (m[2][0] * m[3][2] - m[2][2] * m[3][0])) +
      m[0][2] * (m[1][0] * (m[2][1] * m[3][3] - m[2][3] * m[3][1]) - m[1][1] * (m[2][0] * m[3][3] - m[2][3] * m[3][0]) + m[1][3] * (m[2][0] * m[3][1] - m[2][1] * m[3][0])) -
      m[0][3] * (m[1][0] * (m[2][1] * m[3][2] - m[2][2] * m[3][1]) - m[1][1] * (m[2][0] * m[3][2] - m[2][2] * m[3][0]) + m[1][2] * (m[2][0] * m[3][1] - m[2][1] * m[3][0]))
    );
  }

  /**
   * Check if this transform equals another transform within tolerance
   */
  equals(other: Transform, tolerance: number = 1e-6): boolean {
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        if (Math.abs(this.matrix[i][j] - other.matrix[i][j]) > tolerance) {
          return false;
        }
      }
    }
    return true;
  }

  /**
   * Convert to string representation
   */
  toString(): string {
    return `Transform(\n${this.matrix.map(row => '  [' + row.map(v => v.toFixed(6)).join(', ') + ']').join('\n')}\n)`;
  }

  /**
   * Create identity transform
   */
  static identity(): Transform {
    return new Transform();
  }

  /**
   * Create translation transform
   */
  static translation(x: number, y: number, z: number): Transform {
    return new Transform([
      [1, 0, 0, x],
      [0, 1, 0, y],
      [0, 0, 1, z],
      [0, 0, 0, 1]
    ]);
  }

  /**
   * Create rotation transform around X axis
   */
  static rotationX(angle: number): Transform {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return new Transform([
      [1, 0, 0, 0],
      [0, cos, -sin, 0],
      [0, sin, cos, 0],
      [0, 0, 0, 1]
    ]);
  }

  /**
   * Create rotation transform around Y axis
   */
  static rotationY(angle: number): Transform {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return new Transform([
      [cos, 0, sin, 0],
      [0, 1, 0, 0],
      [-sin, 0, cos, 0],
      [0, 0, 0, 1]
    ]);
  }

  /**
   * Create rotation transform around Z axis
   */
  static rotationZ(angle: number): Transform {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return new Transform([
      [cos, -sin, 0, 0],
      [sin, cos, 0, 0],
      [0, 0, 1, 0],
      [0, 0, 0, 1]
    ]);
  }

  /**
   * Create scaling transform
   */
  static scaling(x: number, y: number, z: number): Transform {
    return new Transform([
      [x, 0, 0, 0],
      [0, y, 0, 0],
      [0, 0, z, 0],
      [0, 0, 0, 1]
    ]);
  }

  /**
   * Create uniform scaling transform
   */
  static uniformScaling(scale: number): Transform {
    return Transform.scaling(scale, scale, scale);
  }
}