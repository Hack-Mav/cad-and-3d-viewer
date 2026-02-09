import { Feature, FeatureType, FeatureParameters } from '../data/Part';
import { Sketch } from '../sketch/Sketch';
import { Solid } from './Solid';
import { SolidEngine } from './SolidEngine';
import { Point } from '../core/Point';
import { Vector } from '../core/Vector';

/**
 * Result of a feature operation
 */
export interface FeatureResult {
  success: boolean;
  solid?: Solid;
  errors: string[];
  warnings: string[];
}

/**
 * Context for feature regeneration
 */
export interface FeatureContext {
  previousSolids: Map<string, Solid>;
  sketches: Map<string, Sketch>;
  parameters: Map<string, any>;
}

/**
 * Engine for managing and executing parametric features
 */
export class FeatureEngine {
  private solidEngine: SolidEngine;
  private featureHandlers: Map<FeatureType, (feature: Feature, context: FeatureContext) => FeatureResult>;

  constructor() {
    this.solidEngine = new SolidEngine();
    this.featureHandlers = new Map();
    this.initializeFeatureHandlers();
  }

  /**
   * Initialize handlers for different feature types
   */
  private initializeFeatureHandlers(): void {
    this.featureHandlers.set(FeatureType.Extrude, this.handleExtrude.bind(this));
    this.featureHandlers.set(FeatureType.Revolve, this.handleRevolve.bind(this));
    this.featureHandlers.set(FeatureType.Loft, this.handleLoft.bind(this));
    this.featureHandlers.set(FeatureType.Sweep, this.handleSweep.bind(this));
    this.featureHandlers.set(FeatureType.Fillet, this.handleFillet.bind(this));
    this.featureHandlers.set(FeatureType.Chamfer, this.handleChamfer.bind(this));
    this.featureHandlers.set(FeatureType.Shell, this.handleShell.bind(this));
    this.featureHandlers.set(FeatureType.Draft, this.handleDraft.bind(this));
    this.featureHandlers.set(FeatureType.Pattern, this.handlePattern.bind(this));
    this.featureHandlers.set(FeatureType.Boolean, this.handleBoolean.bind(this));
  }

