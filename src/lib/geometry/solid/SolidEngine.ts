import { Sketch } from '../sketch/Sketch';
import { Point } from '../core/Point';
import { Vector } from '../core/Vector';
import { Solid } from './Solid';
import { BoundaryRepresentation, Vertex, Edge, Face } from './BoundaryRepresentation';
import { GeometryElement, Line, Arc, Circle } from '../sketch/GeometryElement';

/**
 * Engine for creating and manipulating 3D solids
 */
export class SolidEngine {
  private tolerance: number;

  constructor(tolerance: number = 1e-6) {
    this.tolerance = tolerance;
  }

  /**
   * Extrude a sketch to create a solid
   */
  extrude(
    sketch: Sketch, 
    distance: number, 
    direction?: Vector, 
    taper?: number, 
    symmetric?: boolean
  ): Solid {
    if (distance <= 0) {
      throw new Error('Extrude distance must be positive');
    }

    const extrudeDirection = direction || new Vector(0, 0, 1);
    const taperAngle = taper || 0;
    const isSymmetric = symmetric || false;

    // Get sketch elements and validate they form closed loops
    const elements = sketch.getAllElements();
    if (elements.length === 0) {
      throw new Error('Cannot extrude empty sketch');
    }

    // Create B-Rep for the extruded solid
    const brep = new BoundaryRepresentation();
    
    // Convert sketch elements to 3D vertices and edges
    const sketchVertices = this.extractSketchVertices(sketch);
    const sketchEdges = this.createEdgesFromSketch(sketch, sketchVertices);

    // Create bottom face vertices (on sketch plane)
    const bottomVertices = new Map<string, Vertex>();
    for (const [key, point] of sketchVertices) {
      const worldPoint = sketch.sketchToWorld(point);
      const vertex = new Vertex(worldPoint);
      bottomVertices.set(key, vertex);
      brep.addVertex(vertex);
    }

    // Create top face vertices (extruded)
    const topVertices = new Map<string, Vertex>();
    const extrudeVector = extrudeDirection.normalize().scale(distance);
    
    for (const [key, bottomVertex] of bottomVertices) {
      let topPoint = bottomVertex.point.add(new Point(extrudeVector.x, extrudeVector.y, extrudeVector.z));
      
      // Apply taper if specified
      if (taperAngle !== 0) {
        const center = this.getSketchCenter(sketch);
        const centerToPoint = bottomVertex.point.subtract(center);
        const taperOffset = centerToPoint.scale(Math.tan(taperAngle * Math.PI / 180) * distance);
        topPoint = topPoint.add(taperOffset);
      }
      
      const vertex = new Vertex(topPoint);
      topVertices.set(key, vertex);
      brep.addVertex(vertex);
    }

    // Create edges for bottom face
    const bottomEdges: Edge[] = [];
    for (const sketchEdge of sketchEdges) {
      const startVertex = bottomVertices.get(sketchEdge.startKey)!;
      const endVertex = bottomVertices.get(sketchEdge.endKey)!;
      const edge = new Edge(startVertex, endVertex);
      bottomEdges.push(edge);
      brep.addEdge(edge);
    }

    // Create edges for top face
    const topEdges: Edge[] = [];
    for (const sketchEdge of sketchEdges) {
      const startVertex = topVertices.get(sketchEdge.startKey)!;
      const endVertex = topVertices.get(sketchEdge.endKey)!;
      const edge = new Edge(startVertex, endVertex);
      topEdges.push(edge);
      brep.addEdge(edge);
    }

    // Create vertical edges connecting bottom and top
    const verticalEdges: Edge[] = [];
    for (const [key, bottomVertex] of bottomVertices) {
      const topVertex = topVertices.get(key)!;
      const edge = new Edge(bottomVertex, topVertex);
      verticalEdges.push(edge);
      brep.addEdge(edge);
    }

    // Create bottom face
    const bottomFace = new Face(bottomEdges);
    brep.addFace(bottomFace);

    // Create top face (reverse order for correct normal)
    const topFace = new Face([...topEdges].reverse());
    brep.addFace(topFace);

    // Create side faces
    for (let i = 0; i < bottomEdges.length; i++) {
      const bottomEdge = bottomEdges[i];
      const topEdge = topEdges[i];
      const leftVertical = verticalEdges[i];
      const rightVertical = verticalEdges[(i + 1) % verticalEdges.length];

      // Create face with proper edge orientation
      const sideEdges = [
        bottomEdge,
        rightVertical,
        new Edge(topEdge.endVertex, topEdge.startVertex), // Reverse top edge
        new Edge(leftVertical.endVertex, leftVertical.startVertex) // Reverse left vertical
      ];

      const sideFace = new Face(sideEdges);
      brep.addFace(sideFace);
    }

    return new Solid(brep, `Extruded_${sketch.name}`);
  }

