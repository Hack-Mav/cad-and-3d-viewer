/**
 * Material category for organization
 */
export enum MaterialCategory {
  Metal = 'metal',
  Plastic = 'plastic',
  Wood = 'wood',
  Ceramic = 'ceramic',
  Composite = 'composite',
  Glass = 'glass',
  Rubber = 'rubber',
  Custom = 'custom'
}

/**
 * Color representation
 */
export interface Color {
  r: number; // 0-1
  g: number; // 0-1
  b: number; // 0-1
  a: number; // 0-1 (alpha/transparency)
}

/**
 * Physical properties of a material
 */
export interface PhysicalProperties {
  density: number; // kg/m³
  youngsModulus: number; // Pa
  poissonRatio: number;
  thermalConductivity: number; // W/(m·K)
  thermalExpansion: number; // 1/K
  specificHeat: number; // J/(kg·K)
  yieldStrength?: number; // Pa
  ultimateStrength?: number; // Pa
}

/**
 * Visual properties for rendering
 */
export interface VisualProperties {
  color: Color;
  roughness: number; // 0-1
  metalness: number; // 0-1
  transparency: number; // 0-1
  emissive: Color;
  normalMapIntensity: number; // 0-1
}

/**
 * Represents a material with physical and visual properties
 */
export class Material {
  public id: string;
  public name: string;
  public category: MaterialCategory;
  public description: string;
  public physicalProperties: PhysicalProperties;
  public visualProperties: VisualProperties;
  public customProperties: Record<string, any>;
  public created: Date;
  public modified: Date;

  constructor(
    name: string,
    category: MaterialCategory = MaterialCategory.Custom,
    id?: string
  ) {
    this.id = id || this.generateId();
    this.name = name;
    this.category = category;
    this.description = '';
    this.created = new Date();
    this.modified = new Date();
    this.customProperties = {};

    // Default physical properties
    this.physicalProperties = {
      density: 1000, // kg/m³
      youngsModulus: 200e9, // Pa (200 GPa)
      poissonRatio: 0.3,
      thermalConductivity: 50, // W/(m·K)
      thermalExpansion: 12e-6, // 1/K
      specificHeat: 500 // J/(kg·K)
    };

    // Default visual properties
    this.visualProperties = {
      color: { r: 0.7, g: 0.7, b: 0.7, a: 1.0 },
      roughness: 0.5,
      metalness: 0.0,
      transparency: 0.0,
      emissive: { r: 0, g: 0, b: 0, a: 1.0 },
      normalMapIntensity: 1.0
    };
  }

  /**
   * Generate a unique ID for this material
   */
  private generateId(): string {
    return `material_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Clone this material
   */
  clone(): Material {
    const cloned = new Material(this.name, this.category, this.id);
    cloned.description = this.description;
    cloned.physicalProperties = { ...this.physicalProperties };
    cloned.visualProperties = {
      ...this.visualProperties,
      color: { ...this.visualProperties.color },
      emissive: { ...this.visualProperties.emissive }
    };
    cloned.customProperties = { ...this.customProperties };
    cloned.created = new Date(this.created);
    cloned.modified = new Date(this.modified);
    return cloned;
  }

  /**
   * Update physical properties
   */
  updatePhysicalProperties(properties: Partial<PhysicalProperties>): void {
    this.physicalProperties = { ...this.physicalProperties, ...properties };
    this.modified = new Date();
  }

  /**
   * Update visual properties
   */
  updateVisualProperties(properties: Partial<VisualProperties>): void {
    this.visualProperties = { ...this.visualProperties, ...properties };
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
   * Calculate mass for a given volume
   */
  calculateMass(volume: number): number {
    return this.physicalProperties.density * volume;
  }

  /**
   * Validate material properties
   */
  validate(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!this.name || this.name.trim().length === 0) {
      errors.push('Material name is required');
    }

    if (this.physicalProperties.density <= 0) {
      errors.push('Density must be positive');
    }

    if (this.physicalProperties.youngsModulus <= 0) {
      errors.push('Young\'s modulus must be positive');
    }

    if (this.physicalProperties.poissonRatio < -1 || this.physicalProperties.poissonRatio > 0.5) {
      errors.push('Poisson ratio must be between -1 and 0.5');
    }

    if (this.visualProperties.roughness < 0 || this.visualProperties.roughness > 1) {
      errors.push('Roughness must be between 0 and 1');
    }

    if (this.visualProperties.metalness < 0 || this.visualProperties.metalness > 1) {
      errors.push('Metalness must be between 0 and 1');
    }

    if (this.visualProperties.transparency < 0 || this.visualProperties.transparency > 1) {
      errors.push('Transparency must be between 0 and 1');
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
      category: this.category,
      description: this.description,
      physicalProperties: this.physicalProperties,
      visualProperties: this.visualProperties,
      customProperties: this.customProperties,
      created: this.created.toISOString(),
      modified: this.modified.toISOString()
    };
  }

  /**
   * Create material from JSON
   */
  static fromJSON(data: any): Material {
    const material = new Material(data.name, data.category, data.id);
    material.description = data.description || '';
    material.physicalProperties = { ...material.physicalProperties, ...data.physicalProperties };
    material.visualProperties = { ...material.visualProperties, ...data.visualProperties };
    material.customProperties = data.customProperties || {};
    material.created = new Date(data.created);
    material.modified = new Date(data.modified);
    return material;
  }

  /**
   * Convert to string representation
   */
  toString(): string {
    return `Material(${this.name}, category: ${this.category})`;
  }

  // Predefined materials
  static createSteel(): Material {
    const steel = new Material('Steel', MaterialCategory.Metal);
    steel.description = 'Standard structural steel';
    steel.updatePhysicalProperties({
      density: 7850,
      youngsModulus: 200e9,
      poissonRatio: 0.27,
      thermalConductivity: 50,
      thermalExpansion: 12e-6,
      specificHeat: 490,
      yieldStrength: 250e6,
      ultimateStrength: 400e6
    });
    steel.updateVisualProperties({
      color: { r: 0.6, g: 0.6, b: 0.65, a: 1.0 },
      roughness: 0.3,
      metalness: 1.0,
      transparency: 0.0
    });
    return steel;
  }

  static createAluminum(): Material {
    const aluminum = new Material('Aluminum', MaterialCategory.Metal);
    aluminum.description = '6061-T6 Aluminum alloy';
    aluminum.updatePhysicalProperties({
      density: 2700,
      youngsModulus: 69e9,
      poissonRatio: 0.33,
      thermalConductivity: 167,
      thermalExpansion: 23e-6,
      specificHeat: 896,
      yieldStrength: 276e6,
      ultimateStrength: 310e6
    });
    aluminum.updateVisualProperties({
      color: { r: 0.8, g: 0.8, b: 0.85, a: 1.0 },
      roughness: 0.2,
      metalness: 1.0,
      transparency: 0.0
    });
    return aluminum;
  }

  static createPlastic(): Material {
    const plastic = new Material('ABS Plastic', MaterialCategory.Plastic);
    plastic.description = 'Acrylonitrile Butadiene Styrene';
    plastic.updatePhysicalProperties({
      density: 1050,
      youngsModulus: 2.3e9,
      poissonRatio: 0.35,
      thermalConductivity: 0.2,
      thermalExpansion: 90e-6,
      specificHeat: 1400,
      yieldStrength: 40e6,
      ultimateStrength: 45e6
    });
    plastic.updateVisualProperties({
      color: { r: 0.2, g: 0.2, b: 0.2, a: 1.0 },
      roughness: 0.7,
      metalness: 0.0,
      transparency: 0.0
    });
    return plastic;
  }
}