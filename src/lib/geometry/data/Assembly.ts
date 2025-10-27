import { Part } from './Part';
import { Transform } from '../core/Transform';
import { Point } from '../core/Point';
import { Vector } from '../core/Vector';

/**
 * Types of mate constraints between parts
 */
export enum MateType {
  Coincident = 'coincident',
  Parallel = 'parallel',
  Perpendicular = 'perpendicular',
  Tangent = 'tangent',
  Concentric = 'concentric',
  Distance = 'distance',
  Angle = 'angle',
  Fixed = 'fixed'
}

/**
 * Represents a mate constraint between two parts in an assembly
 */
export class MateConstraint {
  public id: string;
  public name: string;
  public type: MateType;
  public part1Id: string;
  public part2Id: string;
  public parameters: Record<string, any>;
  public isActive: boolean;
  public created: Date;
  public modified: Date;

  constructor(
    name: string,
    type: MateType,
    part1Id: string,
    part2Id: string,
    parameters: Record<string, any> = {},
    id?: string
  ) {
    this.id = id || this.generateId();
    this.name = name;
    this.type = type;
    this.part1Id = part1Id;
    this.part2Id = part2Id;
    this.parameters = { ...parameters };
    this.isActive = true;
    this.created = new Date();
    this.modified = new Date();
  }

  /**
   * Generate a unique ID for this mate constraint
   */
  private generateId(): string {
    return `mate_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Clone this mate constraint
   */
  clone(): MateConstraint {
    const cloned = new MateConstraint(
      this.name,
      this.type,
      this.part1Id,
      this.part2Id,
      this.parameters,
      this.id
    );
    cloned.isActive = this.isActive;
    cloned.created = new Date(this.created);
    cloned.modified = new Date(this.modified);
    return cloned;
  }

  /**
   * Update mate parameters
   */
  updateParameters(newParameters: Partial<Record<string, any>>): void {
    this.parameters = { ...this.parameters, ...newParameters };
    this.modified = new Date();
  }

  /**
   * Validate mate constraint
   */
  validate(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!this.name || this.name.trim().length === 0) {
      errors.push('Mate name is required');
    }

    if (!this.part1Id || !this.part2Id) {
      errors.push('Both parts must be specified');
    }

    if (this.part1Id === this.part2Id) {
      errors.push('Cannot create mate constraint between the same part');
    }

    // Validate parameters based on mate type
    switch (this.type) {
      case MateType.Distance:
        if (typeof this.parameters.distance !== 'number' || this.parameters.distance < 0) {
          errors.push('Distance mate requires a non-negative distance parameter');
        }
        break;

      case MateType.Angle:
        if (typeof this.parameters.angle !== 'number') {
          errors.push('Angle mate requires an angle parameter');
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
      part1Id: this.part1Id,
      part2Id: this.part2Id,
      parameters: this.parameters,
      isActive: this.isActive,
      created: this.created.toISOString(),
      modified: this.modified.toISOString()
    };
  }

  /**
   * Convert to string representation
   */
  toString(): string {
    return `MateConstraint(${this.name}, type: ${this.type})`;
  }
}

/**
 * Represents a part instance in an assembly
 */
export class PartInstance {
  public id: string;
  public partId: string;
  public name: string;
  public transform: Transform;
  public isVisible: boolean;
  public isFixed: boolean;
  public customProperties: Record<string, any>;
  public created: Date;
  public modified: Date;

  constructor(partId: string, name?: string, transform?: Transform, id?: string) {
    this.id = id || this.generateId();
    this.partId = partId;
    this.name = name || `Instance_${this.id}`;
    this.transform = transform?.clone() || Transform.identity();
    this.isVisible = true;
    this.isFixed = false;
    this.customProperties = {};
    this.created = new Date();
    this.modified = new Date();
  }

  /**
   * Generate a unique ID for this part instance
   */
  private generateId(): string {
    return `instance_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Clone this part instance
   */
  clone(): PartInstance {
    const cloned = new PartInstance(this.partId, this.name, this.transform, this.id);
    cloned.isVisible = this.isVisible;
    cloned.isFixed = this.isFixed;
    cloned.customProperties = { ...this.customProperties };
    cloned.created = new Date(this.created);
    cloned.modified = new Date(this.modified);
    return cloned;
  }

  /**
   * Update transform
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
   * Set custom property
   */
  setCustomProperty(key: string, value: any): void {
    this.customProperties[key] = value;
    this.modified = new Date();
  }

  /**
   * Get custom property
   */
  getCustomProperty(key: string): any {
    return this.customProperties[key];
  }

  /**
   * Convert to JSON representation
   */
  toJSON(): any {
    return {
      id: this.id,
      partId: this.partId,
      name: this.name,
      transform: this.transform.getMatrix(),
      isVisible: this.isVisible,
      isFixed: this.isFixed,
      customProperties: this.customProperties,
      created: this.created.toISOString(),
      modified: this.modified.toISOString()
    };
  }

  /**
   * Convert to string representation
   */
  toString(): string {
    return `PartInstance(${this.name}, partId: ${this.partId})`;
  }
}

/**
 * Properties of an assembly
 */
export interface AssemblyProperties {
  totalMass?: number;
  totalVolume?: number;
  centerOfMass?: Point;
  boundingBox?: { min: Point; max: Point };
  interferenceCount?: number;
  customProperties: Record<string, any>;
}

/**
 * Represents an assembly of parts with positioning and constraints
 */
export class Assembly {
  public id: string;
  public name: string;
  public description: string;
  public partInstances: Map<string, PartInstance>;
  public mateConstraints: Map<string, MateConstraint>;
  public subAssemblies: Map<string, Assembly>;
  public transform: Transform;
  public properties: AssemblyProperties;
  public isVisible: boolean;
  public created: Date;
  public modified: Date;