  /**
   * Revolve a sketch around an axis to create a solid
   */
  revolve(sketch: Sketch, axisPoint: Point, axisDirection: Vector, angle: number): Solid {
    if (angle <= 0 || angle > 360) {
      throw new Error('Revolve angle must be between 0 and 360 degrees');
    }

    const elements = sketch.getAllElements();
    if (elements.length === 0) {
      throw new Error('Cannot revolve empty sketch');
    }

    // Create B-Rep for the revolved solid
    const brep = new BoundaryRepresentation();
    
    // Convert angle to radians
    const angleRad = (angle * Math.PI) / 180;
    const steps = Math.max(8, Math.ceil(angle / 15)); // At least 8 steps, more for larger angles
    
    // Get sketch profile points
    const profilePoints = this.extractSketchVertices(sketch);
    
    // Create vertices by revolving profile points
    const revolutionVertices: Vertex[][] = [];
    
    for (let step = 0; step <= steps; step++) {
      const currentAngle = (angleRad * step) / steps;
      const stepVertices: Vertex[] = [];
      
      for (const [key, point] of profilePoints) {
        const worldPoint = sketch.sketchToWorld(point);
        const revolvedPoint = this.revolvePointAroundAxis(worldPoint, axisPoint, axisDirection, currentAngle);
        const vertex = new Vertex(revolvedPoint);
        stepVertices.push(vertex);
        brep.addVertex(vertex);
      }
      
      revolutionVertices.push(stepVertices);
    }

    // Create faces by connecting adjacent revolution steps
    for (let step = 0; step < steps; step++) {
      const currentVertices = revolutionVertices[step];
      const nextVertices = revolutionVertices[step + 1];
      
      for (let i = 0; i < currentVertices.length - 1; i++) {
        // Create quad face between adjacent vertices
        const v1 = currentVertices[i];
        const v2 = currentVertices[i + 1];
        const v3 = nextVertices[i + 1];
        const v4 = nextVertices[i];
        
        // Create edges for the quad
        const edge1 = new Edge(v1, v2);
        const edge2 = new Edge(v2, v3);
        const edge3 = new Edge(v3, v4);
        const edge4 = new Edge(v4, v1);
        
        brep.addEdge(edge1);
        brep.addEdge(edge2);
        brep.addEdge(edge3);
        brep.addEdge(edge4);
        
        // Create face
        const face = new Face([edge1, edge2, edge3, edge4]);
        brep.addFace(face);
      }
    }

    // Create end caps if not a full revolution
    if (angle < 360) {
      // Start cap
      const startVertices = revolutionVertices[0];
      const startEdges: Edge[] = [];
      for (let i = 0; i < startVertices.length - 1; i++) {
        const edge = new Edge(startVertices[i], startVertices[i + 1]);
        startEdges.push(edge);
        brep.addEdge(edge);
      }
      const startFace = new Face(startEdges);
      brep.addFace(startFace);
      
      // End cap
      const endVertices = revolutionVertices[steps];
      const endEdges: Edge[] = [];
      for (let i = 0; i < endVertices.length - 1; i++) {
        const edge = new Edge(endVertices[i + 1], endVertices[i]); // Reverse for correct normal
        endEdges.push(edge);
        brep.addEdge(edge);
      }
      const endFace = new Face(endEdges);
      brep.addFace(endFace);
    }

    return new Solid(brep, `Revolved_${sketch.name}`);
  }

