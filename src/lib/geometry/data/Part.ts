import { Material } from './Material';
import { Transform } from '../core/Transform';
import { Point } from '../core/Point';
import { Sketch } from '../sketch/Sketch';

/**
 * Feature types for parametric modeling
 */
export enum FeatureType {
  Extrude = 'extrude',
  Revolve = 'revolve',
  Loft = 'loft',
  Sweep = 'sweep',
  Fillet = 'fillet',
  Chamfer = 'chamfer',
  Shell = 'shell',
  Draft = 'draft',
  Pattern = 'pattern',
  Boolean = 'boolean'
}

/**
 * Parameters for different feature types
 */
export interface FeatureParameters {
  [key: string]: any;
}

/**
 * Represents a parametric feature in a part
 */
export class Feature {
  public id: string;
  public name: string;
  public type: FeatureType;
  public parameters: FeatureParameters;
  public sketch?: Sketch;
  public dependencies: string[]; // IDs of features this depends on
  public isActive: boolean;
  public created: Date;
  public modified: Date;

  constructor(name: string, type: FeatureType, parameters: FeatureParameters = {}, id?: string) {
    this.id = id || this.generateId();
    this.name = name;
    this.type = type;
    this.parameters = { ...parameters };
    this.dependencies = [];
    this.isActive = true;
    this.created = new Date();
    this.modified = new Date();
  }