  constructor(name: string, id?: string) {
    this.id = id || this.generateId();
    this.name = name;
    this.description = '';
    this.partInstances = new Map();
    this.mateConstraints = new Map();
    this.subAssemblies = new Map();
    this.transform = Transform.identity();
    this.properties = {
      customProperties: {}
    };
    this.isVisible = true;
    this.created = new Date();
    this.modified = new Date();
  }

  /**
   * Generate a unique ID for this assembly
   */
  private generateId(): string {
    return `assembly_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Add a part instance to the assembly
   */
  addPartInstance(partInstance: PartInstance): void {
    this.partInstances.set(partInstance.id, partInstance);
    this.modified = new Date();
  }

  /**
   * Remove a part instance from the assembly
   */
  removePartInstance(instanceId: string): boolean {
    const removed = this.partInstances.delete(instanceId);
    if (removed) {
      // Remove mate constraints involving this instance
      const matesToRemove: string[] = [];
      for (const mate of this.mateConstraints.values()) {
        if (mate.part1Id === instanceId || mate.part2Id === instanceId) {
          matesToRemove.push(mate.id);
        }
      }
      for (const mateId of matesToRemove) {
        this.mateConstraints.delete(mateId);
      }
      this.modified = new Date();
    }
    return removed;
  }

  /**
   * Get a part instance by ID
   */
  getPartInstance(instanceId: string): PartInstance | undefined {
    return this.partInstances.get(instanceId);
  }

  /**
   * Get all part instances
   */
  getAllPartInstances(): PartInstance[] {
    return Array.from(this.partInstances.values());
  }

  /**
   * Add a mate constraint
   */
  addMateConstraint(mateConstraint: MateConstraint): void {
    // Validate that both parts exist in the assembly
    if (!this.partInstances.has(mateConstraint.part1Id) || 
        !this.partInstances.has(mateConstraint.part2Id)) {
      throw new Error('Both parts must exist in the assembly before adding mate constraint');
    }

    this.mateConstraints.set(mateConstraint.id, mateConstraint);
    this.modified = new Date();
  }

  /**
   * Remove a mate constraint
   */
  removeMateConstraint(mateId: string): boolean {
    const removed = this.mateConstraints.delete(mateId);
    if (removed) {
      this.modified = new Date();
    }
    return removed;
  }

  /**
   * Get a mate constraint by ID
   */
  getMateConstraint(mateId: string): MateConstraint | undefined {
    return this.mateConstraints.get(mateId);
  }

  /**
   * Get all mate constraints
   */
  getAllMateConstraints(): MateConstraint[] {
    return Array.from(this.mateConstraints.values());
  }

  /**
   * Get mate constraints for a specific part instance
   */
  getMateConstraintsForPart(instanceId: string): MateConstraint[] {
    return this.getAllMateConstraints().filter(mate =>
      mate.part1Id === instanceId || mate.part2Id === instanceId
    );
  }

  /**
   * Add a sub-assembly
   */
  addSubAssembly(subAssembly: Assembly): void {
    this.subAssemblies.set(subAssembly.id, subAssembly);
    this.modified = new Date();
  }

  /**
   * Remove a sub-assembly
   */
  removeSubAssembly(assemblyId: string): boolean {
    const removed = this.subAssemblies.delete(assemblyId);
    if (removed) {
      this.modified = new Date();
    }
    return removed;
  }

  /**
   * Get all sub-assemblies
   */
  getAllSubAssemblies(): Assembly[] {
    return Array.from(this.subAssemblies.values());
  }

  /**
   * Update assembly transform
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
   * Update assembly properties
   */
  updateProperties(properties: Partial<AssemblyProperties>): void {
    this.properties = { ...this.properties, ...properties };
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
   * Detect interference between parts
   */
  detectInterferences(): { part1Id: string; part2Id: string; volume: number }[] {
    // This is a placeholder implementation
    // In a full implementation, you would use computational geometry
    // to detect actual geometric interferences
    const interferences: { part1Id: string; part2Id: string; volume: number }[] = [];
    
    const instances = this.getAllPartInstances();
    for (let i = 0; i < instances.length; i++) {
      for (let j = i + 1; j < instances.length; j++) {
        // Simplified check - in reality, you'd check actual geometry
        const distance = this.calculateInstanceDistance(instances[i], instances[j]);
        if (distance < 0.001) { // Threshold for interference
          interferences.push({
            part1Id: instances[i].id,
            part2Id: instances[j].id,
            volume: Math.abs(distance) * 1000 // Simplified volume calculation
          });
        }
      }
    }

    return interferences;
  }

  /**
   * Calculate distance between two part instances (simplified)
   */
  private calculateInstanceDistance(instance1: PartInstance, instance2: PartInstance): number {
    // Extract translation from transforms
    const pos1 = instance1.transform.transformPoint(new Point(0, 0, 0));
    const pos2 = instance2.transform.transformPoint(new Point(0, 0, 0));
    return pos1.distanceTo(pos2);
  }

  /**
   * Get assembly statistics
   */
  getStatistics(): {
    partCount: number;
    mateCount: number;
    subAssemblyCount: number;
    totalParts: number; // including sub-assemblies
    interferenceCount: number;
  } {
    let totalParts = this.partInstances.size;
    
    // Count parts in sub-assemblies recursively
    for (const subAssembly of this.subAssemblies.values()) {
      const subStats = subAssembly.getStatistics();
      totalParts += subStats.totalParts;
    }

    return {
      partCount: this.partInstances.size,
      mateCount: this.mateConstraints.size,
      subAssemblyCount: this.subAssemblies.size,
      totalParts,
      interferenceCount: this.detectInterferences().length
    };
  }

  /**
   * Validate the assembly
   */
  validate(): { isValid: boolean; errors: string[]; warnings: string[] } {
    const result = {
      isValid: true,
      errors: [] as string[],
      warnings: [] as string[]
    };

    if (!this.name || this.name.trim().length === 0) {
      result.isValid = false;
      result.errors.push('Assembly name is required');
    }

    // Validate mate constraints
    for (const mate of this.mateConstraints.values()) {
      const mateValidation = mate.validate();
      if (!mateValidation.isValid) {
        result.isValid = false;
        result.errors.push(...mateValidation.errors.map(err => `Mate ${mate.name}: ${err}`));
      }

      // Check if referenced parts exist
      if (!this.partInstances.has(mate.part1Id)) {
        result.isValid = false;
        result.errors.push(`Mate ${mate.name} references non-existent part ${mate.part1Id}`);
      }
      if (!this.partInstances.has(mate.part2Id)) {
        result.isValid = false;
        result.errors.push(`Mate ${mate.name} references non-existent part ${mate.part2Id}`);
      }
    }

    // Validate sub-assemblies
    for (const subAssembly of this.subAssemblies.values()) {
      const subValidation = subAssembly.validate();
      if (!subValidation.isValid) {
        result.isValid = false;
        result.errors.push(...subValidation.errors.map(err => `Sub-assembly ${subAssembly.name}: ${err}`));
      }
      result.warnings.push(...subValidation.warnings.map(warn => `Sub-assembly ${subAssembly.name}: ${warn}`));
    }

    // Check for interferences
    const interferences = this.detectInterferences();
    if (interferences.length > 0) {
      result.warnings.push(`Detected ${interferences.length} part interferences`);
    }

    // Check for empty assembly
    if (this.partInstances.size === 0 && this.subAssemblies.size === 0) {
      result.warnings.push('Assembly is empty');
    }

    return result;
  }

  /**
   * Clone this assembly
   */
  clone(): Assembly {
    const cloned = new Assembly(this.name, this.id);
    cloned.description = this.description;
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

    // Clone part instances
    for (const instance of this.partInstances.values()) {
      cloned.addPartInstance(instance.clone());
    }

    // Clone mate constraints
    for (const mate of this.mateConstraints.values()) {
      cloned.mateConstraints.set(mate.id, mate.clone());
    }

    // Clone sub-assemblies
    for (const subAssembly of this.subAssemblies.values()) {
      cloned.addSubAssembly(subAssembly.clone());
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
      partInstances: Array.from(this.partInstances.values()).map(p => p.toJSON()),
      mateConstraints: Array.from(this.mateConstraints.values()).map(m => m.toJSON()),
      subAssemblies: Array.from(this.subAssemblies.values()).map(a => a.toJSON()),
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
    const stats = this.getStatistics();
    return `Assembly(${this.name}, parts: ${stats.totalParts}, mates: ${stats.mateCount})`;
  }
}