  /**
   * Execute a single feature
   */
  executeFeature(feature: Feature, context: FeatureContext): FeatureResult {
    const handler = this.featureHandlers.get(feature.type);
    if (!handler) {
      return {
        success: false,
        errors: [`No handler found for feature type: ${feature.type}`],
        warnings: []
      };
    }

    try {
      return handler(feature, context);
    } catch (error) {
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Unknown error occurred'],
        warnings: []
      };
    }
  }

  /**
   * Regenerate a feature tree
   */
  regenerateFeatures(features: Feature[], context: FeatureContext): Map<string, FeatureResult> {
    const results = new Map<string, FeatureResult>();
    const updatedContext = { ...context };

    for (const feature of features) {
      if (!feature.isActive) {
        continue;
      }

      const result = this.executeFeature(feature, updatedContext);
      results.set(feature.id, result);

      // Update context with the new solid if successful
      if (result.success && result.solid) {
        updatedContext.previousSolids.set(feature.id, result.solid);
      }
    }

    return results;
  }

  /**
   * Handle extrude feature
   */
  private handleExtrude(feature: Feature, context: FeatureContext): FeatureResult {
    if (!feature.sketch) {
      return {
        success: false,
        errors: ['Extrude feature requires a sketch'],
        warnings: []
      };
    }

    const distance = feature.parameters.distance as number;
    if (typeof distance !== 'number' || distance <= 0) {
      return {
        success: false,
        errors: ['Extrude distance must be a positive number'],
        warnings: []
      };
    }

    const direction = feature.parameters.direction as Vector || new Vector(0, 0, 1);
    const taper = feature.parameters.taper as number || 0;
    const symmetric = feature.parameters.symmetric as boolean || false;

    try {
      const solid = this.solidEngine.extrude(feature.sketch, distance, direction, taper, symmetric);
      return {
        success: true,
        solid,
        errors: [],
        warnings: []
      };
    } catch (error) {
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Extrude operation failed'],
        warnings: []
      };
    }
  }

  /**
   * Handle revolve feature
   */
  private handleRevolve(feature: Feature, context: FeatureContext): FeatureResult {
    if (!feature.sketch) {
      return {
        success: false,
        errors: ['Revolve feature requires a sketch'],
        warnings: []
      };
    }

    const angle = feature.parameters.angle as number;
    if (typeof angle !== 'number' || angle <= 0) {
      return {
        success: false,
        errors: ['Revolve angle must be a positive number'],
        warnings: []
      };
    }

    const axis = feature.parameters.axis as { point: Point; direction: Vector };
    if (!axis || !axis.point || !axis.direction) {
      return {
        success: false,
        errors: ['Revolve feature requires an axis definition'],
        warnings: []
      };
    }

    try {
      const solid = this.solidEngine.revolve(feature.sketch, axis.point, axis.direction, angle);
      return {
        success: true,
        solid,
        errors: [],
        warnings: []
      };
    } catch (error) {
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Revolve operation failed'],
        warnings: []
      };
    }
  }

  /**
   * Handle loft feature
   */
  private handleLoft(feature: Feature, context: FeatureContext): FeatureResult {
    const profiles = feature.parameters.profiles as Sketch[];
    if (!profiles || profiles.length < 2) {
      return {
        success: false,
        errors: ['Loft feature requires at least 2 profile sketches'],
        warnings: []
      };
    }

    const guides = feature.parameters.guides as Sketch[] || [];
    const closed = feature.parameters.closed as boolean || false;

    try {
      const solid = this.solidEngine.loft(profiles, guides, closed);
      return {
        success: true,
        solid,
        errors: [],
        warnings: []
      };
    } catch (error) {
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Loft operation failed'],
        warnings: []
      };
    }
  }

  /**
   * Handle sweep feature
   */
  private handleSweep(feature: Feature, context: FeatureContext): FeatureResult {
    if (!feature.sketch) {
      return {
        success: false,
        errors: ['Sweep feature requires a profile sketch'],
        warnings: []
      };
    }

    const path = feature.parameters.path as Sketch;
    if (!path) {
      return {
        success: false,
        errors: ['Sweep feature requires a path sketch'],
        warnings: []
      };
    }

    const twist = feature.parameters.twist as number || 0;
    const scale = feature.parameters.scale as number || 1;

    try {
      const solid = this.solidEngine.sweep(feature.sketch, path, twist, scale);
      return {
        success: true,
        solid,
        errors: [],
        warnings: []
      };
    } catch (error) {
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Sweep operation failed'],
        warnings: []
      };
    }
  }

  /**
   * Handle fillet feature
   */
  private handleFillet(feature: Feature, context: FeatureContext): FeatureResult {
    const targetSolidId = feature.parameters.targetSolid as string;
    const targetSolid = context.previousSolids.get(targetSolidId);
    
    if (!targetSolid) {
      return {
        success: false,
        errors: ['Fillet feature requires a target solid'],
        warnings: []
      };
    }

    const radius = feature.parameters.radius as number;
    if (typeof radius !== 'number' || radius <= 0) {
      return {
        success: false,
        errors: ['Fillet radius must be a positive number'],
        warnings: []
      };
    }

    const edges = feature.parameters.edges as string[] || [];

    try {
      const solid = this.solidEngine.fillet(targetSolid, edges, radius);
      return {
        success: true,
        solid,
        errors: [],
        warnings: []
      };
    } catch (error) {
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Fillet operation failed'],
        warnings: []
      };
    }
  }

  /**
   * Handle chamfer feature
   */
  private handleChamfer(feature: Feature, context: FeatureContext): FeatureResult {
    const targetSolidId = feature.parameters.targetSolid as string;
    const targetSolid = context.previousSolids.get(targetSolidId);
    
    if (!targetSolid) {
      return {
        success: false,
        errors: ['Chamfer feature requires a target solid'],
        warnings: []
      };
    }

    const distance = feature.parameters.distance as number;
    if (typeof distance !== 'number' || distance <= 0) {
      return {
        success: false,
        errors: ['Chamfer distance must be a positive number'],
        warnings: []
      };
    }

    const edges = feature.parameters.edges as string[] || [];
    const angle = feature.parameters.angle as number || 45;

    try {
      const solid = this.solidEngine.chamfer(targetSolid, edges, distance, angle);
      return {
        success: true,
        solid,
        errors: [],
        warnings: []
      };
    } catch (error) {
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Chamfer operation failed'],
        warnings: []
      };
    }
  }

  /**
   * Handle shell feature
   */
  private handleShell(feature: Feature, context: FeatureContext): FeatureResult {
    const targetSolidId = feature.parameters.targetSolid as string;
    const targetSolid = context.previousSolids.get(targetSolidId);
    
    if (!targetSolid) {
      return {
        success: false,
        errors: ['Shell feature requires a target solid'],
        warnings: []
      };
    }

    const thickness = feature.parameters.thickness as number;
    if (typeof thickness !== 'number' || thickness <= 0) {
      return {
        success: false,
        errors: ['Shell thickness must be a positive number'],
        warnings: []
      };
    }

    const facesToRemove = feature.parameters.facesToRemove as string[] || [];

    try {
      const solid = this.solidEngine.shell(targetSolid, thickness, facesToRemove);
      return {
        success: true,
        solid,
        errors: [],
        warnings: []
      };
    } catch (error) {
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Shell operation failed'],
        warnings: []
      };
    }
  }

  /**
   * Handle draft feature
   */
  private handleDraft(feature: Feature, context: FeatureContext): FeatureResult {
    const targetSolidId = feature.parameters.targetSolid as string;
    const targetSolid = context.previousSolids.get(targetSolidId);
    
    if (!targetSolid) {
      return {
        success: false,
        errors: ['Draft feature requires a target solid'],
        warnings: []
      };
    }

    const angle = feature.parameters.angle as number;
    if (typeof angle !== 'number') {
      return {
        success: false,
        errors: ['Draft angle must be a number'],
        warnings: []
      };
    }

    const direction = feature.parameters.direction as Vector;
    const faces = feature.parameters.faces as string[] || [];

    try {
      const solid = this.solidEngine.draft(targetSolid, faces, angle, direction);
      return {
        success: true,
        solid,
        errors: [],
        warnings: []
      };
    } catch (error) {
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Draft operation failed'],
        warnings: []
      };
    }
  }

  /**
   * Handle pattern feature
   */
  private handlePattern(feature: Feature, context: FeatureContext): FeatureResult {
    const targetSolidId = feature.parameters.targetSolid as string;
    const targetSolid = context.previousSolids.get(targetSolidId);
    
    if (!targetSolid) {
      return {
        success: false,
        errors: ['Pattern feature requires a target solid'],
        warnings: []
      };
    }

    const patternType = feature.parameters.patternType as 'linear' | 'circular' | 'mirror';
    const count = feature.parameters.count as number || 2;

    try {
      let solid: Solid;
      
      switch (patternType) {
        case 'linear':
          const direction = feature.parameters.direction as Vector;
          const spacing = feature.parameters.spacing as number;
          solid = this.solidEngine.linearPattern(targetSolid, direction, spacing, count);
          break;
          
        case 'circular':
          const axis = feature.parameters.axis as { point: Point; direction: Vector };
          const angle = feature.parameters.angle as number;
          solid = this.solidEngine.circularPattern(targetSolid, axis.point, axis.direction, angle, count);
          break;
          
        case 'mirror':
          const plane = feature.parameters.plane as { point: Point; normal: Vector };
          solid = this.solidEngine.mirror(targetSolid, plane.point, plane.normal);
          break;
          
        default:
          return {
            success: false,
            errors: [`Unknown pattern type: ${patternType}`],
            warnings: []
          };
      }

      return {
        success: true,
        solid,
        errors: [],
        warnings: []
      };
    } catch (error) {
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Pattern operation failed'],
        warnings: []
      };
    }
  }

  /**
   * Handle boolean feature
   */
  private handleBoolean(feature: Feature, context: FeatureContext): FeatureResult {
    const solid1Id = feature.parameters.solid1 as string;
    const solid2Id = feature.parameters.solid2 as string;
    const operation = feature.parameters.operation as 'union' | 'subtract' | 'intersect';
    
    const solid1 = context.previousSolids.get(solid1Id);
    const solid2 = context.previousSolids.get(solid2Id);
    
    if (!solid1 || !solid2) {
      return {
        success: false,
        errors: ['Boolean feature requires two valid solids'],
        warnings: []
      };
    }

    try {
      let solid: Solid;
      
      switch (operation) {
        case 'union':
          solid = this.solidEngine.union(solid1, solid2);
          break;
        case 'subtract':
          solid = this.solidEngine.subtract(solid1, solid2);
          break;
        case 'intersect':
          solid = this.solidEngine.intersect(solid1, solid2);
          break;
        default:
          return {
            success: false,
            errors: [`Unknown boolean operation: ${operation}`],
            warnings: []
          };
      }

      return {
        success: true,
        solid,
        errors: [],
        warnings: []
      };
    } catch (error) {
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Boolean operation failed'],
        warnings: []
      };
    }
  }

  /**
   * Validate feature dependencies
   */
  validateFeatureDependencies(features: Feature[]): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    const featureIds = new Set(features.map(f => f.id));
    
    for (const feature of features) {
      for (const depId of feature.dependencies) {
        if (!featureIds.has(depId)) {
          errors.push(`Feature ${feature.name} depends on non-existent feature ${depId}`);
        }
      }
    }
    
    // Check for circular dependencies
    const visited = new Set<string>();
    const visiting = new Set<string>();
    
    const checkCircular = (feature: Feature): boolean => {
      if (visiting.has(feature.id)) {
        errors.push(`Circular dependency detected involving feature ${feature.name}`);
        return false;
      }
      
      if (visited.has(feature.id)) {
        return true;
      }
      
      visiting.add(feature.id);
      
      for (const depId of feature.dependencies) {
        const depFeature = features.find(f => f.id === depId);
        if (depFeature && !checkCircular(depFeature)) {
          return false;
        }
      }
      
      visiting.delete(feature.id);
      visited.add(feature.id);
      return true;
    };
    
    for (const feature of features) {
      if (!visited.has(feature.id)) {
        checkCircular(feature);
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
}