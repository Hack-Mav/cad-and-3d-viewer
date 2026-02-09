import { Point } from '../core/Point';
import { Vector } from '../core/Vector';

/**
 * Represents a vertex in the boundary representation
 */
export class Vertex {
  public id: string;
  public point: Point;
  public tolerance: number;

  constructor(point: Point, id?: string, tolerance: number = 1e-6) {
    this.id = id || this.generateId();
    this.point = point.clone();
    this.tolerance = tolerance;
  }

  private generateId(): string {
    return `vertex_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  clone(): Vertex {
    return new Vertex(this.point, this.id, this.tolerance);
  }

  equals(other: Vertex, tolerance?: number): boolean {
    const tol = tolerance || this.tolerance;
    return this.point.equals(other.point, tol);
  }

  toString(): string {
    return `Vertex(${this.point.toString()})`;
  }
}

/**
 * Represents an edge in the boundary representation
 */
export class Edge {
  public id: string;
  public startVertex: Vertex;
  public endVertex: Vertex;
  public curve?: any; // Curve geometry (line, arc, spline, etc.)
  public tolerance: number;

  constructor(startVertex: Vertex, endVertex: Vertex, id?: string, tolerance: number = 1e-6) {
    this.id = id || this.generateId();
    this.startVertex = startVertex;
    this.endVertex = endVertex;
    this.tolerance = tolerance;
  }

  private generateId(): string {
    return `edge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get the length of the edge
   */
  getLength(): number {
    return this.startVertex.point.distanceTo(this.endVertex.point);
  }

  /**
   * Get the direction vector of the edge
   */
  getDirection(): Vector {
    return this.endVertex.point.subtract(this.startVertex.point).normalize();
  }

  /**
   * Get a point along the edge at parameter t (0 to 1)
   */
  getPointAt(t: number): Point {
    const start = this.startVertex.point;
    const end = this.endVertex.point;
    return start.add(end.subtract(start).scale(t));
  }

  /**
   * Check if this edge is degenerate (zero length)
   */
  isDegenerate(): boolean {
    return this.getLength() < this.tolerance;
  }

  clone(): Edge {
    return new Edge(this.startVertex.clone(), this.endVertex.clone(), this.id, this.tolerance);
  }

  toString(): string {
    return `Edge(${this.startVertex.point.toString()} -> ${this.endVertex.point.toString()})`;
  }
}

/**
 * Represents a face in the boundary representation
 */
export class Face {
  public id: string;
  public outerLoop: Edge[];
  public innerLoops: Edge[][];
  public surface?: any; // Surface geometry (plane, cylinder, sphere, etc.)
  public normal?: Vector;
  public area?: number;
  public tolerance: number;

  constructor(outerLoop: Edge[], id?: string, tolerance: number = 1e-6) {
    this.id = id || this.generateId();
    this.outerLoop = [...outerLoop];
    this.innerLoops = [];
    this.tolerance = tolerance;
    this.computeNormal();
  }