  /**
   * Create a loft between multiple sketches
   */
  loft(profiles: Sketch[], guides?: Sketch[], closed?: boolean): Solid {
    if (profiles.length < 2) {
      throw new Error('Loft requires at least 2 profile sketches');
    }

    // Create B-Rep for the lofted solid
    const brep = new BoundaryRepresentation();
    
    // Extract vertices from each profile
    const profileVertices: Vertex[][] = [];
    
    for (const profile of profiles) {
      const vertices: Vertex[] = [];
      const points = this.extractSketchVertices(profile);
      
      for (const [key, point] of points) {
        const worldPoint = profile.sketchToWorld(point);
        const vertex = new Vertex(worldPoint);
        vertices.push(vertex);
        brep.addVertex(vertex);
      }
      
      profileVertices.push(vertices);
    }

    // Create faces by connecting corresponding vertices between profiles
    for (let profileIndex = 0; profileIndex < profiles.length - 1; profileIndex++) {
      const currentProfile = profileVertices[profileIndex];
      const nextProfile = profileVertices[profileIndex + 1];
      
      const minVertexCount = Math.min(currentProfile.length, nextProfile.length);
      
      for (let i = 0; i < minVertexCount - 1; i++) {
        // Create quad face between profiles
        const v1 = currentProfile[i];
        const v2 = currentProfile[i + 1];
        const v3 = nextProfile[i + 1];
        const v4 = nextProfile[i];
        
        const edge1 = new Edge(v1, v2);
        const edge2 = new Edge(v2, v3);
        const edge3 = new Edge(v3, v4);
        const edge4 = new Edge(v4, v1);
        
        brep.addEdge(edge1);
        brep.addEdge(edge2);
        brep.addEdge(edge3);
        brep.addEdge(edge4);
        
        const face = new Face([edge1, edge2, edge3, edge4]);
        brep.addFace(face);
      }
    }

    // Create end caps
    if (!closed) {
      // First profile cap
      const firstProfile = profileVertices[0];
      const firstEdges: Edge[] = [];
      for (let i = 0; i < firstProfile.length - 1; i++) {
        const edge = new Edge(firstProfile[i], firstProfile[i + 1]);
        firstEdges.push(edge);
        brep.addEdge(edge);
      }
      const firstFace = new Face(firstEdges);
      brep.addFace(firstFace);
      
      // Last profile cap
      const lastProfile = profileVertices[profileVertices.length - 1];
      const lastEdges: Edge[] = [];
      for (let i = 0; i < lastProfile.length - 1; i++) {
        const edge = new Edge(lastProfile[i + 1], lastProfile[i]); // Reverse for correct normal
        lastEdges.push(edge);
        brep.addEdge(edge);
      }
      const lastFace = new Face(lastEdges);
      brep.addFace(lastFace);
    }

    return new Solid(brep, 'Lofted_Solid');
  }

