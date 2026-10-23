import * as THREE from 'three'

const towerTemplates = {
  'tokyo-tower': {
    primary: 0.85,
    height: 1.25,
    crown: 'antenna',
    design: 'lattice',
  },
  skytree: {
    primary: 1.1,
    height: 1.55,
    crown: 'spire',
    design: 'rings',
  },
  'fukuoka-tower': {
    primary: 0.8,
    height: 1.2,
    crown: 'arch',
    design: 'frame',
  },
  'mirai-tower': {
    primary: 0.7,
    height: 1.1,
    crown: 'spire',
    design: 'observation',
  },
  'kyoto-tower': {
    primary: 0.7,
    height: 1.1,
    crown: 'beacon',
    design: 'stacked',
  },
  'kobe-tower': {
    primary: 0.9,
    height: 1.15,
    crown: 'arched',
    design: 'legs',
  },
  tsutenkaku: {
    primary: 0.72,
    height: 1.05,
    crown: 'spire',
    design: 'platforms',
  },
  'marine-tower': {
    primary: 0.74,
    height: 1.1,
    crown: 'mast',
    design: 'fins',
  },
  'sapporo-tower': {
    primary: 0.78,
    height: 1.2,
    crown: 'spire',
    design: 'block',
  },
}

function buildGlassMaterial(color, opacity = 0.82, tint = 0.85) {
  return new THREE.MeshPhysicalMaterial({
    color,
    roughness: 0.18,
    metalness: 0.14,
    transmission: 0.75,
    transparent: true,
    opacity,
    thickness: 0.8,
    clearcoat: 0.9,
    clearcoatRoughness: 0.28,
    envMapIntensity: 1,
    ior: 1.3,
    attenuationColor: new THREE.Color(color).multiplyScalar(tint),
  })
}

function makeAccentMaterial(color) {
  return new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: 0.08,
    metalness: 0.2,
    roughness: 0.42,
  })
}

function addTowerDetails(group, spec, glass, accent) {
  const addMesh = (geometry, material, x, y, z, rotationY = 0) => {
    const mesh = new THREE.Mesh(geometry, material)
    mesh.position.set(x, y, z)
    mesh.rotation.y = rotationY
    group.add(mesh)
  }

  if (spec.design === 'lattice') {
    ;[0.42, 0.75, 1.08].forEach((height) => {
      addMesh(new THREE.TorusGeometry(0.3 * spec.primary, 0.025, 8, 24), accent, 0, height, 0)
    })
  }

  if (spec.design === 'rings') {
    ;[0.6, 1.05, 1.5].forEach((height, index) => {
      addMesh(new THREE.TorusGeometry((0.28 + index * 0.04) * spec.primary, 0.035, 10, 28), glass, 0, height, 0)
    })
  }

  if (spec.design === 'frame') {
    const support = new THREE.BoxGeometry(0.08, 1.05 * spec.height, 0.08)
    addMesh(support, accent, -0.22, 0.65 * spec.height, 0, -0.22)
    addMesh(support, accent, 0.22, 0.65 * spec.height, 0, 0.22)
    addMesh(new THREE.BoxGeometry(0.58, 0.09, 0.12), glass, 0, 1.12 * spec.height, 0)
  }

  if (spec.design === 'observation') {
    addMesh(new THREE.CylinderGeometry(0.42, 0.36, 0.12, 24), glass, 0, 1.02 * spec.height, 0)
    addMesh(new THREE.TorusGeometry(0.38, 0.035, 8, 24), accent, 0, 1.1 * spec.height, 0)
  }

  if (spec.design === 'stacked') {
    ;[0.52, 0.78, 1.04].forEach((height, index) => {
      addMesh(new THREE.CylinderGeometry(0.28 - index * 0.035, 0.3 - index * 0.035, 0.08, 20), glass, 0, height, 0)
    })
  }

  if (spec.design === 'legs') {
    const leg = new THREE.BoxGeometry(0.09, 1.05 * spec.height, 0.09)
    ;[-0.22, 0.22].forEach((x) => {
      ;[-0.16, 0.16].forEach((z) => addMesh(leg, accent, x, 0.62 * spec.height, z))
    })
    addMesh(new THREE.TorusGeometry(0.34, 0.035, 8, 24), glass, 0, 1.1 * spec.height, 0)
  }

  if (spec.design === 'platforms') {
    ;[0.52, 0.92, 1.3].forEach((height, index) => {
      addMesh(new THREE.BoxGeometry(0.58 - index * 0.06, 0.08, 0.58 - index * 0.06), accent, 0, height, 0)
    })
  }

  if (spec.design === 'fins') {
    ;[-1, 1].forEach((direction) => {
      addMesh(new THREE.BoxGeometry(0.08, 0.8 * spec.height, 0.34), accent, direction * 0.25, 0.68 * spec.height, 0)
    })
    addMesh(new THREE.CylinderGeometry(0.035, 0.035, 0.55 * spec.height, 10), accent, 0, 1.55 * spec.height, 0)
  }

  if (spec.design === 'block') {
    addMesh(new THREE.BoxGeometry(0.62, 0.18, 0.62), glass, 0, 1.02 * spec.height, 0)
    addMesh(new THREE.BoxGeometry(0.42, 0.12, 0.42), accent, 0, 1.38 * spec.height, 0)
  }
}

