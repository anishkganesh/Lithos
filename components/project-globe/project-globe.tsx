"use client"

import { useRef, useState, useMemo } from 'react'
import { Canvas, useFrame, useLoader } from '@react-three/fiber'
import { OrbitControls, Sphere } from '@react-three/drei'
import * as THREE from 'three'
import { MiningProject } from '@/lib/types/mining-project'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { GlobeFilters } from './globe-filters'

interface ProjectGlobeProps {
  projects: MiningProject[]
  onProjectClick?: (project: MiningProject) => void
  className?: string
}

interface GlobePoint {
  lat: number
  lng: number
  size: number
  color: string
  label: string
  project: MiningProject
  position: THREE.Vector3
}

interface PopupData {
  project: MiningProject
  x: number
  y: number
}

// Helper function to convert lat/lng to 3D coordinates
function latLngToVector3(lat: number, lng: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180)
  const theta = (lng + 180) * (Math.PI / 180)

  const x = -(radius * Math.sin(phi) * Math.cos(theta))
  const z = radius * Math.sin(phi) * Math.sin(theta)
  const y = radius * Math.cos(phi)

  return new THREE.Vector3(x, y, z)
}

// Helper function to get coordinates from location string
function getCoordinatesFromLocation(location: string): { lat: number; lng: number } | null {
  const locationMap: Record<string, { lat: number; lng: number }> = {
    'USA': { lat: 37.0902, lng: -95.7129 },
    'United States': { lat: 37.0902, lng: -95.7129 },
    'Canada': { lat: 56.1304, lng: -106.3468 },
    'Mexico': { lat: 23.6345, lng: -102.5528 },
    'Chile': { lat: -35.6751, lng: -71.5430 },
    'Peru': { lat: -9.1900, lng: -75.0152 },
    'Brazil': { lat: -14.2350, lng: -51.9253 },
    'Argentina': { lat: -38.4161, lng: -63.6167 },
    'Bolivia': { lat: -16.2902, lng: -63.5887 },
    'Sweden': { lat: 60.1282, lng: 18.6435 },
    'Finland': { lat: 61.9241, lng: 25.7482 },
    'Norway': { lat: 60.4720, lng: 8.4689 },
    'UK': { lat: 55.3781, lng: -3.4360 },
    'United Kingdom': { lat: 55.3781, lng: -3.4360 },
    'Spain': { lat: 40.4637, lng: -3.7492 },
    'Portugal': { lat: 39.3999, lng: -8.2245 },
    'South Africa': { lat: -30.5595, lng: 22.9375 },
    'DRC': { lat: -4.0383, lng: 21.7587 },
    'Congo': { lat: -4.0383, lng: 21.7587 },
    'Zambia': { lat: -13.1339, lng: 27.8493 },
    'Tanzania': { lat: -6.3690, lng: 34.8888 },
    'Namibia': { lat: -22.9576, lng: 18.4904 },
    'Botswana': { lat: -22.3285, lng: 24.6849 },
    'Zimbabwe': { lat: -19.0154, lng: 29.1549 },
    'China': { lat: 35.8617, lng: 104.1954 },
    'Mongolia': { lat: 46.8625, lng: 103.8467 },
    'Kazakhstan': { lat: 48.0196, lng: 66.9237 },
    'India': { lat: 20.5937, lng: 78.9629 },
    'Indonesia': { lat: -0.7893, lng: 113.9213 },
    'Philippines': { lat: 12.8797, lng: 121.7740 },
    'Australia': { lat: -25.2744, lng: 133.7751 },
    'Papua New Guinea': { lat: -6.3150, lng: 143.9555 },
    'New Zealand': { lat: -40.9006, lng: 174.8860 },
  }

  for (const [country, coords] of Object.entries(locationMap)) {
    if (location.toLowerCase().includes(country.toLowerCase())) {
      return {
        lat: coords.lat + (Math.random() - 0.5) * 2,
        lng: coords.lng + (Math.random() - 0.5) * 4
      }
    }
  }

  return null
}

// Get color based on commodity
function getCommodityColor(commodities: string[] | null): string {
  if (!commodities || commodities.length === 0) return '#6366f1'

  const primary = commodities[0].toLowerCase()
  const colorMap: Record<string, string> = {
    'lithium': '#818cf8',
    'copper': '#f59e0b',
    'gold': '#fbbf24',
    'silver': '#e5e7eb',
    'nickel': '#10b981',
    'cobalt': '#3b82f6',
    'rare earth': '#8b5cf6',
    'graphite': '#374151',
    'uranium': '#ef4444',
    'iron': '#dc2626',
    'zinc': '#94a3b8',
    'lead': '#64748b',
  }

  for (const [commodity, color] of Object.entries(colorMap)) {
    if (primary.includes(commodity)) return color
  }

  return '#6366f1'
}