  /**
   * Generate a unique ID for this feature
   */
  private generateId(): string {
    return `feature_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Clone this feature
   */
  clone(): Feature {
    const cloned = new Feature(this.name, this.type, this.parameters, this.id);
    cloned.sketch = this.sketch?.clone();
    cloned.dependencies = [...this.dependencies];
    cloned.isActive = this.isActive;
    cloned.created = new Date(this.created);
    cloned.modified = new Date(this.modified);
    return cloned;
  }

  /**
   * Update feature parameters
   */
  updateParameters(newParameters: Partial<FeatureParameters>): void {
    this.parameters = { ...this.parameters, ...newParameters };
    this.modified = new Date();
  }

  /**
   * Add dependency to another feature
   */
  addDependency(featureId: string): void {
    if (!this.dependencies.includes(featureId)) {
      this.dependencies.push(featureId);
      this.modified = new Date();
    }
  }

  /**
   * Remove dependency
   */
  removeDependency(featureId: string): void {
    const index = this.dependencies.indexOf(featureId);
    if (index >= 0) {
      this.dependencies.splice(index, 1);
      this.modified = new Date();
    }
  }

  /**
   * Validate feature
   */
  validate(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!this.name || this.name.trim().length === 0) {
      errors.push('Feature name is required');
    }

    // Validate parameters based on feature type
    switch (this.type) {
      case FeatureType.Extrude:
        if (typeof this.parameters.distance !== 'number' || this.parameters.distance <= 0) {
          errors.push('Extrude distance must be a positive number');
        }
        if (!this.sketch) {
          errors.push('Extrude feature requires a sketch');
        }
        break;

      case FeatureType.Revolve:
        if (typeof this.parameters.angle !== 'number' || this.parameters.angle <= 0) {
          errors.push('Revolve angle must be a positive number');
        }
        if (!this.sketch) {
          errors.push('Revolve feature requires a sketch');
        }
        break;

      case FeatureType.Fillet:
        if (typeof this.parameters.radius !== 'number' || this.parameters.radius <= 0) {
          errors.push('Fillet radius must be a positive number');
        }
        break;

      case FeatureType.Chamfer:
        if (typeof this.parameters.distance !== 'number' || this.parameters.distance <= 0) {
          errors.push('Chamfer distance must be a positive number');
        }
        break;
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Convert to JSON representation
   */
  toJSON(): any {
    return {
      id: this.id,
      name: this.name,
      type: this.type,
      parameters: this.parameters,
      sketch: this.sketch?.toJSON?.() || null,
      dependencies: this.dependencies,
      isActive: this.isActive,
      created: this.created.toISOString(),
      modified: this.modified.toISOString()
    };
  }

  /**
   * Convert to string representation
   */
  toString(): string {
    return `Feature(${this.name}, type: ${this.type})`;
  }
}

/**
 * Properties of a part
 */
export interface PartProperties {
  mass?: number;
  volume?: number;
  surfaceArea?: number;
  centerOfMass?: Point;
  momentOfInertia?: number[][];
  boundingBox?: { min: Point; max: Point };
  customProperties: Record<string, any>;
}

/**
 * Represents a CAD part with features and properties
 */
export class Part {
  public id: string;
  public name: string;
  public description: string;
  public features: Map<string, Feature>;
  public material?: Material;
  public transform: Transform;
  public properties: PartProperties;
  public isVisible: boolean;
  public created: Date;
  public modified: Date;

  constructor(name: string, id?: string) {
    this.id = id || this.generateId();
    this.name = name;
    this.description = '';
    this.features = new Map();
    this.transform = Transform.identity();
    this.properties = {
      customProperties: {}
    };
    this.isVisible = true;
    this.created = new Date();
    this.modified = new Date();
  }

  /**
   * Generate a unique ID for this part
   */
  private generateId(): string {
    return `part_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Add a feature to the part
   */
  addFeature(feature: Feature): void {
    this.features.set(feature.id, feature);
    this.modified = new Date();
  }

  /**
   * Remove a feature from the part
   */
  removeFeature(featureId: string): boolean {
    const removed = this.features.delete(featureId);
    if (removed) {
      // Remove dependencies on this feature from other features
      for (const feature of this.features.values()) {
        feature.removeDependency(featureId);
      }
      this.modified = new Date();
    }
    return removed;
  }

  /**
   * Get a feature by ID
   */
  getFeature(featureId: string): Feature | undefined {
    return this.features.get(featureId);
  }

  /**
   * Get all features
   */
  getAllFeatures(): Feature[] {
    return Array.from(this.features.values());
  }

  /**
   * Get features by type
   */
  getFeaturesByType(type: FeatureType): Feature[] {
    return this.getAllFeatures().filter(feature => feature.type === type);
  }

  /**
   * Get active features only
   */
  getActiveFeatures(): Feature[] {
    return this.getAllFeatures().filter(feature => feature.isActive);
  }

  /**
   * Set material for the part
   */
  setMaterial(material: Material): void {
    this.material = material;
    this.updateMassProperties();
    this.modified = new Date();
  }

  /**
   * Remove material from the part
   */
  removeMaterial(): void {
    this.material = undefined;
    this.properties.mass = undefined;
    this.modified = new Date();
  }

  /**
   * Update part transform
   */
  setTransform(transform: Transform): void {
    this.transform = transform.clone();
    this.modified = new Date();
  }

  /**
   * Apply additional transform
   */
  applyTransform(transform: Transform): void {
    this.transform = this.transform.multiply(transform);
    this.modified = new Date();
  }

  /**
   * Update mass properties based on geometry and material
   */
  private updateMassProperties(): void {
    if (this.material && this.properties.volume !== undefined) {
      this.properties.mass = this.material.calculateMass(this.properties.volume);
    }
  }

  /**
   * Update part properties
   */
  updateProperties(properties: Partial<PartProperties>): void {
    this.properties = { ...this.properties, ...properties };
    this.updateMassProperties();
    this.modified = new Date();
  }

  /**
   * Set custom property
   */
  setCustomProperty(key: string, value: any): void {
    this.properties.customProperties[key] = value;
    this.modified = new Date();
  }

  /**
   * Get custom property
   */
  getCustomProperty(key: string): any {
    return this.properties.customProperties[key];
  }

  /**
   * Get feature tree (features ordered by dependencies)
   */
  getFeatureTree(): Feature[] {
    const features = this.getAllFeatures();
    const sorted: Feature[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();

    const visit = (feature: Feature): void => {
      if (visiting.has(feature.id)) {
        throw new Error(`Circular dependency detected involving feature ${feature.id}`);
      }
      if (visited.has(feature.id)) {
        return;
      }

      visiting.add(feature.id);

      // Visit dependencies first
      for (const depId of feature.dependencies) {
        const depFeature = this.getFeature(depId);
        if (depFeature) {
          visit(depFeature);
        }
      }

      visiting.delete(feature.id);
      visited.add(feature.id);
      sorted.push(feature);
    };

    for (const feature of features) {
      if (!visited.has(feature.id)) {
        visit(feature);
      }
    }

    return sorted;
  }

  /**
   * Validate the part
   */
  validate(): { isValid: boolean; errors: string[]; warnings: string[] } {
    const result = {
      isValid: true,
      errors: [] as string[],
      warnings: [] as string[]
    };

    if (!this.name || this.name.trim().length === 0) {
      result.isValid = false;
      result.errors.push('Part name is required');
    }

    // Validate features
    for (const feature of this.features.values()) {
      const featureValidation = feature.validate();
      if (!featureValidation.isValid) {
        result.isValid = false;
        result.errors.push(...featureValidation.errors.map(err => `Feature ${feature.name}: ${err}`));
      }
    }

    // Check for circular dependencies
    try {
      this.getFeatureTree();
    } catch (error) {
      result.isValid = false;
      result.errors.push(error instanceof Error ? error.message : 'Circular dependency detected');
    }

    // Validate material
    if (this.material) {
      const materialValidation = this.material.validate();
      if (!materialValidation.isValid) {
        result.warnings.push(...materialValidation.errors.map(err => `Material: ${err}`));
      }
    }

    // Check for empty part
    if (this.features.size === 0) {
      result.warnings.push('Part has no features');
    }

    return result;
  }

  /**
   * Clone this part
   */
  clone(): Part {
    const cloned = new Part(this.name, this.id);
    cloned.description = this.description;
    cloned.material = this.material?.clone();
    cloned.transform = this.transform.clone();
    cloned.properties = {
      ...this.properties,
      centerOfMass: this.properties.centerOfMass?.clone(),
      boundingBox: this.properties.boundingBox ? {
        min: this.properties.boundingBox.min.clone(),
        max: this.properties.boundingBox.max.clone()
      } : undefined,
      customProperties: { ...this.properties.customProperties }
    };
    cloned.isVisible = this.isVisible;
    cloned.created = new Date(this.created);
    cloned.modified = new Date(this.modified);

    // Clone features
    for (const feature of this.features.values()) {
      cloned.addFeature(feature.clone());
    }

    return cloned;
  }

  /**
   * Convert to JSON representation
   */
  toJSON(): any {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      features: Array.from(this.features.values()).map(f => f.toJSON()),
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
    return `Part(${this.name}, features: ${this.features.size})`;
  }
}