import { Point } from '../core/Point';
import { Transform } from '../core/Transform';
import { Material } from '../data/Material';
import { BoundaryRepresentation } from './BoundaryRepresentation';

/**
 * Properties of a solid
 */
export interface SolidProperties {
  volume?: number;
  surfaceArea?: number;
  centerOfMass?: Point;
  boundingBox?: { min: Point; max: Point };
  mass?: number;
}

/**
 * Represents a 3D solid model
 */
export class Solid {
  public id: string;
  public name: string;
  public brep: BoundaryRepresentation;
  public material?: Material;
  public transform: Transform;
  public properties: SolidProperties;
  public isVisible: boolean;
  public created: Date;
  public modified: Date;

  constructor(brep: BoundaryRepresentation, name?: string, id?: string) {
    this.id = id || this.generateId();
    this.name = name || `Solid_${this.id}`;
    this.brep = brep;
    this.transform = Transform.identity();
    this.properties = {};
    this.isVisible = true;
    this.created = new Date();
    this.modified = new Date();
    
    // Compute initial properties
    this.updateProperties();
  }

  private generateId(): string {
    return `solid_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Update computed properties of the solid
   */
  updateProperties(): void {
    this.properties.volume = this.brep.computeVolume();
    this.properties.surfaceArea = this.brep.computeSurfaceArea();
    this.properties.boundingBox = this.brep.getBoundingBox();
    
    // Compute center of mass (simplified as centroid of bounding box)
    if (this.properties.boundingBox) {
      const { min, max } = this.properties.boundingBox;
      this.properties.centerOfMass = new Point(
        (min.x + max.x) / 2,
        (min.y + max.y) / 2,
        (min.z + max.z) / 2
      );
    }
    
    // Update mass if material is assigned
    if (this.material && this.properties.volume !== undefined) {
      this.properties.mass = this.material.calculateMass(this.properties.volume);
    }
    
    this.modified = new Date();
  }

  /**
   * Set material for the solid
   */
  setMaterial(material: Material): void {
    this.material = material;
    this.updateProperties();
  }

  /**
   * Remove material from the solid
   */
  removeMaterial(): void {
    this.material = undefined;
    this.properties.mass = undefined;
    this.modified = new Date();
  }

  /**
   * Apply a transform to the solid
   */
  applyTransform(transform: Transform): void {
    this.transform = this.transform.multiply(transform);
    
    // Transform the B-Rep geometry
    this.transformBRep(transform);
    this.updateProperties();
  }

  /**
   * Set the transform of the solid
   */
  setTransform(transform: Transform): void {
    // Calculate the relative transform
    const relativeTransform = transform.multiply(this.transform.inverse());
    this.applyTransform(relativeTransform);
  }

  /**
   * Transform the B-Rep geometry
   */
  private transformBRep(transform: Transform): void {
    // Transform all vertices
    for (const vertex of this.brep.getAllVertices()) {
      vertex.point = transform.transformPoint(vertex.point);
    }
    
    // Update face normals after transformation
    for (const face of this.brep.getAllFaces()) {
      if (face.normal) {
        face.normal = transform.transformVector(face.normal).normalize();
      }
    }
  }

  /**
   * Get the transformed bounding box in world coordinates
   */
  getWorldBoundingBox(): { min: Point; max: Point } {
    if (!this.properties.boundingBox) {
      return { min: new Point(0, 0, 0), max: new Point(0, 0, 0) };
    }
    
    const { min, max } = this.properties.boundingBox;
    
    // Transform all 8 corners of the bounding box
    const corners = [
      new Point(min.x, min.y, min.z),
      new Point(max.x, min.y, min.z),
      new Point(min.x, max.y, min.z),
      new Point(max.x, max.y, min.z),
      new Point(min.x, min.y, max.z),
      new Point(max.x, min.y, max.z),
      new Point(min.x, max.y, max.z),
      new Point(max.x, max.y, max.z)
    ];
    
    const transformedCorners = corners.map(corner => 
      this.transform.transformPoint(corner)
    );
    
    // Find new min/max
    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
    
    for (const corner of transformedCorners) {
      minX = Math.min(minX, corner.x);
      minY = Math.min(minY, corner.y);
      minZ = Math.min(minZ, corner.z);
      maxX = Math.max(maxX, corner.x);
      maxY = Math.max(maxY, corner.y);
      maxZ = Math.max(maxZ, corner.z);
    }
    
    return {
      min: new Point(minX, minY, minZ),
      max: new Point(maxX, maxY, maxZ)
    };
  }

  /**
   * Check if a point is inside the solid
   */
  containsPoint(point: Point, tolerance: number = 1e-6): boolean {
    // Transform point to local coordinates
    const localPoint = this.transform.inverse().transformPoint(point);
    
    // Simple bounding box check first
    if (this.properties.boundingBox) {
      const { min, max } = this.properties.boundingBox;
      if (localPoint.x < min.x - tolerance || localPoint.x > max.x + tolerance ||
          localPoint.y < min.y - tolerance || localPoint.y > max.y + tolerance ||
          localPoint.z < min.z - tolerance || localPoint.z > max.z + tolerance) {
        return false;
      }
    }
    
    // For a complete implementation, you would use ray casting
    // or other geometric algorithms to determine inside/outside
    // This is a simplified placeholder
    return true;
  }

  /**
   * Get the closest point on the solid surface to a given point
   */
  getClosestPointOnSurface(point: Point): Point {
    // Transform point to local coordinates
    const localPoint = this.transform.inverse().transformPoint(point);
    
    let closestPoint = localPoint;
    let minDistance = Infinity;
    
    // Check distance to all faces (simplified)
    for (const face of this.brep.getAllFaces()) {
      for (const vertex of face.getVertices()) {
        const distance = localPoint.distanceTo(vertex.point);
        if (distance < minDistance) {
          minDistance = distance;
          closestPoint = vertex.point;
        }
      }
    }
    
    // Transform back to world coordinates
    return this.transform.transformPoint(closestPoint);
  }

  /**
   * Validate the solid
   */
  validate(): { isValid: boolean; errors: string[]; warnings: string[] } {
    const result = {
      isValid: true,
      errors: [] as string[],
      warnings: [] as string[]
    };
    
    // Validate the B-Rep
    const brepValidation = this.brep.validate();
    if (!brepValidation.isValid) {
      result.isValid = false;
      result.errors.push(...brepValidation.errors);
    }
    
    // Check properties
    if (this.properties.volume !== undefined && this.properties.volume <= 0) {
      result.warnings.push('Solid has zero or negative volume');
    }
    
    if (this.properties.surfaceArea !== undefined && this.properties.surfaceArea <= 0) {
      result.warnings.push('Solid has zero or negative surface area');
    }
    
    // Validate material
    if (this.material) {
      const materialValidation = this.material.validate();
      if (!materialValidation.isValid) {
        result.warnings.push(...materialValidation.errors.map(err => `Material: ${err}`));
      }
    }
    
    return result;
  }

  /**
   * Clone the solid
   */
  clone(): Solid {
    const clonedSolid = new Solid(this.brep.clone(), this.name, this.id);
    clonedSolid.material = this.material?.clone();
    clonedSolid.transform = this.transform.clone();
    clonedSolid.properties = {
      ...this.properties,
      centerOfMass: this.properties.centerOfMass?.clone(),
      boundingBox: this.properties.boundingBox ? {
        min: this.properties.boundingBox.min.clone(),
        max: this.properties.boundingBox.max.clone()
      } : undefined
    };
    clonedSolid.isVisible = this.isVisible;
    clonedSolid.created = new Date(this.created);
    clonedSolid.modified = new Date(this.modified);
    
    return clonedSolid;
  }

  /**
   * Convert to JSON representation
   */
  toJSON(): any {
    return {
      id: this.id,
      name: this.name,
      brep: {
        vertices: Array.from(this.brep.getAllVertices()).map(v => ({
          id: v.id,
          point: [v.point.x, v.point.y, v.point.z]
        })),
        edges: Array.from(this.brep.getAllEdges()).map(e => ({
          id: e.id,
          startVertex: e.startVertex.id,
          endVertex: e.endVertex.id
        })),
        faces: Array.from(this.brep.getAllFaces()).map(f => ({
          id: f.id,
          outerLoop: f.outerLoop.map(e => e.id),
          innerLoops: f.innerLoops.map(loop => loop.map(e => e.id))
        }))
      },
      material: this.material?.toJSON(),
      transform: this.transform.getMatrix(),
      properties: this.properties,
      isVisible: this.isVisible,
      created: this.created.toISOString(),
      modified: this.modified.toISOString()
    };
  }

  /**
   * Convert to string representation
   */
  toString(): string {
    const volume = this.properties.volume?.toFixed(3) || 'unknown';
    return `Solid(${this.name}, volume: ${volume}, faces: ${this.brep.faces.size})`;
  }
}