// Earth component with points as children
function Earth({ points, onPointClick, onPointHover }: {
  points: GlobePoint[]
  onPointClick: (point: GlobePoint, event: any) => void
  onPointHover: (point: GlobePoint | null) => void
}) {
  const earthRef = useRef<THREE.Group>(null)

  // Load high-quality blue marble texture from reliable CDN
  const texture = useLoader(THREE.TextureLoader, '//cdn.jsdelivr.net/npm/three-globe@2.31.1/example/img/earth-blue-marble.jpg')

  useFrame(() => {
    if (earthRef.current) {
      earthRef.current.rotation.y += 0.001
    }
  })

  return (
    <group ref={earthRef}>
      <Sphere args={[2, 64, 64]}>
        <meshStandardMaterial
          map={texture}
          metalness={0.05}
          roughness={0.8}
          toneMapped={false}
        />
      </Sphere>
      {/* Points as children so they rotate with the globe */}
      {points.map((point, idx) => (
        <ProjectPoint
          key={idx}
          point={point}
          onClick={onPointClick}
          onHover={onPointHover}
        />
      ))}
    </group>
  )
}

// Project Point component
function ProjectPoint({ point, onClick, onHover }: {
  point: GlobePoint
  onClick: (point: GlobePoint, event: any) => void
  onHover: (point: GlobePoint | null) => void
}) {
  const meshRef = useRef<THREE.Mesh>(null)
  const [hovered, setHovered] = useState(false)

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.scale.setScalar(hovered ? 1.5 : 1)
    }
  })

  return (
    <mesh
      ref={meshRef}
      position={point.position}
      onClick={(e) => {
        e.stopPropagation()
        onClick(point, e)
      }}
      onPointerOver={(e) => {
        e.stopPropagation()
        setHovered(true)
        onHover(point)
        document.body.style.cursor = 'pointer'
      }}
      onPointerOut={() => {
        setHovered(false)
        onHover(null)
        document.body.style.cursor = 'auto'
      }}
    >
      <sphereGeometry args={[0.03, 16, 16]} />
      <meshStandardMaterial
        color={point.color}
        emissive={point.color}
        emissiveIntensity={hovered ? 1.5 : 0.5}
      />
    </mesh>
  )
}

// Scene component
function GlobeScene({
  points,
  onPointClick,
  onPointHover
}: {
  points: GlobePoint[]
  onPointClick: (point: GlobePoint, event: any) => void
  onPointHover: (point: GlobePoint | null) => void
}) {
  return (
    <>
      {/* White background for contrast */}
      <color args={['#f8f9fa']} attach="background" />

      {/* Enhanced three-point lighting setup for bright, clear globe */}
      <ambientLight intensity={1.8} />
      <directionalLight position={[5, 3, 5]} intensity={2.5} castShadow />
      <directionalLight position={[-5, 3, -5]} intensity={1.5} />
      <pointLight position={[10, 10, 10]} intensity={2} />
      <pointLight position={[-10, 0, -10]} intensity={1.2} />
      <hemisphereLight args={['#ffffff', '#b0b0b0', 1]} />

      {/* Earth with points as children - they rotate together */}
      <Earth
        points={points}
        onPointClick={onPointClick}
        onPointHover={onPointHover}
      />

      <OrbitControls
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={3}
        maxDistance={10}
        autoRotate={true}
        autoRotateSpeed={0.5}
      />
    </>
  )
}