  private generateId(): string {
    return `face_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Add an inner loop (hole) to the face
   */
  addInnerLoop(loop: Edge[]): void {
    this.innerLoops.push([...loop]);
  }

  /**
   * Compute the face normal using the outer loop
   */
  private computeNormal(): void {
    if (this.outerLoop.length < 3) {
      return;
    }

    // Use first three non-collinear points to compute normal
    const p1 = this.outerLoop[0].startVertex.point;
    const p2 = this.outerLoop[0].endVertex.point;
    const p3 = this.outerLoop[1].endVertex.point;

    const v1 = p2.subtract(p1);
    const v2 = p3.subtract(p1);
    this.normal = v1.cross(v2).normalize();
  }

  /**
   * Get all vertices in the face
   */
  getVertices(): Vertex[] {
    const vertices: Vertex[] = [];
    const vertexIds = new Set<string>();

    // Add vertices from outer loop
    for (const edge of this.outerLoop) {
      if (!vertexIds.has(edge.startVertex.id)) {
        vertices.push(edge.startVertex);
        vertexIds.add(edge.startVertex.id);
      }
      if (!vertexIds.has(edge.endVertex.id)) {
        vertices.push(edge.endVertex);
        vertexIds.add(edge.endVertex.id);
      }
    }

    // Add vertices from inner loops
    for (const loop of this.innerLoops) {
      for (const edge of loop) {
        if (!vertexIds.has(edge.startVertex.id)) {
          vertices.push(edge.startVertex);
          vertexIds.add(edge.startVertex.id);
        }
        if (!vertexIds.has(edge.endVertex.id)) {
          vertices.push(edge.endVertex);
          vertexIds.add(edge.endVertex.id);
        }
      }
    }

    return vertices;
  }

  /**
   * Get all edges in the face
   */
  getEdges(): Edge[] {
    const edges: Edge[] = [...this.outerLoop];
    for (const loop of this.innerLoops) {
      edges.push(...loop);
    }
    return edges;
  }

  /**
   * Compute the area of the face (simplified for planar faces)
   */
  computeArea(): number {
    if (this.outerLoop.length < 3) {
      return 0;
    }

    // Use shoelace formula for planar faces
    let area = 0;
    const vertices = this.outerLoop.map(edge => edge.startVertex.point);
    
    for (let i = 0; i < vertices.length; i++) {
      const j = (i + 1) % vertices.length;
      area += vertices[i].x * vertices[j].y;
      area -= vertices[j].x * vertices[i].y;
    }
    
    this.area = Math.abs(area) / 2;
    return this.area;
  }

  /**
   * Check if the face is valid
   */
  isValid(): boolean {
    // Check if outer loop is closed
    if (this.outerLoop.length < 3) {
      return false;
    }

    // Check if outer loop forms a closed chain
    for (let i = 0; i < this.outerLoop.length; i++) {
      const currentEdge = this.outerLoop[i];
      const nextEdge = this.outerLoop[(i + 1) % this.outerLoop.length];
      
      if (!currentEdge.endVertex.equals(nextEdge.startVertex)) {
        return false;
      }
    }

    // Check inner loops
    for (const loop of this.innerLoops) {
      if (loop.length < 3) {
        return false;
      }
      
      for (let i = 0; i < loop.length; i++) {
        const currentEdge = loop[i];
        const nextEdge = loop[(i + 1) % loop.length];
        
        if (!currentEdge.endVertex.equals(nextEdge.startVertex)) {
          return false;
        }
      }
    }

    return true;
  }

  clone(): Face {
    const clonedFace = new Face(
      this.outerLoop.map(edge => edge.clone()),
      this.id,
      this.tolerance
    );
    
    clonedFace.innerLoops = this.innerLoops.map(loop => 
      loop.map(edge => edge.clone())
    );
    
    if (this.normal) {
      clonedFace.normal = this.normal.clone();
    }
    
    clonedFace.area = this.area;
    return clonedFace;
  }

  toString(): string {
    return `Face(edges: ${this.outerLoop.length}, holes: ${this.innerLoops.length})`;
  }
}

/**
 * Represents a solid using boundary representation
 */
export class BoundaryRepresentation {
  public id: string;
  public vertices: Map<string, Vertex>;
  public edges: Map<string, Edge>;
  public faces: Map<string, Face>;
  public tolerance: number;

  constructor(id?: string, tolerance: number = 1e-6) {
    this.id = id || this.generateId();
    this.vertices = new Map();
    this.edges = new Map();
    this.faces = new Map();
    this.tolerance = tolerance;
  }

  private generateId(): string {
    return `brep_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Add a vertex to the B-Rep
   */
  addVertex(vertex: Vertex): void {
    this.vertices.set(vertex.id, vertex);
  }

  /**
   * Add an edge to the B-Rep
   */
  addEdge(edge: Edge): void {
    this.edges.set(edge.id, edge);
    // Ensure vertices are also added
    this.addVertex(edge.startVertex);
    this.addVertex(edge.endVertex);
  }

  /**
   * Add a face to the B-Rep
   */
  addFace(face: Face): void {
    this.faces.set(face.id, face);
    // Ensure edges and vertices are also added
    for (const edge of face.getEdges()) {
      this.addEdge(edge);
    }
  }

  /**
   * Get all vertices
   */
  getAllVertices(): Vertex[] {
    return Array.from(this.vertices.values());
  }

  /**
   * Get all edges
   */
  getAllEdges(): Edge[] {
    return Array.from(this.edges.values());
  }

  /**
   * Get all faces
   */
  getAllFaces(): Face[] {
    return Array.from(this.faces.values());
  }

  /**
   * Compute the volume of the solid (simplified)
   */
  computeVolume(): number {
    let volume = 0;
    
    // Use divergence theorem for closed surfaces
    for (const face of this.getAllFaces()) {
      if (face.normal && face.area !== undefined) {
        // Get a representative point on the face
        const centroid = this.getFaceCentroid(face);
        volume += (centroid.dot(face.normal) * face.area) / 3;
      }
    }
    
    return Math.abs(volume);
  }

  /**
   * Get the centroid of a face
   */
  private getFaceCentroid(face: Face): Point {
    const vertices = face.getVertices();
    let sum = new Point(0, 0, 0);
    
    for (const vertex of vertices) {
      sum = sum.add(vertex.point);
    }
    
    return sum.scale(1 / vertices.length);
  }

  /**
   * Compute the surface area of the solid
   */
  computeSurfaceArea(): number {
    let totalArea = 0;
    
    for (const face of this.getAllFaces()) {
      totalArea += face.computeArea();
    }
    
    return totalArea;
  }

  /**
   * Get the bounding box of the solid
   */
  getBoundingBox(): { min: Point; max: Point } {
    const vertices = this.getAllVertices();
    
    if (vertices.length === 0) {
      return { min: new Point(0, 0, 0), max: new Point(0, 0, 0) };
    }
    
    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
    
    for (const vertex of vertices) {
      const p = vertex.point;
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      minZ = Math.min(minZ, p.z);
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y);
      maxZ = Math.max(maxZ, p.z);
    }
    
    return {
      min: new Point(minX, minY, minZ),
      max: new Point(maxX, maxY, maxZ)
    };
  }