function addChessTypeDetails(group, pieceType, spec, glass, accent) {
  const top = 1.9 * spec.height

  if (pieceType === 'k') {
    const vertical = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.34, 0.08), accent)
    vertical.position.y = top + 0.12
    group.add(vertical)
    const horizontal = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.08, 0.08), accent)
    horizontal.position.y = top + 0.14
    group.add(horizontal)
  }

  if (pieceType === 'q') {
    const crown = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 12), glass)
    crown.position.y = top + 0.1
    group.add(crown)
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.035, 8, 20), accent)
    ring.position.y = top
    group.add(ring)
  }

  if (pieceType === 'b') {
    const mitre = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.34, 4), glass)
    mitre.position.y = top + 0.1
    mitre.rotation.y = Math.PI / 4
    group.add(mitre)
    const slash = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.2, 0.08), accent)
    slash.position.y = top + 0.1
    slash.rotation.z = -0.55
    group.add(slash)
  }

  if (pieceType === 'n') {
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.16, 0.34, 12), glass)
    neck.position.y = top + 0.1
    neck.rotation.z = -0.25
    group.add(neck)
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.22, 8), accent)
    ear.position.set(0.08, top + 0.34, 0)
    ear.rotation.z = -0.3
    group.add(ear)
  }

  if (pieceType === 'r') {
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.16, 4), glass)
    crown.position.y = top + 0.08
    crown.rotation.y = Math.PI / 4
    group.add(crown)
    ;[-1, 1].forEach((x) => {
      ;[-1, 1].forEach((z) => {
        const merlon = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.16, 0.08), accent)
        merlon.position.set(x * 0.12, top + 0.2, z * 0.12)
        group.add(merlon)
      })
    })
  }

  if (pieceType === 'p') {
    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.035, 8, 20), accent)
    collar.position.y = top
    group.add(collar)
  }
}

export function createTowerModel(towerId, color, scale = 1, tint = 0.85, pieceType = 'p') {
  const spec = towerTemplates[towerId] ?? towerTemplates['tokyo-tower']
  const group = new THREE.Group()
  const glass = buildGlassMaterial(color, 0.84, tint)
  const accent = makeAccentMaterial(new THREE.Color(color).offsetHSL(0.02, -0.08, 0.15).getHex())

  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.7, 0.14, 24), glass)
  base.position.y = 0.07
  group.add(base)

  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.28 * spec.primary, 0.4 * spec.primary, 0.66 * spec.height, 24), glass)
  torso.position.y = 0.48 * spec.height
  group.add(torso)

  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.18 * spec.primary, 0.28 * spec.primary, 0.45 * spec.height, 18), accent)
  body.position.y = 0.95 * spec.height
  group.add(body)

  const crownGeometry = new THREE.ConeGeometry(0.2 * spec.primary, 0.37 * spec.height, 18)
  const crown = new THREE.Mesh(crownGeometry, glass)
  crown.position.y = 1.46 * spec.height
  group.add(crown)

  const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.18 * spec.height, 10), accent)
  antenna.position.y = 1.8 * spec.height
  group.add(antenna)

  if (spec.crown === 'spire') {
    const point = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.24, 12), accent)
    point.position.y = 2.02 * spec.height
    group.add(point)
  }

  if (spec.crown === 'arch') {
    const beam = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.08, 0.14), accent)
    beam.position.set(0, 1.72 * spec.height, 0)
    group.add(beam)
  }

  if (spec.crown === 'beacon') {
    const pulse = new THREE.Mesh(new THREE.SphereGeometry(0.12, 14, 14), accent)
    pulse.position.y = 1.9 * spec.height
    group.add(pulse)
  }

  if (spec.crown === 'antenna') {
    const ear = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.28, 0.08), accent)
    ear.position.set(0, 1.8 * spec.height, 0)
    group.add(ear)
  }

  addTowerDetails(group, spec, glass, accent)
  addChessTypeDetails(group, pieceType, spec, glass, accent)

  group.scale.setScalar(scale)
  group.rotation.y = Math.PI / 4
  group.userData.towerId = towerId
  return group
}
