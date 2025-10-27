import { Part } from './Part';
import { Assembly } from './Assembly';
import { Material } from './Material';

/**
 * Project settings and configuration
 */
export interface ProjectSettings {
  units: 'mm' | 'cm' | 'm' | 'in' | 'ft';
  precision: number;
  defaultMaterial?: string; // Material ID
  autoSave: boolean;
  autoSaveInterval: number; // minutes
  customSettings: Record<string, any>;
}

/**
 * Project metadata
 */
export interface ProjectMetadata {
  author: string;
  company: string;
  description: string;
  keywords: string[];
  version: string;
  cadVersion: string;
  customMetadata: Record<string, any>;
}

/**
 * Represents a complete CAD project with parts, assemblies, and materials
 */
export class Project {
  public id: string;
  public name: string;
  public version: string;
  public parts: Map<string, Part>;
  public assemblies: Map<string, Assembly>;
  public materials: Map<string, Material>;
  public settings: ProjectSettings;
  public metadata: ProjectMetadata;
  public created: Date;
  public modified: Date;
  public lastSaved?: Date;

  constructor(name: string, id?: string) {
    this.id = id || this.generateId();
    this.name = name;
    this.version = '1.0.0';
    this.parts = new Map();
    this.assemblies = new Map();
    this.materials = new Map();
    this.created = new Date();
    this.modified = new Date();

    // Default settings
    this.settings = {
      units: 'mm',
      precision: 6,
      autoSave: true,
      autoSaveInterval: 5,
      customSettings: {}
    };

    // Default metadata
    this.metadata = {
      author: '',
      company: '',
      description: '',
      keywords: [],
      version: this.version,
      cadVersion: '1.0.0',
      customMetadata: {}
    };

    // Add default materials
    this.addDefaultMaterials();
  }