  /**
   * Validate the B-Rep structure
   */
  validate(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Check if all faces are valid
    for (const face of this.getAllFaces()) {
      if (!face.isValid()) {
        errors.push(`Invalid face: ${face.id}`);
      }
    }
    
    // Check if all edges are referenced by faces
    const referencedEdges = new Set<string>();
    for (const face of this.getAllFaces()) {
      for (const edge of face.getEdges()) {
        referencedEdges.add(edge.id);
      }
    }
    
    for (const edge of this.getAllEdges()) {
      if (!referencedEdges.has(edge.id)) {
        errors.push(`Orphaned edge: ${edge.id}`);
      }
    }
    
    // Check if all vertices are referenced by edges
    const referencedVertices = new Set<string>();
    for (const edge of this.getAllEdges()) {
      referencedVertices.add(edge.startVertex.id);
      referencedVertices.add(edge.endVertex.id);
    }
    
    for (const vertex of this.getAllVertices()) {
      if (!referencedVertices.has(vertex.id)) {
        errors.push(`Orphaned vertex: ${vertex.id}`);
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Clone the B-Rep
   */
  clone(): BoundaryRepresentation {
    const cloned = new BoundaryRepresentation(this.id, this.tolerance);
    
    // Clone vertices
    for (const vertex of this.getAllVertices()) {
      cloned.addVertex(vertex.clone());
    }
    
    // Clone edges
    for (const edge of this.getAllEdges()) {
      cloned.addEdge(edge.clone());
    }
    
    // Clone faces
    for (const face of this.getAllFaces()) {
      cloned.addFace(face.clone());
    }
    
    return cloned;
  }

  toString(): string {
    return `BRep(vertices: ${this.vertices.size}, edges: ${this.edges.size}, faces: ${this.faces.size})`;
  }
}