export function ProjectGlobe({ projects, onProjectClick, className }: ProjectGlobeProps) {
  const [selectedProject, setSelectedProject] = useState<MiningProject | null>(null)
  const [hoveredPoint, setHoveredPoint] = useState<GlobePoint | null>(null)
  const [filteredProjects, setFilteredProjects] = useState<MiningProject[]>(projects)
  const canvasRef = useRef<HTMLDivElement>(null)

  // Convert filtered projects to globe points
  const globePoints = useMemo(() => {
    const points: GlobePoint[] = []

    filteredProjects.forEach(project => {
      if (!project.location) return

      const coords = getCoordinatesFromLocation(project.location)
      if (!coords) return

      const position = latLngToVector3(coords.lat, coords.lng, 2.05)

      points.push({
        lat: coords.lat,
        lng: coords.lng,
        size: 0.5,
        color: getCommodityColor(project.commodities),
        label: project.name,
        project,
        position
      })
    })

    return points
  }, [filteredProjects])

  const handlePointClick = (point: GlobePoint, event: any) => {
    setSelectedProject(point.project)
  }

  return (
    <div className={cn("relative w-full h-full bg-background", className)} ref={canvasRef}>
      {/* Filters & Stats - Bottom Left (combined) */}
      <div className="absolute bottom-4 left-4 z-10 space-y-2">
        <GlobeFilters
          projects={projects}
          onFilterChange={setFilteredProjects}
        />

        <Card className="p-3 shadow-sm">
          <h3 className="text-xs font-semibold mb-2">Commodities</h3>
          <div className="space-y-1.5 text-xs">
            {[
              { color: '#818cf8', label: 'Lithium' },
              { color: '#f59e0b', label: 'Copper' },
              { color: '#fbbf24', label: 'Gold' },
              { color: '#10b981', label: 'Nickel' },
              { color: '#8b5cf6', label: 'Rare Earth' },
              { color: '#3b82f6', label: 'Cobalt' },
            ].map((item, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <div
                  className="w-2.5 h-2.5 rounded-full ring-1 ring-border"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-muted-foreground">{item.label}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Project Detail Panel */}
      {selectedProject && (
        <Card className="absolute top-4 right-4 z-10 w-80 shadow-lg">
          <div className="p-3">
            <div className="flex items-start justify-between mb-2">
              <h3 className="font-semibold text-sm leading-tight pr-2">
                {selectedProject.name}
              </h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelectedProject(null)}
                className="h-6 w-6 -mr-1.5 -mt-0.5 flex-shrink-0"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>

            <div className="space-y-2 text-xs">
              <div>
                <div className="text-muted-foreground mb-0.5">Location</div>
                <div className="font-medium">{selectedProject.location || 'N/A'}</div>
              </div>

              {selectedProject.description && (
                <div>
                  <div className="text-muted-foreground mb-0.5">Description</div>
                  <div className="text-muted-foreground leading-relaxed line-clamp-3">
                    {selectedProject.description}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                {selectedProject.commodities && selectedProject.commodities.length > 0 && (
                  <div>
                    <div className="text-muted-foreground mb-0.5">Commodities</div>
                    <div className="font-medium">
                      {selectedProject.commodities.slice(0, 2).join(', ')}
                      {selectedProject.commodities.length > 2 && ` +${selectedProject.commodities.length - 2}`}
                    </div>
                  </div>
                )}
                {selectedProject.stage && (
                  <div>
                    <div className="text-muted-foreground mb-0.5">Stage</div>
                    <div className="font-medium">{selectedProject.stage}</div>
                  </div>
                )}
              </div>

              {(selectedProject.npv || selectedProject.irr) && (
                <div className="grid grid-cols-2 gap-2 pt-2 border-t">
                  {selectedProject.npv && (
                    <div>
                      <div className="text-muted-foreground mb-0.5">NPV</div>
                      <div className="font-semibold">${selectedProject.npv}M</div>
                    </div>
                  )}
                  {selectedProject.irr && (
                    <div>
                      <div className="text-muted-foreground mb-0.5">IRR</div>
                      <div className="font-semibold">{selectedProject.irr}%</div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <Button
              onClick={() => {
                if (onProjectClick) {
                  onProjectClick(selectedProject)
                }
              }}
              className="w-full mt-3"
              size="sm"
            >
              View Full Details
            </Button>
          </div>
        </Card>
      )}

      {/* Hover Tooltip */}
      {hoveredPoint && !selectedProject && (
        <div
          className="fixed z-50 pointer-events-none"
          style={{
            left: '50%',
            top: '20%',
            transform: 'translateX(-50%)'
          }}
        >
          <Card className="p-2 px-3 shadow-lg">
            <div className="text-xs font-medium">{hoveredPoint.label}</div>
          </Card>
        </div>
      )}

      {/* 3D Canvas - no loading fallback for instant display */}
      <Canvas camera={{ position: [0, 0, 5], fov: 45 }}>
        <GlobeScene
          points={globePoints}
          onPointClick={handlePointClick}
          onPointHover={setHoveredPoint}
        />
      </Canvas>
    </div>
  )
}