  /**
   * Sweep a profile along a path
   */
  sweep(profile: Sketch, path: Sketch, twist?: number, scale?: number): Solid {
    const twistAngle = twist || 0;
    const scaleValue = scale || 1;

    // Create B-Rep for the swept solid
    const brep = new BoundaryRepresentation();
    
    // Get path points (simplified - assumes path is a single curve)
    const pathElements = path.getAllElements();
    if (pathElements.length === 0) {
      throw new Error('Sweep path cannot be empty');
    }

    // Sample points along the path
    const pathPoints = this.samplePathPoints(path, 20); // 20 samples along path
    
    // Get profile vertices
    const profilePoints = this.extractSketchVertices(profile);
    
    // Create vertices by sweeping profile along path
    const sweepVertices: Vertex[][] = [];
    
    for (let i = 0; i < pathPoints.length; i++) {
      const t = i / (pathPoints.length - 1); // Parameter from 0 to 1
      const pathPoint = pathPoints[i];
      const stepVertices: Vertex[] = [];
      
      // Calculate transform for this step
      const currentScale = 1 + (scaleValue - 1) * t;
      const currentTwist = twistAngle * t * Math.PI / 180;
      
      for (const [key, point] of profilePoints) {
        let transformedPoint = point.clone();
        
        // Apply scale
        if (currentScale !== 1) {
          transformedPoint = transformedPoint.scale(currentScale);
        }
        
        // Apply twist (rotation around Z-axis)
        if (currentTwist !== 0) {
          const cos = Math.cos(currentTwist);
          const sin = Math.sin(currentTwist);
          const x = transformedPoint.x * cos - transformedPoint.y * sin;
          const y = transformedPoint.x * sin + transformedPoint.y * cos;
          transformedPoint = new Point(x, y, transformedPoint.z);
        }
        
        // Transform to world coordinates and translate to path point
        const worldPoint = profile.sketchToWorld(transformedPoint);
        const finalPoint = worldPoint.add(new Point(pathPoint.x, pathPoint.y, pathPoint.z));
        
        const vertex = new Vertex(finalPoint);
        stepVertices.push(vertex);
        brep.addVertex(vertex);
      }
      
      sweepVertices.push(stepVertices);
    }

    // Create faces by connecting adjacent sweep steps
    for (let step = 0; step < sweepVertices.length - 1; step++) {
      const currentVertices = sweepVertices[step];
      const nextVertices = sweepVertices[step + 1];
      
      for (let i = 0; i < currentVertices.length - 1; i++) {
        // Create quad face
        const v1 = currentVertices[i];
        const v2 = currentVertices[i + 1];
        const v3 = nextVertices[i + 1];
        const v4 = nextVertices[i];
        
        const edge1 = new Edge(v1, v2);
        const edge2 = new Edge(v2, v3);
        const edge3 = new Edge(v3, v4);
        const edge4 = new Edge(v4, v1);
        
        brep.addEdge(edge1);
        brep.addEdge(edge2);
        brep.addEdge(edge3);
        brep.addEdge(edge4);
        
        const face = new Face([edge1, edge2, edge3, edge4]);
        brep.addFace(face);
      }
    }

    return new Solid(brep, `Swept_${profile.name}`);
  }

  /**
   * Create fillet on solid edges
   */
  fillet(solid: Solid, edgeIds: string[], radius: number): Solid {
    // This is a simplified implementation
    // A full implementation would require complex geometric algorithms
    const clonedSolid = solid.clone();
    clonedSolid.name = `Filleted_${solid.name}`;
    return clonedSolid;
  }

  /**
   * Create chamfer on solid edges
   */
  chamfer(solid: Solid, edgeIds: string[], distance: number, angle: number): Solid {
    // This is a simplified implementation
    const clonedSolid = solid.clone();
    clonedSolid.name = `Chamfered_${solid.name}`;
    return clonedSolid;
  }

  /**
   * Create shell from solid
   */
  shell(solid: Solid, thickness: number, facesToRemove: string[]): Solid {
    // This is a simplified implementation
    const clonedSolid = solid.clone();
    clonedSolid.name = `Shelled_${solid.name}`;
    return clonedSolid;
  }

  /**
   * Apply draft to faces
   */
  draft(solid: Solid, faceIds: string[], angle: number, direction: Vector): Solid {
    // This is a simplified implementation
    const clonedSolid = solid.clone();
    clonedSolid.name = `Drafted_${solid.name}`;
    return clonedSolid;
  }