  /**
   * Generate a unique ID for this project
   */
  private generateId(): string {
    return `project_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Add default materials to the project
   */
  private addDefaultMaterials(): void {
    this.addMaterial(Material.createSteel());
    this.addMaterial(Material.createAluminum());
    this.addMaterial(Material.createPlastic());
  }

  /**
   * Add a part to the project
   */
  addPart(part: Part): void {
    this.parts.set(part.id, part);
    this.modified = new Date();
  }

  /**
   * Remove a part from the project
   */
  removePart(partId: string): boolean {
    const removed = this.parts.delete(partId);
    if (removed) {
      // Remove part instances from assemblies
      for (const assembly of this.assemblies.values()) {
        const instancesToRemove: string[] = [];
        for (const instance of assembly.getAllPartInstances()) {
          if (instance.partId === partId) {
            instancesToRemove.push(instance.id);
          }
        }
        for (const instanceId of instancesToRemove) {
          assembly.removePartInstance(instanceId);
        }
      }
      this.modified = new Date();
    }
    return removed;
  }

  /**
   * Get a part by ID
   */
  getPart(partId: string): Part | undefined {
    return this.parts.get(partId);
  }

  /**
   * Get all parts
   */
  getAllParts(): Part[] {
    return Array.from(this.parts.values());
  }

  /**
   * Add an assembly to the project
   */
  addAssembly(assembly: Assembly): void {
    this.assemblies.set(assembly.id, assembly);
    this.modified = new Date();
  }

  /**
   * Remove an assembly from the project
   */
  removeAssembly(assemblyId: string): boolean {
    const removed = this.assemblies.delete(assemblyId);
    if (removed) {
      // Remove references from other assemblies
      for (const assembly of this.assemblies.values()) {
        assembly.removeSubAssembly(assemblyId);
      }
      this.modified = new Date();
    }
    return removed;
  }

  /**
   * Get an assembly by ID
   */
  getAssembly(assemblyId: string): Assembly | undefined {
    return this.assemblies.get(assemblyId);
  }

  /**
   * Get all assemblies
   */
  getAllAssemblies(): Assembly[] {
    return Array.from(this.assemblies.values());
  }

  /**
   * Add a material to the project
   */
  addMaterial(material: Material): void {
    this.materials.set(material.id, material);
    this.modified = new Date();
  }

  /**
   * Remove a material from the project
   */
  removeMaterial(materialId: string): boolean {
    const removed = this.materials.delete(materialId);
    if (removed) {
      // Remove material assignments from parts
      for (const part of this.parts.values()) {
        if (part.material?.id === materialId) {
          part.removeMaterial();
        }
      }
      this.modified = new Date();
    }
    return removed;
  }

  /**
   * Get a material by ID
   */
  getMaterial(materialId: string): Material | undefined {
    return this.materials.get(materialId);
  }

  /**
   * Get all materials
   */
  getAllMaterials(): Material[] {
    return Array.from(this.materials.values());
  }

  /**
   * Get materials by category
   */
  getMaterialsByCategory(category: string): Material[] {
    return this.getAllMaterials().filter(material => material.category === category);
  }

  /**
   * Update project settings
   */
  updateSettings(newSettings: Partial<ProjectSettings>): void {
    this.settings = { ...this.settings, ...newSettings };
    this.modified = new Date();
  }

  /**
   * Update project metadata
   */
  updateMetadata(newMetadata: Partial<ProjectMetadata>): void {
    this.metadata = { ...this.metadata, ...newMetadata };
    this.modified = new Date();
  }

  /**
   * Set custom setting
   */
  setCustomSetting(key: string, value: any): void {
    this.settings.customSettings[key] = value;
    this.modified = new Date();
  }

  /**
   * Get custom setting
   */
  getCustomSetting(key: string): any {
    return this.settings.customSettings[key];
  }

  /**
   * Set custom metadata
   */
  setCustomMetadata(key: string, value: any): void {
    this.metadata.customMetadata[key] = value;
    this.modified = new Date();
  }

  /**
   * Get custom metadata
   */
  getCustomMetadata(key: string): any {
    return this.metadata.customMetadata[key];
  }

  /**
   * Get project statistics
   */
  getStatistics(): {
    partCount: number;
    assemblyCount: number;
    materialCount: number;
    totalFeatures: number;
    totalMateConstraints: number;
    fileSize: number; // estimated in bytes
  } {
    let totalFeatures = 0;
    for (const part of this.parts.values()) {
      totalFeatures += part.getAllFeatures().length;
    }

    let totalMateConstraints = 0;
    for (const assembly of this.assemblies.values()) {
      totalMateConstraints += assembly.getAllMateConstraints().length;
    }

    // Estimate file size based on content
    const jsonString = JSON.stringify(this.toJSON());
    const fileSize = new Blob([jsonString]).size;

    return {
      partCount: this.parts.size,
      assemblyCount: this.assemblies.size,
      materialCount: this.materials.size,
      totalFeatures,
      totalMateConstraints,
      fileSize
    };
  }

  /**
   * Validate the entire project
   */
  validate(): { isValid: boolean; errors: string[]; warnings: string[] } {
    const result = {
      isValid: true,
      errors: [] as string[],
      warnings: [] as string[]
    };

    if (!this.name || this.name.trim().length === 0) {
      result.isValid = false;
      result.errors.push('Project name is required');
    }

    // Validate parts
    for (const part of this.parts.values()) {
      const partValidation = part.validate();
      if (!partValidation.isValid) {
        result.isValid = false;
        result.errors.push(...partValidation.errors.map(err => `Part ${part.name}: ${err}`));
      }
      result.warnings.push(...partValidation.warnings.map(warn => `Part ${part.name}: ${warn}`));
    }

    // Validate assemblies
    for (const assembly of this.assemblies.values()) {
      const assemblyValidation = assembly.validate();
      if (!assemblyValidation.isValid) {
        result.isValid = false;
        result.errors.push(...assemblyValidation.errors.map(err => `Assembly ${assembly.name}: ${err}`));
      }
      result.warnings.push(...assemblyValidation.warnings.map(warn => `Assembly ${assembly.name}: ${warn}`));
    }

    // Validate materials
    for (const material of this.materials.values()) {
      const materialValidation = material.validate();
      if (!materialValidation.isValid) {
        result.warnings.push(...materialValidation.errors.map(err => `Material ${material.name}: ${err}`));
      }
    }

    // Check for orphaned references
    this.checkOrphanedReferences(result);

    // Check for empty project
    if (this.parts.size === 0 && this.assemblies.size === 0) {
      result.warnings.push('Project is empty');
    }

    return result;
  }

  /**
   * Check for orphaned references in the project
   */
  private checkOrphanedReferences(result: { errors: string[]; warnings: string[] }): void {
    // Check part instances in assemblies
    for (const assembly of this.assemblies.values()) {
      for (const instance of assembly.getAllPartInstances()) {
        if (!this.parts.has(instance.partId)) {
          result.errors.push(`Assembly ${assembly.name} references non-existent part ${instance.partId}`);
        }
      }
    }

    // Check material references in parts
    for (const part of this.parts.values()) {
      if (part.material && !this.materials.has(part.material.id)) {
        result.warnings.push(`Part ${part.name} references non-existent material ${part.material.id}`);
      }
    }
  }

  /**
   * Mark project as saved
   */
  markAsSaved(): void {
    this.lastSaved = new Date();
  }

  /**
   * Check if project has unsaved changes
   */
  hasUnsavedChanges(): boolean {
    return !this.lastSaved || this.modified > this.lastSaved;
  }

  /**
   * Clone this project
   */
  clone(): Project {
    const cloned = new Project(this.name, this.id);
    cloned.version = this.version;
    cloned.settings = {
      ...this.settings,
      customSettings: { ...this.settings.customSettings }
    };
    cloned.metadata = {
      ...this.metadata,
      keywords: [...this.metadata.keywords],
      customMetadata: { ...this.metadata.customMetadata }
    };
    cloned.created = new Date(this.created);
    cloned.modified = new Date(this.modified);
    cloned.lastSaved = this.lastSaved ? new Date(this.lastSaved) : undefined;

    // Clone parts
    for (const part of this.parts.values()) {
      cloned.addPart(part.clone());
    }

    // Clone materials
    for (const material of this.materials.values()) {
      cloned.addMaterial(material.clone());
    }

    // Clone assemblies
    for (const assembly of this.assemblies.values()) {
      cloned.addAssembly(assembly.clone());
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
      version: this.version,
      parts: Array.from(this.parts.values()).map(p => p.toJSON()),
      assemblies: Array.from(this.assemblies.values()).map(a => a.toJSON()),
      materials: Array.from(this.materials.values()).map(m => m.toJSON()),
      settings: this.settings,
      metadata: this.metadata,
      created: this.created.toISOString(),
      modified: this.modified.toISOString(),
      lastSaved: this.lastSaved?.toISOString()
    };
  }

  /**
   * Create project from JSON
   */
  static fromJSON(data: any): Project {
    const project = new Project(data.name, data.id);
    project.version = data.version || '1.0.0';
    project.settings = { ...project.settings, ...data.settings };
    project.metadata = { ...project.metadata, ...data.metadata };
    project.created = new Date(data.created);
    project.modified = new Date(data.modified);
    project.lastSaved = data.lastSaved ? new Date(data.lastSaved) : undefined;

    // Clear default materials if custom ones are provided
    if (data.materials && data.materials.length > 0) {
      project.materials.clear();
    }

    // Load materials first
    if (data.materials) {
      for (const materialData of data.materials) {
        const material = Material.fromJSON(materialData);
        project.addMaterial(material);
      }
    }

    // Load parts
    if (data.parts) {
      for (const partData of data.parts) {
        // Part loading would need to be implemented in Part.fromJSON
        // This is a simplified version
        const part = new Part(partData.name, partData.id);
        // ... load part data
        project.addPart(part);
      }
    }

    // Load assemblies
    if (data.assemblies) {
      for (const assemblyData of data.assemblies) {
        // Assembly loading would need to be implemented in Assembly.fromJSON
        // This is a simplified version
        const assembly = new Assembly(assemblyData.name, assemblyData.id);
        // ... load assembly data
        project.addAssembly(assembly);
      }
    }

    return project;
  }

  /**
   * Convert to string representation
   */
  toString(): string {
    const stats = this.getStatistics();
    return `Project(${this.name}, parts: ${stats.partCount}, assemblies: ${stats.assemblyCount})`;
  }
}