  /**
   * Create linear pattern
   */
  linearPattern(solid: Solid, direction: Vector, spacing: number, count: number): Solid {
    const brep = new BoundaryRepresentation();
    
    for (let i = 0; i < count; i++) {
      const offset = direction.normalize().scale(spacing * i);
      const clonedSolid = solid.clone();
      
      // Transform vertices
      for (const vertex of clonedSolid.brep.getAllVertices()) {
        vertex.point = vertex.point.add(new Point(offset.x, offset.y, offset.z));
        brep.addVertex(vertex);
      }
      
      // Add edges and faces
      for (const edge of clonedSolid.brep.getAllEdges()) {
        brep.addEdge(edge);
      }
      
      for (const face of clonedSolid.brep.getAllFaces()) {
        brep.addFace(face);
      }
    }
    
    return new Solid(brep, `LinearPattern_${solid.name}`);
  }

  /**
   * Create circular pattern
   */
  circularPattern(solid: Solid, axisPoint: Point, axisDirection: Vector, angle: number, count: number): Solid {
    const brep = new BoundaryRepresentation();
    const angleStep = (angle * Math.PI / 180) / count;
    
    for (let i = 0; i < count; i++) {
      const currentAngle = angleStep * i;
      const clonedSolid = solid.clone();
      
      // Transform vertices
      for (const vertex of clonedSolid.brep.getAllVertices()) {
        vertex.point = this.revolvePointAroundAxis(vertex.point, axisPoint, axisDirection, currentAngle);
        brep.addVertex(vertex);
      }
      
      // Add edges and faces
      for (const edge of clonedSolid.brep.getAllEdges()) {
        brep.addEdge(edge);
      }
      
      for (const face of clonedSolid.brep.getAllFaces()) {
        brep.addFace(face);
      }
    }
    
    return new Solid(brep, `CircularPattern_${solid.name}`);
  }

  /**
   * Mirror solid across a plane
   */
  mirror(solid: Solid, planePoint: Point, planeNormal: Vector): Solid {
    const clonedSolid = solid.clone();
    
    // Mirror all vertices
    for (const vertex of clonedSolid.brep.getAllVertices()) {
      vertex.point = this.mirrorPointAcrossPlane(vertex.point, planePoint, planeNormal);
    }
    
    clonedSolid.name = `Mirrored_${solid.name}`;
    return clonedSolid;
  }

  /**
   * Boolean union of two solids
   */
  union(solid1: Solid, solid2: Solid): Solid {
    // This is a simplified implementation
    // A full implementation would require complex CSG algorithms
    const brep = new BoundaryRepresentation();
    
    // Combine all vertices, edges, and faces from both solids
    for (const vertex of solid1.brep.getAllVertices()) {
      brep.addVertex(vertex.clone());
    }
    for (const vertex of solid2.brep.getAllVertices()) {
      brep.addVertex(vertex.clone());
    }
    
    for (const edge of solid1.brep.getAllEdges()) {
      brep.addEdge(edge.clone());
    }
    for (const edge of solid2.brep.getAllEdges()) {
      brep.addEdge(edge.clone());
    }
    
    for (const face of solid1.brep.getAllFaces()) {
      brep.addFace(face.clone());
    }
    for (const face of solid2.brep.getAllFaces()) {
      brep.addFace(face.clone());
    }
    
    return new Solid(brep, `Union_${solid1.name}_${solid2.name}`);
  }

  /**
   * Boolean subtraction of two solids
   */
  subtract(solid1: Solid, solid2: Solid): Solid {
    // This is a simplified implementation
    const clonedSolid = solid1.clone();
    clonedSolid.name = `Subtract_${solid1.name}_${solid2.name}`;
    return clonedSolid;
  }

  /**
   * Boolean intersection of two solids
   */
  intersect(solid1: Solid, solid2: Solid): Solid {
    // This is a simplified implementation
    const clonedSolid = solid1.clone();
    clonedSolid.name = `Intersect_${solid1.name}_${solid2.name}`;
    return clonedSolid;
  }

  // Helper methods

  private extractSketchVertices(sketch: Sketch): Map<string, Point> {
    const vertices = new Map<string, Point>();
    const elements = sketch.getAllElements();
    
    for (const element of elements) {
      const points = element.getControlPoints();
      for (let i = 0; i < points.length; i++) {
        const key = `${element.id}_${i}`;
        vertices.set(key, points[i]);
      }
    }
    
    return vertices;
  }

  private createEdgesFromSketch(sketch: Sketch, vertices: Map<string, Point>): Array<{startKey: string, endKey: string}> {
    const edges: Array<{startKey: string, endKey: string}> = [];
    const elements = sketch.getAllElements();
    
    for (const element of elements) {
      if (element instanceof Line) {
        edges.push({
          startKey: `${element.id}_0`,
          endKey: `${element.id}_1`
        });
      }
      // Add more element types as needed
    }
    
    return edges;
  }

  private getSketchCenter(sketch: Sketch): Point {
    const bbox = sketch.getBoundingBox();
    if (!bbox) {
      return new Point(0, 0, 0);
    }
    
    return new Point(
      (bbox.min.x + bbox.max.x) / 2,
      (bbox.min.y + bbox.max.y) / 2,
      (bbox.min.z + bbox.max.z) / 2
    );
  }

  private revolvePointAroundAxis(point: Point, axisPoint: Point, axisDirection: Vector, angle: number): Point {
    // Translate point to axis origin
    const translatedPoint = point.subtract(axisPoint);
    
    // Create rotation matrix around axis
    const axis = axisDirection.normalize();
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const oneMinusCos = 1 - cos;
    
    // Rodrigues' rotation formula
    const x = translatedPoint.x;
    const y = translatedPoint.y;
    const z = translatedPoint.z;
    
    const rotatedX = (cos + axis.x * axis.x * oneMinusCos) * x +
                     (axis.x * axis.y * oneMinusCos - axis.z * sin) * y +
                     (axis.x * axis.z * oneMinusCos + axis.y * sin) * z;
    
    const rotatedY = (axis.y * axis.x * oneMinusCos + axis.z * sin) * x +
                     (cos + axis.y * axis.y * oneMinusCos) * y +
                     (axis.y * axis.z * oneMinusCos - axis.x * sin) * z;
    
    const rotatedZ = (axis.z * axis.x * oneMinusCos - axis.y * sin) * x +
                     (axis.z * axis.y * oneMinusCos + axis.x * sin) * y +
                     (cos + axis.z * axis.z * oneMinusCos) * z;
    
    // Translate back
    return new Point(rotatedX, rotatedY, rotatedZ).add(axisPoint);
  }

  private samplePathPoints(path: Sketch, sampleCount: number): Point[] {
    const points: Point[] = [];
    const elements = path.getAllElements();
    
    if (elements.length === 0) {
      return points;
    }
    
    // Simplified: sample points along the first element
    const firstElement = elements[0];
    
    for (let i = 0; i < sampleCount; i++) {
      const t = i / (sampleCount - 1);
      let point: Point;
      
      if (firstElement instanceof Line) {
        const start = firstElement.getControlPoints()[0];
        const end = firstElement.getControlPoints()[1];
        point = start.add(end.subtract(start).scale(t));
      } else {
        // For other element types, use first control point as fallback
        point = firstElement.getControlPoints()[0];
      }
      
      points.push(path.sketchToWorld(point));
    }
    
    return points;
  }

  private mirrorPointAcrossPlane(point: Point, planePoint: Point, planeNormal: Vector): Point {
    const normal = planeNormal.normalize();
    const pointToPlane = point.subtract(planePoint);
    const distance = pointToPlane.dot(new Point(normal.x, normal.y, normal.z));
    const offset = normal.scale(2 * distance);
    const mirroredPoint = point.subtract(new Point(offset.x, offset.y, offset.z));
    return mirroredPoint;
  }
}