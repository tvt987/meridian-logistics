import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import {
  BAY_SPACING_M,
  COL_SPACING_M,
  computeBalancedStowPlan,
  computeVesselStability,
  CONTAINER_HEIGHT_M,
  CONTAINER_LENGTH_M,
  CONTAINER_WIDTH_M,
  CRANE_BOOM_Y,
  createInitialCraneState,
  createInitialPortContainers,
  createPortContainer,
  enqueueCraneJob,
  findNextOpenSlot,
  getBayZ,
  getCameraPresetPose,
  getColLocalX,
  getCraneIndexForBay,
  getSlotLocalPosition,
  injectStarboardImbalance,
  PORT_CONTAINER_SPECS,
  QUAY_DECK_Y,
  QUAY_EDGE_X,
  QUAY_PICKUP_X,
  sampleOceanWaveMotion,
  SHIP_CENTER_X,
  SHIP_DECK_Y,
  SPREADER_HEIGHT_M,
  stepCraneState,
  VESSEL_BAY_COUNT,
  VESSEL_COL_COUNT,
  VESSEL_TIER_COUNT,
  type CameraPresetId,
  type CranePhase,
  type CraneRuntimeState,
  type PortContainer,
  type PortContainerKind,
  type SeaStateMode,
  type VesselStabilityReport,
} from '../engines/maritimePort3dEngine';
import type { Lang, Theme } from '../types/logistics';
import {
  AlertTriangleIcon,
  AnchorIcon,
  BoltIcon,
  CheckCircleIcon,
  CompassIcon,
  ContainerIcon,
  PlusIcon,
  RefreshIcon,
  ScaleIcon,
  ShieldCheckIcon,
} from './Icons';

interface MaritimePort3DStageProps {
  lang: Lang;
  theme: Theme;
}

interface HoveredSlotInfo {
  bay: number;
  col: number;
  tier: number;
}

interface CraneHudSnapshot {
  crane0Phase: CranePhase;
  crane1Phase: CranePhase;
  activeQueued: number;
  completedLifts: number;
}

const BAY_CODES = ['B01', 'B02', 'B03', 'B04'] as const;
const COL_CODES = ['P2', 'P1', 'CL', 'S1', 'S2'] as const;
const TIER_CODES = ['T82', 'T84', 'T86', 'T88'] as const;

/* ============================================================================
 * PROCEDURAL PBR CANVAS TEXTURES (100% Self-Contained, Strict-CSP Compliant)
 * ============================================================================ */

function createCorrugatedContainerTexture(
  kind: PortContainerKind,
  baseHex: string,
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return new THREE.CanvasTexture(canvas);
  }

  // Base metallic coat
  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, 512, 256);

  // Corrugated steel vertical ribs
  const ribCount = 26;
  const ribW = 512 / ribCount;
  for (let i = 0; i < ribCount; i++) {
    const x = i * ribW;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.16)';
    ctx.fillRect(x, 18, ribW * 0.34, 220);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.14)';
    ctx.fillRect(x + ribW * 0.45, 18, ribW * 0.24, 220);
  }

  // Top & bottom ISO structural side rails
  ctx.fillStyle = 'rgba(15, 23, 42, 0.36)';
  ctx.fillRect(0, 0, 512, 18);
  ctx.fillRect(0, 238, 512, 18);

  // Corner casting frames
  ctx.fillStyle = 'rgba(15, 23, 42, 0.55)';
  ctx.fillRect(0, 0, 22, 256);
  ctx.fillRect(490, 0, 22, 256);

  if (kind === 'reefer-40') {
    // Arctic reefer cyan thermal band & insulated panel frame
    ctx.fillStyle = '#06B6D4';
    ctx.fillRect(22, 178, 468, 22);
    ctx.fillStyle = '#0F2942';
    ctx.font = '700 32px sans-serif';
    ctx.fillText('MERIDIAN REEFER', 42, 108);
    ctx.fillStyle = '#0284C7';
    ctx.font = '700 22px monospace';
    ctx.fillText('-18.0 C  ACTIVE COLD CHAIN', 42, 146);
    // Glowing cyan power socket graphic
    ctx.fillStyle = '#22D3EE';
    ctx.fillRect(422, 56, 44, 52);
    ctx.fillStyle = '#0F172A';
    ctx.fillRect(430, 66, 28, 32);
    ctx.fillStyle = '#67E8F9';
    ctx.beginPath();
    ctx.arc(444, 82, 8, 0, Math.PI * 2);
    ctx.fill();
  } else if (kind === 'hazmat-imo3') {
    // Crimson & charcoal diagonal hazard stripes along bottom & top bands
    ctx.save();
    ctx.beginPath();
    ctx.rect(22, 186, 468, 48);
    ctx.clip();
    ctx.fillStyle = '#DC2626';
    ctx.fillRect(22, 186, 468, 48);
    ctx.fillStyle = '#1E293B';
    for (let sx = -40; sx < 540; sx += 36) {
      ctx.beginPath();
      ctx.moveTo(sx, 234);
      ctx.lineTo(sx + 18, 234);
      ctx.lineTo(sx + 40, 186);
      ctx.lineTo(sx + 22, 186);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    // IMO Class 3 Flammable crimson diamond placard
    ctx.save();
    ctx.translate(414, 106);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = '#DC2626';
    ctx.fillRect(-36, -36, 72, 72);
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 4;
    ctx.strokeRect(-30, -30, 60, 60);
    ctx.restore();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '800 24px monospace';
    ctx.fillText('3', 406, 114);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '800 30px sans-serif';
    ctx.fillText('HAZMAT IMO-3', 42, 102);
    ctx.font = '700 20px monospace';
    ctx.fillStyle = '#FEF3C7';
    ctx.fillText('VGM 31.8t · FLAMMABLE', 42, 140);
  } else {
    // Standard 40FT DRY corporate maritime livery
    ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
    ctx.font = '800 34px sans-serif';
    ctx.fillText('MERIDIAN', 44, 112);
    ctx.font = '600 20px monospace';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.78)';
    ctx.fillText('40FT HC · VGM 26.5t', 44, 150);
    ctx.fillStyle = '#FACC15';
    ctx.fillRect(422, 64, 44, 14);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createQuayConcreteTexture(isDark: boolean): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  ctx.fillStyle = isDark ? '#2B3646' : '#CBD5E1';
  ctx.fillRect(0, 0, 512, 512);

  // Subtle weathered concrete slabs & expansion joints
  ctx.strokeStyle = isDark ? 'rgba(15, 23, 42, 0.45)' : 'rgba(71, 85, 105, 0.22)';
  ctx.lineWidth = 2;
  for (let i = 0; i <= 512; i += 64) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 512);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(512, i);
    ctx.stroke();
  }

  // Subtle surface speckle grain (deterministic)
  for (let i = 0; i < 650; i++) {
    const px = ((i * 73) % 509) + 1;
    const py = ((i * 197) % 509) + 1;
    ctx.fillStyle =
      i % 2 === 0
        ? isDark
          ? 'rgba(255,255,255,0.04)'
          : 'rgba(255,255,255,0.22)'
        : 'rgba(15,23,42,0.06)';
    ctx.fillRect(px, py, 3, 3);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 10);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createHullLiveryTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 192;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  ctx.fillStyle = '#14385C';
  ctx.fillRect(0, 0, 1024, 192);

  // Crisp subtle horizontal hull plating weld lines
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, 64);
  ctx.lineTo(1024, 64);
  ctx.moveTo(0, 128);
  ctx.lineTo(1024, 128);
  ctx.stroke();

  // Safety orange accent stripe near upper sheer
  ctx.fillStyle = '#EA580C';
  ctx.fillRect(0, 16, 1024, 12);

  // Bold white vessel hull typography
  ctx.fillStyle = '#F8FAFC';
  ctx.font = '800 58px sans-serif';
  ctx.letterSpacing = '6px';
  ctx.fillText('MERIDIAN LINE', 240, 118);

  ctx.fillStyle = '#7DD3FC';
  ctx.font = '700 22px monospace';
  ctx.fillText('14,000 TEU · CAI MEP DEEP-WATER', 248, 156);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createOceanRippleTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  ctx.fillStyle = '#0D62A1';
  ctx.fillRect(0, 0, 256, 256);

  // Layered deterministic sunlit harbor wave crests & trough shadows
  for (let i = 0; i < 42; i++) {
    const y = (i * 6.3) % 256;
    const xOff = (i * 37) % 256;
    ctx.strokeStyle =
      i % 3 === 0 ? 'rgba(186, 230, 253, 0.24)' : 'rgba(7, 45, 78, 0.22)';
    ctx.lineWidth = i % 3 === 0 ? 2.2 : 3.2;
    ctx.beginPath();
    ctx.moveTo(xOff - 55, y);
    ctx.quadraticCurveTo(xOff, y + (i % 2 === 0 ? 5 : -5), xOff + 55, y);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(16, 16);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/* ============================================================================
 * 3D SCENE BUILDERS (Sculpted Hull, Articulated STS Gantry Crane, Container)
 * ============================================================================ */

function buildHullPlanShape(halfBeam: number, bowZ: number, sternZ: number): THREE.Shape {
  // Drawn in 2D (x -> ship X, y -> ship -Z so extrude along Y creates hull)
  // Using shape in XZ plane via rotation: shape.x = X, shape.y = Z
  const s = new THREE.Shape();
  const shoulderZ = bowZ + 7.2;
  const transomHalf = halfBeam * 0.86;
  const runZ = sternZ - 3.6;

  s.moveTo(0, bowZ); // Sharp bulbous bow tip at -Z
  s.quadraticCurveTo(halfBeam * 0.72, bowZ + 2.4, halfBeam, shoulderZ);
  s.lineTo(halfBeam, runZ);
  s.quadraticCurveTo(halfBeam, sternZ, transomHalf, sternZ);
  s.lineTo(-transomHalf, sternZ);
  s.quadraticCurveTo(-halfBeam, sternZ, -halfBeam, runZ);
  s.lineTo(-halfBeam, shoulderZ);
  s.quadraticCurveTo(-halfBeam * 0.72, bowZ + 2.4, 0, bowZ);
  return s;
}

function buildExtrudedHullTier(
  halfBeam: number,
  bowZ: number,
  sternZ: number,
  height: number,
  material: THREE.Material,
): THREE.Mesh {
  const shape = buildHullPlanShape(halfBeam, bowZ, sternZ);
  const geom = new THREE.ExtrudeGeometry(shape, {
    depth: height,
    bevelEnabled: false,
    curveSegments: 16,
  });
  // Rotate so shape (x, y) maps to (x, z) and extrude depth maps to +Y
  geom.rotateX(Math.PI / 2);
  // After rotateX(+90deg): old (x, y, z) -> (x, -z, y). Shift Y by +height so base sits at y=0..height
  geom.translate(0, height, 0);
  const mesh = new THREE.Mesh(geom, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

interface BuiltCraneRig {
  root: THREE.Group;
  trolleyGroup: THREE.Group;
  spreaderPivot: THREE.Group;
  spreaderBody: THREE.Group;
  cableMeshes: THREE.Mesh[];
  twistLockLeds: THREE.Mesh[];
  carriedAnchor: THREE.Group;
  carriedMesh: THREE.Mesh | null;
  carriedContainerId: string | null;
  waitingGroup: THREE.Group;
  waitingMesh: THREE.Mesh | null;
  waitingContainerId: string | null;
}

function buildArticulatedStsCrane(
  craneIndex: 0 | 1,
  sharedMaterials: {
    vermilion: THREE.MeshStandardMaterial;
    whitePaint: THREE.MeshStandardMaterial;
    darkSteel: THREE.MeshStandardMaterial;
    spreaderYellow: THREE.MeshStandardMaterial;
    cableMat: THREE.MeshStandardMaterial;
    cabinGlass: THREE.MeshStandardMaterial;
    ledUnlocked: THREE.MeshStandardMaterial;
  },
): BuiltCraneRig {
  const root = new THREE.Group();
  root.name = `STS-CRANE-0${craneIndex + 1}`;

  const landLegX = -14.4;
  const waterLegX = -6.8;
  const legSpreadZ = 2.05;
  const baseY = QUAY_DECK_Y;
  const boomY = CRANE_BOOM_Y;
  const apexY = 22.8;

  // 4 Bogie Wheel Trucks riding on quay rails
  const bogieGeom = new THREE.BoxGeometry(1.15, 0.72, 2.2);
  for (const lx of [landLegX, waterLegX]) {
    for (const lz of [-legSpreadZ, legSpreadZ]) {
      const bogie = new THREE.Mesh(bogieGeom, sharedMaterials.darkSteel);
      bogie.position.set(lx, baseY + 0.36, lz);
      bogie.castShadow = true;
      bogie.receiveShadow = true;
      root.add(bogie);
    }
    // Longitudinal sill beam connecting front & rear bogies
    const sill = new THREE.Mesh(
      new THREE.BoxGeometry(0.95, 0.85, legSpreadZ * 2 + 1.8),
      sharedMaterials.vermilion,
    );
    sill.position.set(lx, baseY + 1.0, 0);
    sill.castShadow = true;
    root.add(sill);
  }

  // Helper to construct angled structural steel strut between two 3D points
  const addStrut = (
    p1: THREE.Vector3,
    p2: THREE.Vector3,
    thickness: number,
    mat: THREE.Material,
  ) => {
    const dir = new THREE.Vector3().subVectors(p2, p1);
    const len = dir.length();
    const geom = new THREE.BoxGeometry(thickness, len, thickness);
    const mesh = new THREE.Mesh(geom, mat);
    mesh.position.copy(p1).add(p2).multiplyScalar(0.5);
    mesh.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      dir.clone().normalize(),
    );
    mesh.castShadow = true;
    root.add(mesh);
  };

  // 4 Towering Vermilion Portal Legs rising to boom level & tapering inward along Z
  for (const lzSign of [-1, 1]) {
    const zBot = lzSign * legSpreadZ;
    const zTop = lzSign * 1.45;
    addStrut(
      new THREE.Vector3(landLegX, baseY + 1.1, zBot),
      new THREE.Vector3(landLegX + 0.55, boomY, zTop),
      0.66,
      sharedMaterials.vermilion,
    );
    addStrut(
      new THREE.Vector3(waterLegX, baseY + 1.1, zBot),
      new THREE.Vector3(waterLegX - 0.35, boomY, zTop),
      0.68,
      sharedMaterials.vermilion,
    );
    // High Portal Cross-Tie Beam (clear above trucks & waiting containers!)
    addStrut(
      new THREE.Vector3(landLegX + 0.25, baseY + 8.6, zBot * 0.85),
      new THREE.Vector3(waterLegX - 0.15, baseY + 8.6, zBot * 0.85),
      0.56,
      sharedMaterials.whitePaint,
    );
    // Diagonal K-Bracing above portal arch
    addStrut(
      new THREE.Vector3(landLegX + 0.35, baseY + 8.6, zBot * 0.85),
      new THREE.Vector3(waterLegX - 0.3, boomY - 0.5, zTop),
      0.34,
      sharedMaterials.vermilion,
    );
    // Apex A-Frame Tower Legs rising from boom to 26.8m apex
    addStrut(
      new THREE.Vector3(landLegX + 0.55, boomY, zTop),
      new THREE.Vector3(-9.8, apexY, zTop * 0.72),
      0.52,
      sharedMaterials.vermilion,
    );
    addStrut(
      new THREE.Vector3(waterLegX - 0.35, boomY, zTop),
      new THREE.Vector3(-9.8, apexY, zTop * 0.72),
      0.56,
      sharedMaterials.vermilion,
    );
    // Tension Forestay & Backstay Steel Boom Tie-Rods
    addStrut(
      new THREE.Vector3(-9.8, apexY - 0.2, zTop * 0.72),
      new THREE.Vector3(9.4, boomY + 0.55, zTop * 0.75),
      0.16,
      sharedMaterials.darkSteel,
    );
    addStrut(
      new THREE.Vector3(-9.8, apexY - 0.2, zTop * 0.72),
      new THREE.Vector3(2.2, boomY + 0.55, zTop * 0.75),
      0.14,
      sharedMaterials.darkSteel,
    );
    addStrut(
      new THREE.Vector3(-9.8, apexY - 0.2, zTop * 0.72),
      new THREE.Vector3(-19.0, boomY + 0.55, zTop * 0.75),
      0.16,
      sharedMaterials.darkSteel,
    );
  }

  // Apex Crown Crossbeam + White Aviation Strobe Top
  const apexBeam = new THREE.Mesh(
    new THREE.BoxGeometry(1.1, 0.75, 2.7),
    sharedMaterials.whitePaint,
  );
  apexBeam.position.set(-9.8, apexY, 0);
  apexBeam.castShadow = true;
  root.add(apexBeam);

  // Twin Horizontal Cantilevered Boom Box-Girders (Backreach -19.5m -> Outreach +10.8m over ship!)
  const boomLength = 30.5;
  const boomCenterX = -4.25;
  const girderGeom = new THREE.BoxGeometry(boomLength, 0.92, 0.58);
  for (const gz of [-1.15, 1.15]) {
    const girder = new THREE.Mesh(girderGeom, sharedMaterials.vermilion);
    girder.position.set(boomCenterX, boomY, gz);
    girder.castShadow = true;
    root.add(girder);
  }
  // White high-contrast safety tip band at outreach end
  const tipBand = new THREE.Mesh(
    new THREE.BoxGeometry(1.2, 1.0, 2.95),
    sharedMaterials.whitePaint,
  );
  tipBand.position.set(10.85, boomY, 0);
  root.add(tipBand);

  // Boom transverse cross ties
  for (let bx = -18; bx <= 9; bx += 4.5) {
    const tie = new THREE.Mesh(
      new THREE.BoxGeometry(0.32, 0.36, 2.5),
      sharedMaterials.whitePaint,
    );
    tie.position.set(bx, boomY + 0.35, 0);
    root.add(tie);
  }

  // Elevated Winch Machinery House atop portal frame
  const machHouse = new THREE.Mesh(
    new THREE.BoxGeometry(5.6, 2.35, 3.3),
    sharedMaterials.whitePaint,
  );
  machHouse.position.set(-10.8, boomY + 1.65, 0);
  machHouse.castShadow = true;
  root.add(machHouse);

  const machStripe = new THREE.Mesh(
    new THREE.BoxGeometry(5.7, 0.48, 3.36),
    sharedMaterials.darkSteel,
  );
  machStripe.position.set(-10.8, boomY + 2.4, 0);
  root.add(machStripe);

  // Articulated Rolling Trolley & Glass Operator Cabin
  const trolleyGroup = new THREE.Group();
  trolleyGroup.position.set(-6.4, boomY - 0.55, 0);
  root.add(trolleyGroup);

  const trolleyFrame = new THREE.Mesh(
    new THREE.BoxGeometry(2.35, 0.46, 2.65),
    sharedMaterials.darkSteel,
  );
  trolleyFrame.castShadow = true;
  trolleyGroup.add(trolleyFrame);

  const cabinBody = new THREE.Mesh(
    new THREE.BoxGeometry(1.85, 1.18, 1.4),
    sharedMaterials.whitePaint,
  );
  cabinBody.position.set(0.35, -0.78, 0.45);
  cabinBody.castShadow = true;
  trolleyGroup.add(cabinBody);

  const cabinGlass = new THREE.Mesh(
    new THREE.BoxGeometry(1.45, 0.72, 1.44),
    sharedMaterials.cabinGlass,
  );
  cabinGlass.position.set(0.58, -0.84, 0.45);
  trolleyGroup.add(cabinGlass);

  // Spreader Pivot attached to Trolley so cable sway swings realistically beneath trolley!
  const spreaderPivot = new THREE.Group();
  spreaderPivot.position.set(0, -0.15, 0);
  trolleyGroup.add(spreaderPivot);

  // 4 Dynamic Steel Hoist Wire Ropes (unit-height cylinders scaled dynamically every frame)
  const cableOffsets: readonly [number, number][] = [
    [-0.78, -1.65],
    [0.78, -1.65],
    [-0.78, 1.65],
    [0.78, 1.65],
  ];
  const cableMeshes: THREE.Mesh[] = [];
  const unitCableGeom = new THREE.CylinderGeometry(0.045, 0.045, 1, 6);
  for (const [cx, cz] of cableOffsets) {
    const cable = new THREE.Mesh(unitCableGeom, sharedMaterials.cableMat);
    cable.position.set(cx, -2, cz);
    spreaderPivot.add(cable);
    cableMeshes.push(cable);
  }

  // Hydraulic Telescopic Spreader Frame (Safety Yellow + 4 Twist-Lock LEDs)
  const spreaderBody = new THREE.Group();
  spreaderBody.position.set(0, -4.0, 0);
  spreaderPivot.add(spreaderBody);

  const spreaderBeamMain = new THREE.Mesh(
    new THREE.BoxGeometry(
      CONTAINER_WIDTH_M + 0.14,
      SPREADER_HEIGHT_M * 0.65,
      CONTAINER_LENGTH_M + 0.14,
    ),
    sharedMaterials.spreaderYellow,
  );
  spreaderBeamMain.castShadow = true;
  spreaderBody.add(spreaderBeamMain);

  const spreaderTopSpine = new THREE.Mesh(
    new THREE.BoxGeometry(1.1, SPREADER_HEIGHT_M * 0.55, CONTAINER_LENGTH_M * 0.85),
    sharedMaterials.darkSteel,
  );
  spreaderTopSpine.position.y = SPREADER_HEIGHT_M * 0.4;
  spreaderBody.add(spreaderTopSpine);

  const twistLockLeds: THREE.Mesh[] = [];
  const ledGeom = new THREE.BoxGeometry(0.28, 0.22, 0.28);
  for (const [lx, lz] of cableOffsets) {
    const led = new THREE.Mesh(ledGeom, sharedMaterials.ledUnlocked);
    led.position.set(lx * 1.12, -0.05, lz * 1.15);
    spreaderBody.add(led);
    twistLockLeds.push(led);
  }

  // Anchor directly underneath spreader for carried container mesh
  const carriedAnchor = new THREE.Group();
  carriedAnchor.position.set(
    0,
    -(SPREADER_HEIGHT_M / 2 + CONTAINER_HEIGHT_M / 2),
    0,
  );
  spreaderBody.add(carriedAnchor);

  // Waiting Container & Flatbed Terminal Chassis on Quay Pickup Lane (moves with gantryZ)
  const waitingGroup = new THREE.Group();
  waitingGroup.position.set(QUAY_PICKUP_X, QUAY_DECK_Y, 0);
  waitingGroup.visible = false;
  root.add(waitingGroup);

  const chassisBed = new THREE.Mesh(
    new THREE.BoxGeometry(2.15, 0.22, CONTAINER_LENGTH_M + 0.6),
    sharedMaterials.darkSteel,
  );
  chassisBed.position.y = 0.22;
  waitingGroup.add(chassisBed);

  return {
    root,
    trolleyGroup,
    spreaderPivot,
    spreaderBody,
    cableMeshes,
    twistLockLeds,
    carriedAnchor,
    carriedMesh: null,
    carriedContainerId: null,
    waitingGroup,
    waitingMesh: null,
    waitingContainerId: null,
  };
}

/* ============================================================================
 * LIVE SVG MARINE INCLINOMETER COMPONENT (Crisp Inline Vector, Zero Emojis)
 * ============================================================================ */

function ShipInclinometerGauge({
  heelAngleDeg,
  verdict,
}: {
  heelAngleDeg: number;
  verdict: VesselStabilityReport['verdict'];
}) {
  const clamped = Math.max(-12, Math.min(12, heelAngleDeg));
  const strokeColor =
    verdict === 'CRITICAL'
      ? '#EF4444'
      : verdict === 'ADVISORY'
        ? '#F59E0B'
        : '#10B981';

  return (
    <svg
      viewBox="0 0 120 68"
      className="h-14 w-24 shrink-0"
      aria-label={`Vessel heel inclinometer ${heelAngleDeg.toFixed(1)} degrees`}
    >
      {/* Horizon sea level line */}
      <line
        x1="8"
        y1="44"
        x2="112"
        y2="44"
        stroke="currentColor"
        strokeOpacity="0.22"
        strokeDasharray="3 2"
        strokeWidth="1"
      />
      {/* Protractor arc */}
      <path
        d="M 16 44 A 44 44 0 0 1 104 44"
        fill="none"
        stroke="currentColor"
        strokeOpacity="0.18"
        strokeWidth="2"
      />
      {/* +/- 4.5 deg SOLAS threshold ticks */}
      <line x1="60" y1="6" x2="60" y2="12" stroke="currentColor" strokeOpacity="0.45" strokeWidth="1.5" />
      <line x1="34" y1="14" x2="38" y2="19" stroke="#EF4444" strokeOpacity="0.65" strokeWidth="1.5" />
      <line x1="86" y1="14" x2="82" y2="19" stroke="#EF4444" strokeOpacity="0.65" strokeWidth="1.5" />

      {/* Rotating vessel cross-section & mast needle */}
      <g transform={`rotate(${clamped * 2.1}, 60, 44)`}>
        {/* Mast indicator needle */}
        <line
          x1="60"
          y1="44"
          x2="60"
          y2="11"
          stroke={strokeColor}
          strokeWidth="2.2"
          strokeLinecap="round"
        />
        <circle cx="60" cy="11" r="2.6" fill={strokeColor} />
        {/* Vessel hull cross-section */}
        <path
          d="M 38 40 L 82 40 L 76 53 L 44 53 Z"
          fill="#0F2942"
          stroke="#FFFFFF"
          strokeWidth="1.2"
        />
        <path d="M 42 48 L 78 48 L 76 53 L 44 53 Z" fill="#B91C1C" />
        {/* Container block silhouette on deck */}
        <rect x="44" y="33" width="10" height="7" fill="#0284C7" rx="0.8" />
        <rect x="55" y="33" width="10" height="7" fill="#F8FAFC" stroke="#94A3B8" strokeWidth="0.6" rx="0.8" />
        <rect x="66" y="33" width="10" height="7" fill="#EA580C" rx="0.8" />
      </g>

      {/* Port / Starboard labels */}
      <text x="10" y="62" fontSize="8" fontFamily="monospace" fontWeight="700" fill="currentColor" opacity="0.6">
        PORT
      </text>
      <text x="86" y="62" fontSize="8" fontFamily="monospace" fontWeight="700" fill="currentColor" opacity="0.6">
        STBD
      </text>
    </svg>
  );
}

/* ============================================================================
 * MAIN 60FPS THREE.JS DEEP-WATER PORT & STS GANTRY CRANE HERO STAGE
 * ============================================================================ */

export function MaritimePort3DStage({ lang, theme }: MaritimePort3DStageProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);

  const [containers, setContainers] = useState<PortContainer[]>(() =>
    createInitialPortContainers(),
  );
  const [selectedKind, setSelectedKind] = useState<PortContainerKind>('dry-40');
  const [seaState, setSeaState] = useState<SeaStateMode>('calm');
  const [cameraPreset, setCameraPreset] =
    useState<CameraPresetId>('quay-overview');
  const [hoveredSlot, setHoveredSlot] = useState<HoveredSlotInfo | null>(null);
  const [webglReady, setWebglReady] = useState(true);
  const [statusToast, setStatusToast] = useState<string | null>(null);
  const [craneHud, setCraneHud] = useState<CraneHudSnapshot>({
    crane0Phase: 'IDLE',
    crane1Phase: 'IDLE',
    activeQueued: 0,
    completedLifts: 0,
  });

  // Live mutable refs for 60fps animation loop without re-mounting WebGL
  const containersRef = useRef<PortContainer[]>(containers);
  const selectedKindRef = useRef<PortContainerKind>(selectedKind);
  const seaStateRef = useRef<SeaStateMode>(seaState);
  const themeRef = useRef<Theme>(theme);
  const seqRef = useRef<number>(120);
  const cranesRef = useRef<[CraneRuntimeState, CraneRuntimeState]>([
    createInitialCraneState(0),
    createInitialCraneState(1),
  ]);
  const stabilityRef = useRef<VesselStabilityReport>(
    computeVesselStability(containers),
  );
  const cameraGoalRef = useRef<{
    sphericalTarget: THREE.Spherical;
    lookTarget: THREE.Vector3;
    transitioning: boolean;
  } | null>(null);

  const stability = useMemo(
    () => computeVesselStability(containers),
    [containers],
  );

  useEffect(() => {
    containersRef.current = containers;
    stabilityRef.current = stability;
  }, [containers, stability]);

  useEffect(() => {
    selectedKindRef.current = selectedKind;
  }, [selectedKind]);

  useEffect(() => {
    seaStateRef.current = seaState;
  }, [seaState]);

  useEffect(() => {
    themeRef.current = theme;
  }, [theme]);

  // Clear transient status toast smoothly
  useEffect(() => {
    if (!statusToast) return;
    const t = window.setTimeout(() => setStatusToast(null), 4200);
    return () => window.clearTimeout(t);
  }, [statusToast]);

  const getAllReservedSlots = useCallback((): {
    bay: number;
    col: number;
    tier: number;
  }[] => {
    const reserved: { bay: number; col: number; tier: number }[] = [];
    for (const c of cranesRef.current) {
      if (c.activeJob) {
        reserved.push({
          bay: c.activeJob.container.bay,
          col: c.activeJob.container.col,
          tier: c.activeJob.container.tier,
        });
      }
      for (const q of c.queue) {
        reserved.push({
          bay: q.container.bay,
          col: q.container.col,
          tier: q.container.tier,
        });
      }
    }
    return reserved;
  }, []);

  const dispatchCraneLift = useCallback(
    (kind: PortContainerKind, preferredBay?: number, preferredCol?: number) => {
      setSelectedKind(kind);
      const reserved = getAllReservedSlots();
      const slot = findNextOpenSlot(
        containersRef.current,
        reserved,
        preferredBay,
        preferredCol,
      );
      if (!slot) {
        setStatusToast(
          lang === 'vi'
            ? 'Cột xếp đã đạt chiều cao tối đa 4 tầng (T88).'
            : 'Selected bay column has reached maximum 4-tier deck clearance (T88).',
        );
        return;
      }

      const nextBox = createPortContainer(
        kind,
        slot.bay,
        slot.col,
        slot.tier,
        seqRef.current++,
      );
      const craneIdx = getCraneIndexForBay(slot.bay);
      cranesRef.current[craneIdx] = enqueueCraneJob(
        cranesRef.current[craneIdx],
        nextBox,
      );
      setCraneHud({
        crane0Phase: cranesRef.current[0].phase,
        crane1Phase: cranesRef.current[1].phase,
        activeQueued:
          cranesRef.current[0].queue.length +
          cranesRef.current[1].queue.length +
          (cranesRef.current[0].activeJob ? 1 : 0) +
          (cranesRef.current[1].activeJob ? 1 : 0),
        completedLifts:
          cranesRef.current[0].completedLifts +
          cranesRef.current[1].completedLifts,
      });

      const spec = PORT_CONTAINER_SPECS[kind];
      setStatusToast(
        lang === 'vi'
          ? `STS-0${craneIdx + 1} đang cẩu ${spec.labelVi} (${spec.weightTonnes}t) vào khoang ${BAY_CODES[slot.bay]}·${COL_CODES[slot.col]}·${TIER_CODES[slot.tier]}`
          : `STS-0${craneIdx + 1} dispatched: hoisting ${spec.labelEn} (${spec.weightTonnes}t) -> ${BAY_CODES[slot.bay]}·${COL_CODES[slot.col]}·${TIER_CODES[slot.tier]}`,
      );
    },
    [getAllReservedSlots, lang],
  );

  const dispatchCraneLiftRef = useRef(dispatchCraneLift);
  useEffect(() => {
    dispatchCraneLiftRef.current = dispatchCraneLift;
  }, [dispatchCraneLift]);

  const handleInjectStarboardImbalance = useCallback(() => {
    // Clear active crane queues so imbalanced state is immediate & crisp
    cranesRef.current = [
      createInitialCraneState(0),
      createInitialCraneState(1),
    ];
    const { containers: nextList, nextSeq } = injectStarboardImbalance(
      containersRef.current,
      seqRef.current,
    );
    seqRef.current = nextSeq;
    setContainers(nextList);
    setCraneHud((prev) => ({
      ...prev,
      crane0Phase: 'IDLE',
      crane1Phase: 'IDLE',
      activeQueued: 0,
    }));
    const rep = computeVesselStability(nextList);
    setStatusToast(
      lang === 'vi'
        ? `CẢNH BÁO SOLAS: Xếp lệch mạn phải khiến tàu nghiêng +${rep.heelAngleDeg.toFixed(1)}° (GM ${rep.gmMeters.toFixed(2)}m)!`
        : `SOLAS CRITICAL INJECTED: Heavy starboard load induced +${rep.heelAngleDeg.toFixed(1)}° list (GM ${rep.gmMeters.toFixed(2)}m)!`,
    );
  }, [lang]);

  const handleAutoTrimBallast = useCallback(() => {
    cranesRef.current = [
      createInitialCraneState(0),
      createInitialCraneState(1),
    ];
    const balanced = computeBalancedStowPlan(containersRef.current);
    setContainers(balanced);
    setCraneHud((prev) => ({
      ...prev,
      crane0Phase: 'IDLE',
      crane1Phase: 'IDLE',
      activeQueued: 0,
    }));
    const rep = computeVesselStability(balanced);
    setStatusToast(
      lang === 'vi'
        ? `ĐÃ CÂN BẰNG TỰ ĐỘNG: Độ nghiêng về ${rep.absHeelAngleDeg.toFixed(1)}° · GM ${rep.gmMeters.toFixed(2)}m (ĐẠT CHUẨN SOLAS)`
        : `AUTO-TRIM COMPLETE: Vessel leveled to ${rep.absHeelAngleDeg.toFixed(1)}° · GM ${rep.gmMeters.toFixed(2)}m (SOLAS NOMINAL)`,
    );
  }, [lang]);

  const handleSelectCameraPreset = useCallback((preset: CameraPresetId) => {
    setCameraPreset(preset);
    const pose = getCameraPresetPose(preset);
    const look = new THREE.Vector3(...pose.target);
    const offset = new THREE.Vector3(...pose.position).sub(look);
    const spherical = new THREE.Spherical().setFromVector3(offset);
    cameraGoalRef.current = {
      sphericalTarget: spherical,
      lookTarget: look,
      transitioning: true,
    };
  }, []);

  /* ============================================================================
   * 60FPS THREE.JS WEBGL ENGINE LIFECYCLE
   * ============================================================================ */
  useEffect(() => {
    const containerEl = mountRef.current;
    if (!containerEl) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance',
      });
    } catch {
      setWebglReady(false);
      return;
    }

    const width = Math.max(320, containerEl.clientWidth);
    const height = Math.max(280, containerEl.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    containerEl.replaceChildren(renderer.domElement);

    const scene = new THREE.Scene();
    const initialBg = themeRef.current === 'dark' ? 0x0b1a2d : 0xdceefb;
    scene.background = new THREE.Color(initialBg);
    scene.fog = new THREE.FogExp2(initialBg, 0.0068);

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.5, 260);
    const initPose = getCameraPresetPose('quay-overview');
    const lookTarget = new THREE.Vector3(...initPose.target);
    const currentSpherical = new THREE.Spherical().setFromVector3(
      new THREE.Vector3(...initPose.position).sub(lookTarget),
    );
    if (width / height < 1.25) {
      currentSpherical.radius *= 1.28;
    }
    camera.position
      .setFromSpherical(currentSpherical)
      .add(lookTarget);
    camera.lookAt(lookTarget);

    // Lighting Rig: Maritime Daylight Crisp Sun + Azure Ocean Bounce + Rim
    const hemiLight = new THREE.HemisphereLight(0xf2f9ff, 0x1e527a, 1.38);
    scene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight(0xfff9ec, 2.25);
    sunLight.position.set(32, 44, -22);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.set(1024, 1024);
    sunLight.shadow.camera.near = 10;
    sunLight.shadow.camera.far = 120;
    sunLight.shadow.camera.left = -32;
    sunLight.shadow.camera.right = 32;
    sunLight.shadow.camera.top = 32;
    sunLight.shadow.camera.bottom = -32;
    sunLight.shadow.bias = -0.0005;
    scene.add(sunLight);

    const rimLight = new THREE.DirectionalLight(0x7dd3fc, 0.72);
    rimLight.position.set(-28, 18, 26);
    scene.add(rimLight);

    // Procedural Texture Cache
    const textureCache = new Map<string, THREE.CanvasTexture>();
    const materialCache = new Map<string, THREE.MeshStandardMaterial>();
    const getContainerMaterial = (
      kind: PortContainerKind,
      colorHex: string,
    ): THREE.MeshStandardMaterial => {
      const key = `${kind}:${colorHex}`;
      const existing = materialCache.get(key);
      if (existing) return existing;
      const tex = createCorrugatedContainerTexture(kind, colorHex);
      textureCache.set(key, tex);
      const mat = new THREE.MeshStandardMaterial({
        map: tex,
        roughness: kind === 'reefer-40' ? 0.34 : 0.48,
        metalness: kind === 'reefer-40' ? 0.14 : 0.24,
      });
      materialCache.set(key, mat);
      return mat;
    };

    const sharedContainerGeom = new THREE.BoxGeometry(
      CONTAINER_WIDTH_M,
      CONTAINER_HEIGHT_M,
      CONTAINER_LENGTH_M,
    );
    const reeferGlowGeom = new THREE.BoxGeometry(0.42, 0.34, 0.12);
    const reeferGlowMat = new THREE.MeshStandardMaterial({
      color: 0x22d3ee,
      emissive: 0x06b6d4,
      emissiveIntensity: 1.85,
      roughness: 0.2,
    });

    const createContainerUnit = (box: PortContainer): THREE.Mesh => {
      const mat = getContainerMaterial(box.kind, box.colorHex);
      const mesh = new THREE.Mesh(sharedContainerGeom, mat);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      if (box.kind === 'reefer-40') {
        const plug = new THREE.Mesh(reeferGlowGeom, reeferGlowMat);
        plug.position.set(0.5, 0.15, -CONTAINER_LENGTH_M / 2 - 0.04);
        mesh.add(plug);
        const plugRear = new THREE.Mesh(reeferGlowGeom, reeferGlowMat);
        plugRear.position.set(0.5, 0.15, CONTAINER_LENGTH_M / 2 + 0.04);
        mesh.add(plugRear);
      }
      return mesh;
    };

    /* ------------------------------------------------------------------------
     * 1. ANIMATED DEEP-BLUE HARBOR WATER
     * ------------------------------------------------------------------------ */
    const waterGeom = new THREE.PlaneGeometry(210, 210, 54, 54);
    waterGeom.rotateX(-Math.PI / 2);
    const waterPosAttr = waterGeom.attributes.position as THREE.BufferAttribute;
    const baseWaterXZ: Array<[number, number]> = [];
    for (let i = 0; i < waterPosAttr.count; i++) {
      baseWaterXZ.push([waterPosAttr.getX(i), waterPosAttr.getZ(i)]);
    }
    const waterRippleTex = createOceanRippleTexture();
    const waterMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: waterRippleTex,
      roughness: 0.22,
      metalness: 0.24,
    });
    const waterMesh = new THREE.Mesh(waterGeom, waterMat);
    waterMesh.position.set(32, 0, 0);
    waterMesh.receiveShadow = true;
    scene.add(waterMesh);

    /* ------------------------------------------------------------------------
     * 2. CONCRETE DEEP-WATER QUAY (CÁI MÉP – THỊ VẢI) & CONTAINER YARD
     * ------------------------------------------------------------------------ */
    const quayTexDay = createQuayConcreteTexture(false);
    const quayTexNight = createQuayConcreteTexture(true);
    const quayMat = new THREE.MeshStandardMaterial({
      map: themeRef.current === 'dark' ? quayTexNight : quayTexDay,
      roughness: 0.86,
      metalness: 0.05,
    });
    const quaySlab = new THREE.Mesh(
      new THREE.BoxGeometry(38, 4.4, 88),
      quayMat,
    );
    quaySlab.position.set(QUAY_EDGE_X - 19, QUAY_DECK_Y - 2.2, 0);
    quaySlab.receiveShadow = true;
    scene.add(quaySlab);

    // Concrete seawall lower skirt
    const seawallMat = new THREE.MeshStandardMaterial({
      color: 0x64748b,
      roughness: 0.92,
    });
    const seawallFace = new THREE.Mesh(
      new THREE.BoxGeometry(0.6, 5.2, 88),
      seawallMat,
    );
    seawallFace.position.set(QUAY_EDGE_X - 0.3, 0.0, 0);
    seawallFace.receiveShadow = true;
    scene.add(seawallFace);

    // Safety Yellow coping hazard edge stripe
    const yellowMat = new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      roughness: 0.45,
      metalness: 0.12,
    });
    const copingStripe = new THREE.Mesh(
      new THREE.BoxGeometry(0.45, 0.12, 84),
      yellowMat,
    );
    copingStripe.position.set(QUAY_EDGE_X - 0.35, QUAY_DECK_Y + 0.06, 0);
    scene.add(copingStripe);

    // Recessed Steel STS Crane Rails
    const railMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.35,
      metalness: 0.85,
    });
    for (const rx of [-6.8, -14.4]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.14, 72), railMat);
      rail.position.set(rx, QUAY_DECK_Y + 0.07, 0);
      scene.add(rail);
    }

    // Yellow truck lane guides at QUAY_PICKUP_X
    for (const lx of [QUAY_PICKUP_X - 1.35, QUAY_PICKUP_X + 1.35]) {
      const lane = new THREE.Mesh(
        new THREE.BoxGeometry(0.14, 0.05, 42),
        yellowMat,
      );
      lane.position.set(lx, QUAY_DECK_Y + 0.03, 0);
      scene.add(lane);
    }

    // Pneumatic Black Yokohama Fenders + Yellow Mooring Bollards
    const fenderMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.78,
      metalness: 0.1,
    });
    const fenderGeom = new THREE.CylinderGeometry(0.46, 0.46, 1.55, 14);
    const bollardGeom = new THREE.CylinderGeometry(0.24, 0.32, 0.65, 10);
    for (const fz of [-13.5, -8.2, -2.8, 2.8, 8.2, 13.5]) {
      const fender = new THREE.Mesh(fenderGeom, fenderMat);
      fender.rotation.x = Math.PI / 2;
      fender.position.set(QUAY_EDGE_X + 0.45, 1.15, fz);
      fender.castShadow = true;
      scene.add(fender);

      const bollard = new THREE.Mesh(bollardGeom, yellowMat);
      bollard.position.set(QUAY_EDGE_X - 0.85, QUAY_DECK_Y + 0.32, fz);
      bollard.castShadow = true;
      scene.add(bollard);
    }

    // Background Container Yard Stacks on concrete terminal apron (x = -19.5 .. -27)
    const yardSpecs: Array<{
      x: number;
      z: number;
      tiers: number;
      kind: PortContainerKind;
      color: string;
    }> = [
      { x: -19.8, z: -12.5, tiers: 3, kind: 'dry-40', color: '#1D4ED8' },
      { x: -19.8, z: -7.6, tiers: 2, kind: 'reefer-40', color: '#F8FAFC' },
      { x: -19.8, z: -2.7, tiers: 3, kind: 'dry-40', color: '#C2410C' },
      { x: -19.8, z: 2.2, tiers: 2, kind: 'dry-40', color: '#0F4C81' },
      { x: -19.8, z: 7.1, tiers: 3, kind: 'hazmat-imo3', color: '#D97706' },
      { x: -19.8, z: 12.0, tiers: 2, kind: 'reefer-40', color: '#F8FAFC' },
      { x: -22.6, z: -12.5, tiers: 2, kind: 'dry-40', color: '#0F4C81' },
      { x: -22.6, z: -7.6, tiers: 3, kind: 'dry-40', color: '#B45309' },
      { x: -22.6, z: -2.7, tiers: 2, kind: 'reefer-40', color: '#F8FAFC' },
      { x: -22.6, z: 2.2, tiers: 3, kind: 'dry-40', color: '#1D4ED8' },
      { x: -22.6, z: 7.1, tiers: 2, kind: 'dry-40', color: '#C2410C' },
      { x: -22.6, z: 12.0, tiers: 3, kind: 'dry-40', color: '#0F4C81' },
    ];
    for (const ys of yardSpecs) {
      const mat = getContainerMaterial(ys.kind, ys.color);
      for (let t = 0; t < ys.tiers; t++) {
        const ym = new THREE.Mesh(sharedContainerGeom, mat);
        ym.position.set(
          ys.x,
          QUAY_DECK_Y + CONTAINER_HEIGHT_M / 2 + t * 1.68,
          ys.z,
        );
        ym.castShadow = true;
        ym.receiveShadow = true;
        scene.add(ym);
      }
    }

    // High-Mast Port Floodlight Towers along back apron
    const mastPoleMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      metalness: 0.65,
      roughness: 0.35,
    });
    const lampMat = new THREE.MeshStandardMaterial({
      color: 0xfffbeb,
      emissive: 0xfef08a,
      emissiveIntensity: 0.9,
    });
    for (const mz of [-18, 0, 18]) {
      const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.18, 0.32, 22, 8),
        mastPoleMat,
      );
      pole.position.set(-26.5, QUAY_DECK_Y + 11, mz);
      scene.add(pole);
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.5, 2.2), lampMat);
      head.position.set(-26.0, QUAY_DECK_Y + 22, mz);
      scene.add(head);
    }

    /* ------------------------------------------------------------------------
     * 3. SCULPTED 14,000-TEU CONTAINER VESSEL (MV MERIDIAN VANGUARD)
     * ------------------------------------------------------------------------ */
    const vesselGroup = new THREE.Group();
    vesselGroup.position.set(SHIP_CENTER_X, 0, 0);
    scene.add(vesselGroup);

    const hullAntifoulingMat = new THREE.MeshStandardMaterial({
      color: 0xb91c1c,
      roughness: 0.52,
      metalness: 0.14,
    });
    const hullWhiteStripeMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.38,
      metalness: 0.08,
    });
    const hullNavyMat = new THREE.MeshStandardMaterial({
      color: 0x14385c,
      roughness: 0.4,
      metalness: 0.22,
    });
    const hullLiveryTex = createHullLiveryTexture();
    const hullLiveryMat = new THREE.MeshStandardMaterial({
      map: hullLiveryTex,
      roughness: 0.42,
      metalness: 0.2,
    });
    const deckHatchMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.65,
      metalness: 0.28,
    });
    const bridgeGlassMat = new THREE.MeshStandardMaterial({
      color: 0x0c4a6e,
      roughness: 0.12,
      metalness: 0.78,
    });
    const vermilionMat = new THREE.MeshStandardMaterial({
      color: 0xea580c,
      roughness: 0.38,
      metalness: 0.24,
    });

    // Lower Red Antifouling Hull (-2.4m .. +0.75m)
    const lowerHull = buildExtrudedHullTier(
      6.15,
      -18.2,
      18.0,
      3.15,
      hullAntifoulingMat,
    );
    lowerHull.position.y = -2.4;
    vesselGroup.add(lowerHull);

    // Prominent Red Bulbous Bow cutting forward into harbor water
    const bulbousBow = new THREE.Mesh(
      new THREE.SphereGeometry(1.45, 18, 14),
      hullAntifoulingMat,
    );
    bulbousBow.scale.set(0.85, 0.82, 1.95);
    bulbousBow.position.set(0, -0.45, -18.2);
    vesselGroup.add(bulbousBow);

    // Crisp White Plimsoll Waterline Boot-Top Stripe (y = 0.75 .. 1.08)
    const waterlineStripe = buildExtrudedHullTier(
      6.22,
      -18.25,
      18.02,
      0.33,
      hullWhiteStripeMat,
    );
    waterlineStripe.position.y = 0.75;
    vesselGroup.add(waterlineStripe);

    // Deep Maritime Navy Freeboard Hull (y = 1.08 .. 3.15)
    const upperHull = buildExtrudedHullTier(
      6.25,
      -18.4,
      18.05,
      2.07,
      hullNavyMat,
    );
    upperHull.position.y = 1.08;
    vesselGroup.add(upperHull);

    // Starboard & Port Side Livery Nameplates ("MERIDIAN LINE · 14,000 TEU")
    const liveryPlateGeom = new THREE.PlaneGeometry(18.5, 1.85);
    const stbdPlate = new THREE.Mesh(liveryPlateGeom, hullLiveryMat);
    stbdPlate.position.set(6.29, 2.15, 0.2);
    stbdPlate.rotation.y = Math.PI / 2;
    vesselGroup.add(stbdPlate);

    const portPlate = new THREE.Mesh(liveryPlateGeom, hullLiveryMat);
    portPlate.position.set(-6.29, 2.15, 0.2);
    portPlate.rotation.y = -Math.PI / 2;
    vesselGroup.add(portPlate);

    // Main Cargo Deck Hatch Covers & Coaming Gunwales
    const cargoDeck = new THREE.Mesh(
      new THREE.BoxGeometry(11.3, 0.22, 20.6),
      deckHatchMat,
    );
    cargoDeck.position.set(0, SHIP_DECK_Y - 0.1, 0);
    cargoDeck.receiveShadow = true;
    vesselGroup.add(cargoDeck);

    // White Side Deck Bulwarks & Steel Lashing Bridges between bays
    const lashingMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.55,
      metalness: 0.35,
    });
    for (const bx of [-5.88, 5.88]) {
      const gunwale = new THREE.Mesh(
        new THREE.BoxGeometry(0.32, 0.65, 22.0),
        hullWhiteStripeMat,
      );
      gunwale.position.set(bx, SHIP_DECK_Y + 0.22, 0.4);
      vesselGroup.add(gunwale);
    }
    for (let b = 0; b < VESSEL_BAY_COUNT - 1; b++) {
      const midZ = (getBayZ(b) + getBayZ(b + 1)) / 2;
      const lashing = new THREE.Mesh(
        new THREE.BoxGeometry(10.9, 1.35, 0.22),
        lashingMat,
      );
      lashing.position.set(0, SHIP_DECK_Y + 0.65, midZ);
      vesselGroup.add(lashing);
    }

    // Forecastle Bow Breakwater & Forward Navigation Mast
    const forecastle = buildExtrudedHullTier(
      5.8,
      -18.3,
      -11.2,
      1.25,
      hullNavyMat,
    );
    forecastle.position.y = SHIP_DECK_Y;
    vesselGroup.add(forecastle);

    const breakwater = new THREE.Mesh(
      new THREE.BoxGeometry(9.6, 1.35, 0.38),
      hullWhiteStripeMat,
    );
    breakwater.position.set(0, SHIP_DECK_Y + 1.8, -11.6);
    breakwater.castShadow = true;
    vesselGroup.add(breakwater);

    const bowMast = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.15, 5.2, 8),
      hullWhiteStripeMat,
    );
    bowMast.position.set(0, SHIP_DECK_Y + 3.8, -15.8);
    vesselGroup.add(bowMast);

    // Multi-Deck White Bridge Superstructure (Stern z = +11.6 .. +15.8)
    const bridgeGroup = new THREE.Group();
    bridgeGroup.position.set(0, SHIP_DECK_Y, 13.6);
    vesselGroup.add(bridgeGroup);

    const tierConfigs = [
      { w: 10.6, h: 2.1, d: 4.4, y: 1.05 },
      { w: 9.8, h: 1.9, d: 3.9, y: 3.05 },
      { w: 9.0, h: 1.85, d: 3.5, y: 4.92 },
      { w: 8.2, h: 1.75, d: 3.1, y: 6.72 },
    ];
    for (const tc of tierConfigs) {
      const block = new THREE.Mesh(
        new THREE.BoxGeometry(tc.w, tc.h, tc.d),
        hullWhiteStripeMat,
      );
      block.position.y = tc.y;
      block.castShadow = true;
      block.receiveShadow = true;
      bridgeGroup.add(block);

      const windowBand = new THREE.Mesh(
        new THREE.BoxGeometry(tc.w + 0.08, 0.42, tc.d + 0.08),
        bridgeGlassMat,
      );
      windowBand.position.y = tc.y + 0.2;
      bridgeGroup.add(windowBand);
    }

    // Cantilevered Panoramic Navigation Bridge Wings spanning vessel beam!
    const bridgeWing = new THREE.Mesh(
      new THREE.BoxGeometry(13.8, 1.35, 2.35),
      hullWhiteStripeMat,
    );
    bridgeWing.position.set(0, 8.25, -0.35);
    bridgeWing.castShadow = true;
    bridgeGroup.add(bridgeWing);

    const bridgePanoramaGlass = new THREE.Mesh(
      new THREE.BoxGeometry(11.6, 0.65, 2.42),
      bridgeGlassMat,
    );
    bridgePanoramaGlass.position.set(0, 8.32, -0.35);
    bridgeGroup.add(bridgePanoramaGlass);

    // Port (Red) & Starboard (Green) Navigation Beacons on Bridge Wingtips
    const portLightMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.2, 8, 8),
      new THREE.MeshStandardMaterial({
        color: 0xef4444,
        emissive: 0xef4444,
        emissiveIntensity: 1.6,
      }),
    );
    portLightMesh.position.set(-6.9, 8.55, -0.8);
    bridgeGroup.add(portLightMesh);

    const stbdLightMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.2, 8, 8),
      new THREE.MeshStandardMaterial({
        color: 0x10b981,
        emissive: 0x10b981,
        emissiveIntensity: 1.6,
      }),
    );
    stbdLightMesh.position.set(6.9, 8.55, -0.8);
    bridgeGroup.add(stbdLightMesh);

    // Radar Mast + Live Rotating X-Band Radar Scanner
    const radarMast = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.24, 3.6, 8),
      hullWhiteStripeMat,
    );
    radarMast.position.set(0, 10.6, -0.35);
    bridgeGroup.add(radarMast);

    const radarScanner = new THREE.Mesh(
      new THREE.BoxGeometry(2.4, 0.16, 0.24),
      vermilionMat,
    );
    radarScanner.position.set(0, 12.2, -0.35);
    bridgeGroup.add(radarScanner);

    // Signature Navy & Safety Orange Funnel Aft of Bridge
    const funnelBody = new THREE.Mesh(
      new THREE.BoxGeometry(2.4, 3.8, 2.2),
      hullNavyMat,
    );
    funnelBody.position.set(0, 9.1, 2.2);
    funnelBody.castShadow = true;
    bridgeGroup.add(funnelBody);

    const funnelStripe = new THREE.Mesh(
      new THREE.BoxGeometry(2.48, 0.85, 2.28),
      vermilionMat,
    );
    funnelStripe.position.set(0, 10.05, 2.2);
    bridgeGroup.add(funnelStripe);

    const funnelTop = new THREE.Mesh(
      new THREE.BoxGeometry(2.3, 0.55, 2.1),
      fenderMat,
    );
    funnelTop.position.set(0, 11.2, 2.2);
    bridgeGroup.add(funnelTop);

    // Translucent Waterline Wake Collar hugging the hull
    const wakeMat = new THREE.MeshBasicMaterial({
      color: 0xe0f2fe,
      transparent: true,
      opacity: 0.34,
    });
    const wakeCollar = buildExtrudedHullTier(6.7, -18.8, 18.4, 0.08, wakeMat);
    wakeCollar.position.y = 0.04;
    wakeCollar.castShadow = false;
    vesselGroup.add(wakeCollar);

    /* ------------------------------------------------------------------------
     * 4. ONBOARD CONTAINER STACKS + 3D RAYCAST INTERACTION GUIDES
     * ------------------------------------------------------------------------ */
    const onboardContainerGroup = new THREE.Group();
    vesselGroup.add(onboardContainerGroup);
    const onboardMeshMap = new Map<
      string,
      { mesh: THREE.Mesh; targetLocal: THREE.Vector3 }
    >();

    // 20 Invisible Column Hitboxes for 3D Raycast click-to-dispatch
    const columnHitboxes: THREE.Mesh[] = [];
    const hitboxMat = new THREE.MeshBasicMaterial({ visible: false });
    const hitboxGeom = new THREE.BoxGeometry(
      COL_SPACING_M - 0.08,
      VESSEL_TIER_COUNT * 1.72 + 0.6,
      BAY_SPACING_M - 0.12,
    );
    for (let bay = 0; bay < VESSEL_BAY_COUNT; bay++) {
      for (let col = 0; col < VESSEL_COL_COUNT; col++) {
        const hit = new THREE.Mesh(hitboxGeom, hitboxMat);
        hit.position.set(
          getColLocalX(col),
          SHIP_DECK_Y + (VESSEL_TIER_COUNT * 1.72) / 2,
          getBayZ(bay),
        );
        hit.userData = { bay, col };
        vesselGroup.add(hit);
        columnHitboxes.push(hit);
      }
    }

    // Glowing Holographic Ghost Container Target on hover
    const ghostGroup = new THREE.Group();
    ghostGroup.visible = false;
    const ghostFill = new THREE.Mesh(
      sharedContainerGeom,
      new THREE.MeshBasicMaterial({
        color: 0x0ea5e9,
        transparent: true,
        opacity: 0.24,
        depthWrite: false,
      }),
    );
    const ghostEdges = new THREE.LineSegments(
      new THREE.EdgesGeometry(sharedContainerGeom),
      new THREE.LineBasicMaterial({ color: 0x38bdf8 }),
    );
    ghostGroup.add(ghostFill);
    ghostGroup.add(ghostEdges);
    vesselGroup.add(ghostGroup);

    const syncOnboardMeshes = () => {
      const current = containersRef.current;
      const aliveIds = new Set<string>();
      for (const box of current) {
        aliveIds.add(box.id);
        const slotPos = getSlotLocalPosition(box.bay, box.col, box.tier);
        const existing = onboardMeshMap.get(box.id);
        if (existing) {
          existing.targetLocal.set(slotPos.x, slotPos.y, slotPos.z);
        } else {
          const mesh = createContainerUnit(box);
          mesh.position.set(slotPos.x, slotPos.y, slotPos.z);
          onboardContainerGroup.add(mesh);
          onboardMeshMap.set(box.id, {
            mesh,
            targetLocal: new THREE.Vector3(slotPos.x, slotPos.y, slotPos.z),
          });
        }
      }
      for (const [id, entry] of onboardMeshMap.entries()) {
        if (!aliveIds.has(id)) {
          onboardContainerGroup.remove(entry.mesh);
          onboardMeshMap.delete(id);
        }
      }
    };
    syncOnboardMeshes();

    /* ------------------------------------------------------------------------
     * 5. 2 ARTICULATED VERMILION/ORANGE STS GANTRY CRANES
     * ------------------------------------------------------------------------ */
    const ledUnlockedMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0xd97706,
      emissiveIntensity: 1.2,
    });
    const ledLockedMat = new THREE.MeshStandardMaterial({
      color: 0x10b981,
      emissive: 0x059669,
      emissiveIntensity: 1.8,
    });
    const craneSharedMats = {
      vermilion: vermilionMat,
      whitePaint: hullWhiteStripeMat,
      darkSteel: fenderMat,
      spreaderYellow: yellowMat,
      cableMat: new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        metalness: 0.75,
        roughness: 0.35,
      }),
      cabinGlass: bridgeGlassMat,
      ledUnlocked: ledUnlockedMat,
    };

    const craneRigs: [BuiltCraneRig, BuiltCraneRig] = [
      buildArticulatedStsCrane(0, craneSharedMats),
      buildArticulatedStsCrane(1, craneSharedMats),
    ];
    craneRigs[0].root.position.z = cranesRef.current[0].gantryZ;
    craneRigs[1].root.position.z = cranesRef.current[1].gantryZ;
    scene.add(craneRigs[0].root);
    scene.add(craneRigs[1].root);

    /* ------------------------------------------------------------------------
     * 6. DIRECT POINTER INTERACTION: ORBIT, ZOOM & 3D RAYCAST DISPATCH
     * ------------------------------------------------------------------------ */
    const raycaster = new THREE.Raycaster();
    const pointerNdc = new THREE.Vector2();
    let isDragging = false;
    let dragDistancePx = 0;
    let prevPointerX = 0;
    let prevPointerY = 0;
    let hoveredSlotLocal: HoveredSlotInfo | null = null;

    const updateRaycastHover = (clientX: number, clientY: number) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointerNdc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      pointerNdc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointerNdc, camera);
      const hits = raycaster.intersectObjects(columnHitboxes, false);
      if (hits.length > 0) {
        const { bay, col } = hits[0].object.userData as {
          bay: number;
          col: number;
        };
        const slot = findNextOpenSlot(
          containersRef.current,
          getAllReservedSlots(),
          bay,
          col,
        );
        if (slot) {
          const pos = getSlotLocalPosition(slot.bay, slot.col, slot.tier);
          ghostGroup.position.set(pos.x, pos.y, pos.z);
          ghostGroup.visible = true;
          if (
            !hoveredSlotLocal ||
            hoveredSlotLocal.bay !== slot.bay ||
            hoveredSlotLocal.col !== slot.col ||
            hoveredSlotLocal.tier !== slot.tier
          ) {
            hoveredSlotLocal = slot;
            setHoveredSlot(slot);
          }
          renderer.domElement.style.cursor = 'pointer';
          return;
        }
      }
      ghostGroup.visible = false;
      if (hoveredSlotLocal !== null) {
        hoveredSlotLocal = null;
        setHoveredSlot(null);
      }
      renderer.domElement.style.cursor = isDragging ? 'grabbing' : 'grab';
    };

    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      isDragging = true;
      dragDistancePx = 0;
      prevPointerX = e.clientX;
      prevPointerY = e.clientY;
      cameraGoalRef.current = null; // User manual orbit cancels preset tween
      renderer.domElement.setPointerCapture(e.pointerId);
      renderer.domElement.style.cursor = 'grabbing';
    };

    const onPointerMove = (e: PointerEvent) => {
      if (isDragging) {
        const dx = e.clientX - prevPointerX;
        const dy = e.clientY - prevPointerY;
        dragDistancePx += Math.hypot(dx, dy);
        prevPointerX = e.clientX;
        prevPointerY = e.clientY;

        currentSpherical.theta -= dx * 0.0068;
        currentSpherical.phi = Math.max(
          0.32,
          Math.min(1.42, currentSpherical.phi - dy * 0.0055),
        );
      } else {
        updateRaycastHover(e.clientX, e.clientY);
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      if (!isDragging) return;
      isDragging = false;
      try {
        renderer.domElement.releasePointerCapture(e.pointerId);
      } catch {
        // Ignore if capture already released
      }

      // Crisp click (not orbit drag) -> Raycast directly onto ship bay column!
      if (dragDistancePx < 6) {
        updateRaycastHover(e.clientX, e.clientY);
        if (hoveredSlotLocal) {
          dispatchCraneLiftRef.current(
            selectedKindRef.current,
            hoveredSlotLocal.bay,
            hoveredSlotLocal.col,
          );
        }
      }
      renderer.domElement.style.cursor = hoveredSlotLocal ? 'pointer' : 'grab';
    };

    const onPointerLeave = () => {
      ghostGroup.visible = false;
      if (hoveredSlotLocal !== null) {
        hoveredSlotLocal = null;
        setHoveredSlot(null);
      }
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      cameraGoalRef.current = null;
      currentSpherical.radius = Math.max(
        18,
        Math.min(62, currentSpherical.radius + e.deltaY * 0.022),
      );
    };

    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointermove', onPointerMove);
    renderer.domElement.addEventListener('pointerup', onPointerUp);
    renderer.domElement.addEventListener('pointerleave', onPointerLeave);
    renderer.domElement.addEventListener('wheel', onWheel, { passive: false });

    // ResizeObserver keeps aspect ratio razor-sharp across desktop & mobile
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = Math.max(280, Math.floor(entry.contentRect.width));
        const h = Math.max(240, Math.floor(entry.contentRect.height));
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      }
    });
    resizeObserver.observe(containerEl);

    /* ------------------------------------------------------------------------
     * 7. 60FPS ANIMATION & PHYSICS LOOP
     * ------------------------------------------------------------------------ */
    let rafId = 0;
    let lastTimeMs = performance.now();
    let elapsedSec = 0;
    let frameCounter = 0;
    let currentHeelRad = 0;
    let currentTrimRad = 0;
    let currentDraftOffset = 0;

    const skyColorTarget = new THREE.Color();
    const waterColorTarget = new THREE.Color();

    const animate = (nowMs: number) => {
      rafId = window.requestAnimationFrame(animate);
      const dt = Math.min(0.05, Math.max(0.001, (nowMs - lastTimeMs) / 1000));
      lastTimeMs = nowMs;
      elapsedSec += dt;
      frameCounter += 1;

      const isStorm = seaStateRef.current === 'storm';
      const isDark = themeRef.current === 'dark';

      // Smoothly transition sky, fog, sun & water palette for Daylight / Night-Watch / Storm
      if (isDark) {
        skyColorTarget.setHex(isStorm ? 0x06101c : 0x0b1a2d);
        waterColorTarget.setHex(isStorm ? 0x3b5870 : 0x4b7496);
        sunLight.intensity = isStorm ? 0.95 : 1.25;
        hemiLight.intensity = isStorm ? 0.65 : 0.85;
        quayMat.map = quayTexNight;
      } else {
        skyColorTarget.setHex(isStorm ? 0x9ab0c4 : 0xdceefb);
        waterColorTarget.setHex(isStorm ? 0x7c9cb3 : 0xffffff);
        sunLight.intensity = isStorm ? 1.45 : 2.25;
        hemiLight.intensity = isStorm ? 1.05 : 1.38;
        quayMat.map = quayTexDay;
      }
      (scene.background as THREE.Color).lerp(skyColorTarget, 0.05);
      (scene.fog as THREE.FogExp2).color.copy(scene.background as THREE.Color);
      waterMat.color.lerp(waterColorTarget, 0.05);
      waterRippleTex.offset.x += dt * (isStorm ? 0.08 : 0.025);
      waterRippleTex.offset.y += dt * (isStorm ? 0.055 : 0.016);

      // Smooth damped camera preset tweening
      if (cameraGoalRef.current && cameraGoalRef.current.transitioning) {
        const goal = cameraGoalRef.current;
        const lerpK = 1 - Math.exp(-5.2 * dt);
        currentSpherical.radius +=
          (goal.sphericalTarget.radius - currentSpherical.radius) * lerpK;
        currentSpherical.phi +=
          (goal.sphericalTarget.phi - currentSpherical.phi) * lerpK;
        let dTheta = goal.sphericalTarget.theta - currentSpherical.theta;
        while (dTheta > Math.PI) dTheta -= Math.PI * 2;
        while (dTheta < -Math.PI) dTheta += Math.PI * 2;
        currentSpherical.theta += dTheta * lerpK;
        lookTarget.lerp(goal.lookTarget, lerpK);

        if (
          Math.abs(goal.sphericalTarget.radius - currentSpherical.radius) <
            0.05 &&
          Math.abs(dTheta) < 0.005 &&
          lookTarget.distanceTo(goal.lookTarget) < 0.05
        ) {
          goal.transitioning = false;
        }
      }
      camera.position.setFromSpherical(currentSpherical).add(lookTarget);
      camera.lookAt(lookTarget);

      // Animate harbor water vertices with live swell harmonics
      const waveAmp = isStorm ? 0.54 : 0.11;
      const waveSpeed = isStorm ? 2.15 : 0.95;
      for (let i = 0; i < waterPosAttr.count; i++) {
        const [wx, wz] = baseWaterXZ[i];
        const y =
          Math.sin(wx * 0.14 + elapsedSec * waveSpeed * 1.15) * waveAmp * 0.62 +
          Math.cos(wz * 0.12 - elapsedSec * waveSpeed * 0.92) * waveAmp * 0.48 +
          Math.sin((wx + wz) * 0.22 + elapsedSec * waveSpeed * 1.55) *
            waveAmp *
            0.26;
        waterPosAttr.setY(i, y);
      }
      waterPosAttr.needsUpdate = true;
      if (frameCounter % 3 === 0) {
        waterGeom.computeVertexNormals();
      }

      // Hydrostatic vessel heel, trim, draft & ocean wave dynamics
      const stab = stabilityRef.current;
      const ocean = sampleOceanWaveMotion(elapsedSec, seaStateRef.current);
      const targetHeelRad = (stab.heelAngleDeg * Math.PI) / 180;
      const targetTrimRad = (stab.trimPitchDeg * Math.PI) / 180;
      const targetDraftOffset = Math.max(0, (stab.draftMeters - 10.4) * 0.22);

      const hydroLerp = 1 - Math.exp(-3.6 * dt);
      currentHeelRad += (targetHeelRad - currentHeelRad) * hydroLerp;
      currentTrimRad += (targetTrimRad - currentTrimRad) * hydroLerp;
      currentDraftOffset += (targetDraftOffset - currentDraftOffset) * hydroLerp;

      // Right-handed rotation: negative Z rotation dips +X Starboard down into water!
      vesselGroup.rotation.z = -(currentHeelRad + ocean.waveRollRad);
      vesselGroup.rotation.x = currentTrimRad + ocean.wavePitchRad;
      vesselGroup.position.y = ocean.heaveY - currentDraftOffset;

      // Rotating marine X-band radar scanner on bridge roof
      radarScanner.rotation.y += dt * 2.5;

      // Sync & smoothly animate onboard container positions (including Auto-Trim gliding!)
      syncOnboardMeshes();
      const boxLerp = 1 - Math.exp(-8.5 * dt);
      for (const entry of onboardMeshMap.values()) {
        entry.mesh.position.lerp(entry.targetLocal, boxLerp);
      }

      // Step both articulated STS Gantry Cranes
      let hudDirty = false;
      const newlyPlaced: PortContainer[] = [];

      for (let idx = 0; idx < 2; idx++) {
        const prevState = cranesRef.current[idx];
        const { nextState, placedContainer } = stepCraneState(prevState, dt);
        cranesRef.current[idx] = nextState;

        if (
          prevState.phase !== nextState.phase ||
          prevState.completedLifts !== nextState.completedLifts ||
          prevState.queue.length !== nextState.queue.length
        ) {
          hudDirty = true;
        }
        if (placedContainer) {
          newlyPlaced.push(placedContainer);
        }

        // Apply exact kinematics to Three.js STS crane rig
        const rig = craneRigs[idx];
        rig.root.position.z = nextState.gantryZ;
        rig.trolleyGroup.position.x = nextState.trolleyX;
        rig.spreaderPivot.rotation.z = nextState.swayRad;

        const trolleyPivotY = CRANE_BOOM_Y - 0.7;
        const dropDist = Math.max(1.0, trolleyPivotY - nextState.spreaderY);
        rig.spreaderBody.position.y = -dropDist;

        for (const cable of rig.cableMeshes) {
          cable.scale.y = dropDist;
          cable.position.y = -dropDist / 2;
        }

        const ledMat = nextState.twistLockEngaged
          ? ledLockedMat
          : ledUnlockedMat;
        for (const led of rig.twistLockLeds) {
          led.material = ledMat;
        }

        // Update physical carried container hanging beneath spreader
        const carried = nextState.carryingContainer;
        if (carried) {
          if (rig.carriedContainerId !== carried.id) {
            if (rig.carriedMesh) rig.carriedAnchor.remove(rig.carriedMesh);
            rig.carriedMesh = createContainerUnit(carried);
            rig.carriedAnchor.add(rig.carriedMesh);
            rig.carriedContainerId = carried.id;
          }
        } else if (rig.carriedMesh) {
          rig.carriedAnchor.remove(rig.carriedMesh);
          rig.carriedMesh = null;
          rig.carriedContainerId = null;
        }

        // Update waiting container on terminal chassis at quay pickup lane
        const waitingJob = nextState.activeJob;
        const showWaiting =
          waitingJob !== null &&
          (nextState.phase === 'SLEW_TO_QUAY' ||
            nextState.phase === 'LOWER_SPREADER' ||
            (nextState.phase === 'LATCH' && !carried));
        rig.waitingGroup.visible = showWaiting;
        if (showWaiting && waitingJob) {
          if (rig.waitingContainerId !== waitingJob.container.id) {
            if (rig.waitingMesh) rig.waitingGroup.remove(rig.waitingMesh);
            rig.waitingMesh = createContainerUnit(waitingJob.container);
            rig.waitingMesh.position.y = 0.32 + CONTAINER_HEIGHT_M / 2;
            rig.waitingGroup.add(rig.waitingMesh);
            rig.waitingContainerId = waitingJob.container.id;
          }
        } else if (rig.waitingMesh) {
          rig.waitingGroup.remove(rig.waitingMesh);
          rig.waitingMesh = null;
          rig.waitingContainerId = null;
        }
      }

      if (newlyPlaced.length > 0) {
        setContainers((prev) => {
          const existingIds = new Set(prev.map((c) => c.id));
          const toAppend = newlyPlaced.filter((c) => !existingIds.has(c.id));
          if (toAppend.length === 0) return prev;
          return [...prev, ...toAppend];
        });
      }

      if (hudDirty) {
        setCraneHud({
          crane0Phase: cranesRef.current[0].phase,
          crane1Phase: cranesRef.current[1].phase,
          activeQueued:
            cranesRef.current[0].queue.length +
            cranesRef.current[1].queue.length +
            (cranesRef.current[0].activeJob ? 1 : 0) +
            (cranesRef.current[1].activeJob ? 1 : 0),
          completedLifts:
            cranesRef.current[0].completedLifts +
            cranesRef.current[1].completedLifts,
        });
      }

      renderer.render(scene, camera);
    };

    rafId = window.requestAnimationFrame(animate);

    return () => {
      window.cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      renderer.domElement.removeEventListener('pointerleave', onPointerLeave);
      renderer.domElement.removeEventListener('wheel', onWheel);

      for (const tex of textureCache.values()) tex.dispose();
      for (const mat of materialCache.values()) mat.dispose();
      quayTexDay.dispose();
      quayTexNight.dispose();
      hullLiveryTex.dispose();
      sharedContainerGeom.dispose();
      reeferGlowGeom.dispose();
      reeferGlowMat.dispose();
      waterGeom.dispose();
      waterRippleTex.dispose();
      waterMat.dispose();
      renderer.dispose();
    };
  }, [getAllReservedSlots]);

  const verdictBadgeClass =
    stability.verdict === 'CRITICAL'
      ? 'border-red-500 bg-red-600 text-white animate-pulse'
      : stability.verdict === 'ADVISORY'
        ? 'border-amber-500 bg-amber-500/15 text-amber-700 dark:text-amber-300'
        : 'border-emerald-500/50 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300';

  const heelDirectionLabel =
    stability.heelAngleDeg > 0.15
      ? 'STBD'
      : stability.heelAngleDeg < -0.15
        ? 'PORT'
        : 'EVEN';

  const activeCraneLabel =
    craneHud.crane0Phase !== 'IDLE'
      ? `STS-01 · ${craneHud.crane0Phase}`
      : craneHud.crane1Phase !== 'IDLE'
        ? `STS-02 · ${craneHud.crane1Phase}`
        : 'STS-01/02 · STANDBY';

  return (
    <div
      data-testid="maritime-port-3d-stage"
      className="panel-card mb-5 overflow-hidden rounded-xl"
    >
      {/* Top Stage Header Strip */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border)] bg-[var(--bg-elevated)] px-3.5 py-2">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="font-mono-tech inline-flex items-center gap-1.5 rounded bg-[var(--bg-navy)] px-2 py-0.5 text-[10px] font-bold tracking-wider text-white">
            <AnchorIcon className="h-3 w-3 text-[#38BDF8]" />
            <span>3D PORT TWIN · v5.0</span>
          </span>
          <span className="truncate text-xs font-extrabold tracking-tight text-[var(--text)] sm:text-[13px]">
            {lang === 'vi'
              ? 'Cảng Nước Sâu Cái Mép – Thị Vải · Cầu CM-04 · Tàu MV MERIDIAN VANGUARD (14,000 TEU)'
              : 'Cái Mép – Thị Vải Deep-Water Quay · Berth CM-04 · MV MERIDIAN VANGUARD (14,000 TEU)'}
          </span>
        </div>

        {/* Camera Presets + Sea State Toggle */}
        <div className="flex flex-wrap items-center gap-1.5">
          {(
            [
              {
                id: 'quay-overview',
                en: 'QUAY OVERVIEW',
                vi: 'TOÀN CẢNH CẦU BẾN',
              },
              {
                id: 'crane-cabin',
                en: 'CRANE CABIN POV',
                vi: 'BUỒNG LÁI CẨU STS',
              },
              { id: 'vessel-bow', en: 'VESSEL BOW', vi: 'MŨI TÀU 14K TEU' },
            ] as const
          ).map((cam) => (
            <button
              key={cam.id}
              type="button"
              onClick={() => handleSelectCameraPreset(cam.id)}
              data-testid={`cam-preset-${cam.id}`}
              className={`font-mono-tech cursor-pointer rounded-md px-2 py-1 text-[10px] font-bold transition-colors ${
                cameraPreset === cam.id
                  ? 'bg-[var(--bg-navy)] text-white'
                  : 'border border-[var(--border)] bg-[var(--bg)] text-[var(--text-muted)] hover:border-[var(--border-strong)] hover:text-[var(--text)]'
              }`}
            >
              {lang === 'vi' ? cam.vi : cam.en}
            </button>
          ))}

          <button
            type="button"
            onClick={() =>
              setSeaState((prev) => (prev === 'calm' ? 'storm' : 'calm'))
            }
            aria-pressed={seaState === 'storm'}
            data-testid="toggle-suez-storm"
            className={`font-mono-tech inline-flex cursor-pointer items-center gap-1 rounded-md border px-2.5 py-1 text-[10px] font-bold transition-all ${
              seaState === 'storm'
                ? 'border-[#0284C7] bg-[#0284C7] text-white shadow-xs'
                : 'border-[var(--border)] bg-[var(--bg)] text-[var(--text-muted)] hover:border-[#0284C7] hover:text-[var(--text)]'
            }`}
          >
            <BoltIcon className="h-3 w-3" />
            <span>
              {lang === 'vi' ? 'BIỂN BÃO SUEZ (3.8M)' : 'SUEZ STORM SEA'}
            </span>
          </button>
        </div>
      </div>

      {/* Main 60fps Three.js PBR Stage Viewport */}
      <div className="relative h-[350px] w-full overflow-hidden bg-[#DCEEFB] sm:h-[460px] lg:h-[520px]">
        <div
          ref={mountRef}
          data-testid="port-3d-canvas-host"
          className="h-full w-full"
        />

        {!webglReady && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[var(--bg-subtle)] p-6 text-center">
            <ContainerIcon className="mb-2 h-8 w-8 text-[var(--accent-cyan)]" />
            <div className="text-sm font-bold text-[var(--text)]">
              WebGL 3D Renderer Unavailable
            </div>
            <p className="mt-1 max-w-md text-xs text-[var(--text-muted)]">
              Enable hardware or software WebGL in your browser to interact with
              the live 60fps 3D Deep-Water Port &amp; STS Gantry Crane twin.
            </p>
          </div>
        )}

        {/* Top-Left Floating Terminal & Live STS Crane Kinematics Pill */}
        <div className="pointer-events-none absolute top-3 left-3 z-10 flex max-w-[calc(100%-24px)] flex-col gap-1.5 sm:max-w-[340px]">
          <div className="inline-flex w-fit items-center gap-2 rounded-lg border border-[var(--border-strong)] bg-[var(--bg-elevated)]/92 px-2.5 py-1.5 shadow-sm backdrop-blur-md">
            <span
              className={`h-2 w-2 shrink-0 rounded-full ${
                craneHud.crane0Phase !== 'IDLE' ||
                craneHud.crane1Phase !== 'IDLE'
                  ? 'animate-pulse bg-[#EA580C]'
                  : 'bg-[var(--accent-emerald)]'
              }`}
            />
            <span
              data-testid="crane-live-phase"
              className="font-mono-tech text-[10px] font-extrabold tracking-wide text-[var(--text)] sm:text-[11px]"
            >
              {activeCraneLabel}
            </span>
            <span className="font-mono-tech rounded bg-[var(--bg-subtle)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--text-muted)]">
              {stability.containerCount}/{stability.maxSlots} FEU
            </span>
          </div>

          {/* Raycast Hover Cell Target Pill */}
          {hoveredSlot && (
            <div
              data-testid="raycast-hover-badge"
              className="font-mono-tech inline-flex w-fit items-center gap-1.5 rounded-md border border-[#0284C7]/50 bg-[#0F2942]/92 px-2.5 py-1 text-[10px] font-bold text-white shadow-sm backdrop-blur-md"
            >
              <CompassIcon className="h-3 w-3 text-[#38BDF8]" />
              <span>
                {lang === 'vi' ? 'BẤM XẾP VÀO ' : 'CLICK TO SLOT '}
                {BAY_CODES[hoveredSlot.bay]} · {COL_CODES[hoveredSlot.col]} ·{' '}
                {TIER_CODES[hoveredSlot.tier]}
              </span>
            </div>
          )}

          {/* Live Action Toast */}
          {statusToast && (
            <div
              data-testid="port-3d-toast"
              className={`rounded-md border px-2.5 py-1.5 text-[11px] font-semibold shadow-sm backdrop-blur-md ${
                stability.verdict === 'CRITICAL'
                  ? 'border-red-500/60 bg-red-950/90 text-red-100'
                  : 'border-[var(--border-strong)] bg-[var(--bg-elevated)]/94 text-[var(--text)]'
              }`}
            >
              {statusToast}
            </div>
          )}
        </div>

        {/* Top-Right Desktop Floating Hydrostatic SOLAS VGM & Inclinometer HUD (hidden on mobile <640px to prevent any canvas clutter!) */}
        <div
          data-testid="solas-hud-desktop"
          className={`pointer-events-none absolute top-3 right-3 z-10 hidden w-[306px] rounded-xl border p-3 shadow-md backdrop-blur-md sm:block ${
            stability.verdict === 'CRITICAL'
              ? 'border-red-500 bg-[var(--bg-elevated)]/96 ring-2 ring-red-500/35'
              : 'border-[var(--border-strong)] bg-[var(--bg-elevated)]/92'
          }`}
        >
          <div className="flex items-center justify-between gap-2 border-b border-[var(--border)] pb-2">
            <div className="flex items-center gap-1.5">
              {stability.verdict === 'CRITICAL' ? (
                <AlertTriangleIcon className="h-3.5 w-3.5 text-red-600" />
              ) : (
                <ShieldCheckIcon className="h-3.5 w-3.5 text-[var(--accent-emerald)]" />
              )}
              <span className="font-mono-tech text-[10px] font-extrabold uppercase tracking-wider text-[var(--text)]">
                SOLAS VGM HYDROSTATICS
              </span>
            </div>
            <span
              data-testid="solas-verdict-badge"
              className={`font-mono-tech rounded border px-1.5 py-0.5 text-[10px] font-extrabold tracking-wide ${verdictBadgeClass}`}
            >
              SOLAS {stability.verdict}
            </span>
          </div>

          {/* Live Inclinometer + Heel & GM Big Figures */}
          <div className="mt-2 flex items-center justify-between gap-2">
            <ShipInclinometerGauge
              heelAngleDeg={stability.heelAngleDeg}
              verdict={stability.verdict}
            />
            <div className="grid flex-1 grid-cols-2 gap-1.5">
              <div className="rounded-lg border border-[var(--border)] bg-[var(--bg)]/85 px-2 py-1.5">
                <div className="font-mono-tech text-[9px] font-bold uppercase text-[var(--text-dim)]">
                  HEEL / ROLL
                </div>
                <div
                  data-testid="hud-heel-angle"
                  className={`font-mono-tech text-base font-extrabold leading-tight ${
                    stability.verdict === 'CRITICAL'
                      ? 'text-red-600 dark:text-red-400'
                      : stability.verdict === 'ADVISORY'
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-[var(--accent-emerald)]'
                  }`}
                >
                  {stability.heelAngleDeg > 0 ? '+' : ''}
                  {stability.heelAngleDeg.toFixed(1)}°
                </div>
                <div className="font-mono-tech text-[9px] font-semibold text-[var(--text-muted)]">
                  {heelDirectionLabel}
                </div>
              </div>

              <div className="rounded-lg border border-[var(--border)] bg-[var(--bg)]/85 px-2 py-1.5">
                <div className="font-mono-tech text-[9px] font-bold uppercase text-[var(--text-dim)]">
                  METACENTRIC GM
                </div>
                <div
                  data-testid="hud-gm-meters"
                  className="font-mono-tech text-base font-extrabold leading-tight text-[var(--text)]"
                >
                  {stability.gmMeters.toFixed(2)}m
                </div>
                <div className="font-mono-tech text-[9px] font-semibold text-[var(--text-muted)]">
                  DRAFT {stability.draftMeters.toFixed(1)}m
                </div>
              </div>
            </div>
          </div>

          {/* VGM, 3D CG (X/Y/Z), Trim & Port/Starboard Load Split */}
          <div className="mt-2 grid grid-cols-3 gap-1.5 border-t border-[var(--border)] pt-2">
            <div>
              <div className="font-mono-tech text-[9px] font-semibold text-[var(--text-dim)]">
                TOTAL VGM
              </div>
              <div
                data-testid="hud-total-vgm"
                className="font-mono-tech text-xs font-extrabold text-[var(--text)]"
              >
                {stability.totalVgmTonnes.toFixed(1)} t
              </div>
            </div>
            <div>
              <div className="font-mono-tech text-[9px] font-semibold text-[var(--text-dim)]">
                TRIM PITCH
              </div>
              <div className="font-mono-tech text-xs font-extrabold text-[var(--text)]">
                {stability.trimPitchDeg > 0 ? '+' : ''}
                {stability.trimPitchDeg.toFixed(2)}°
              </div>
            </div>
            <div>
              <div className="font-mono-tech text-[9px] font-semibold text-[var(--text-dim)]">
                3D CG (X/Y)
              </div>
              <div className="font-mono-tech text-xs font-extrabold text-[var(--accent-cyan)]">
                {stability.cgX >= 0 ? '+' : ''}
                {stability.cgX.toFixed(2)}/{stability.cgY.toFixed(1)}m
              </div>
            </div>
          </div>

          {/* Port vs Starboard Tonnage Balance Bar */}
          <div className="mt-2">
            <div className="font-mono-tech mb-1 flex justify-between text-[9px] font-bold text-[var(--text-muted)]">
              <span>PORT {stability.portWeightTonnes.toFixed(0)}t</span>
              <span>CL {stability.centerWeightTonnes.toFixed(0)}t</span>
              <span>STBD {stability.starboardWeightTonnes.toFixed(0)}t</span>
            </div>
            <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-[var(--bg-subtle)]">
              <div
                className="h-full bg-[#0284C7] transition-all duration-300"
                style={{
                  width: `${
                    stability.totalVgmTonnes > 0
                      ? (stability.portWeightTonnes / stability.totalVgmTonnes) *
                        100
                      : 33
                  }%`,
                }}
              />
              <div
                className="h-full bg-[#64748B] transition-all duration-300"
                style={{
                  width: `${
                    stability.totalVgmTonnes > 0
                      ? (stability.centerWeightTonnes /
                          stability.totalVgmTonnes) *
                        100
                      : 34
                  }%`,
                }}
              />
              <div
                className={`h-full transition-all duration-300 ${
                  stability.verdict === 'CRITICAL'
                    ? 'bg-red-600'
                    : 'bg-[#EA580C]'
                }`}
                style={{
                  width: `${
                    stability.totalVgmTonnes > 0
                      ? (stability.starboardWeightTonnes /
                          stability.totalVgmTonnes) *
                        100
                      : 33
                  }%`,
                }}
              />
            </div>
          </div>
        </div>

        {/* Bottom-Left Subtle Direct-Manipulation Instruction Pill */}
        <div className="pointer-events-none absolute bottom-2.5 left-3 z-10 hidden items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--bg-elevated)]/88 px-2.5 py-1 text-[10px] font-semibold text-[var(--text-muted)] backdrop-blur-sm md:inline-flex">
          <ContainerIcon className="h-3 w-3 text-[#EA580C]" />
          <span>
            {lang === 'vi'
              ? 'Bấm trực tiếp vào khoang tàu để điều cẩu STS · Kéo chuột xoay 3D · Cuộn để phóng to'
              : 'Click any open vessel bay column via 3D raycast to dispatch STS crane · Drag to orbit · Scroll to zoom'}
          </span>
        </div>
      </div>

      {/* Mobile Docked SOLAS VGM Telemetry Strip (visible < 640px so canvas stays 100% clean) */}
      <div className="border-t border-[var(--border)] bg-[var(--bg)] px-3 py-2.5 sm:hidden">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ShipInclinometerGauge
              heelAngleDeg={stability.heelAngleDeg}
              verdict={stability.verdict}
            />
            <div>
              <span
                className={`font-mono-tech inline-block rounded border px-1.5 py-0.5 text-[10px] font-extrabold ${verdictBadgeClass}`}
              >
                SOLAS {stability.verdict}
              </span>
              <div className="font-mono-tech mt-1 text-xs font-extrabold text-[var(--text)]">
                Heel {stability.heelAngleDeg > 0 ? '+' : ''}
                {stability.heelAngleDeg.toFixed(1)}° ({heelDirectionLabel}) · GM{' '}
                {stability.gmMeters.toFixed(2)}m
              </div>
              <div className="font-mono-tech text-[10px] text-[var(--text-muted)]">
                VGM {stability.totalVgmTonnes.toFixed(1)}t · CG{' '}
                {stability.cgX >= 0 ? '+' : ''}
                {stability.cgX.toFixed(2)}/{stability.cgY.toFixed(1)}m ·{' '}
                {stability.teuCount} TEU
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Direct-Manipulation Interactive Command Dock */}
      <div className="border-t border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2.5 sm:px-4">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          {/* Left Group: Container Hoist Dispatchers */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => dispatchCraneLift('dry-40')}
              data-testid="btn-load-dry"
              className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-bold transition-all ${
                selectedKind === 'dry-40'
                  ? 'border-[#1D4ED8] bg-[#1D4ED8] text-white shadow-xs'
                  : 'border-[var(--border-strong)] bg-[var(--bg)] text-[var(--text)] hover:border-[#1D4ED8]'
              }`}
            >
              <PlusIcon className="h-3.5 w-3.5" />
              <span>LOAD 40FT DRY</span>
              <span className="font-mono-tech rounded bg-black/15 px-1 py-0.5 text-[10px]">
                26.5t
              </span>
            </button>

            <button
              type="button"
              onClick={() => dispatchCraneLift('reefer-40')}
              data-testid="btn-load-reefer"
              className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-bold transition-all ${
                selectedKind === 'reefer-40'
                  ? 'border-[#0284C7] bg-[#0284C7] text-white shadow-xs'
                  : 'border-[var(--border-strong)] bg-[var(--bg)] text-[var(--text)] hover:border-[#0284C7]'
              }`}
            >
              <PlusIcon className="h-3.5 w-3.5" />
              <span>LOAD REEFER (-18°C)</span>
              <span className="font-mono-tech rounded bg-black/15 px-1 py-0.5 text-[10px]">
                29.2t
              </span>
            </button>

            <button
              type="button"
              onClick={() => dispatchCraneLift('hazmat-imo3')}
              data-testid="btn-load-hazmat"
              className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-bold transition-all ${
                selectedKind === 'hazmat-imo3'
                  ? 'border-[#D97706] bg-[#D97706] text-white shadow-xs'
                  : 'border-[var(--border-strong)] bg-[var(--bg)] text-[var(--text)] hover:border-[#D97706]'
              }`}
            >
              <PlusIcon className="h-3.5 w-3.5" />
              <span>LOAD HAZMAT</span>
              <span className="font-mono-tech rounded bg-black/15 px-1 py-0.5 text-[10px]">
                31.8t
              </span>
            </button>
          </div>

          {/* Right Group: Hydrostatic Stress-Test & Auto-Trim Solver */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={handleInjectStarboardImbalance}
              data-testid="btn-inject-imbalance"
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-red-600/50 bg-red-600/10 px-2.5 py-1.5 text-xs font-extrabold text-red-700 transition-colors hover:bg-red-600 hover:text-white dark:text-red-300 dark:hover:text-white"
            >
              <AlertTriangleIcon className="h-3.5 w-3.5" />
              <span>
                {lang === 'vi'
                  ? 'BƠM LỆCH MẠN PHẢI (>6.5°)'
                  : 'INJECT STARBOARD IMBALANCE'}
              </span>
            </button>

            <button
              type="button"
              onClick={handleAutoTrimBallast}
              data-testid="btn-auto-trim"
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-[#059669] px-3 py-1.5 text-xs font-extrabold text-white shadow-xs transition-opacity hover:opacity-90"
            >
              <ScaleIcon className="h-3.5 w-3.5" />
              <span>
                {lang === 'vi'
                  ? 'CÂN BẰNG DẰN & XẾP TỰ ĐỘNG'
                  : 'AUTO-TRIM BALLAST & STOW'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                cranesRef.current = [
                  createInitialCraneState(0),
                  createInitialCraneState(1),
                ];
                setContainers(createInitialPortContainers());
                setSeaState('calm');
                handleSelectCameraPreset('quay-overview');
              }}
              data-testid="btn-reset-port"
              title={lang === 'vi' ? 'Đặt lại cảng' : 'Reset port stowage'}
              className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--bg)] px-2.5 py-1.5 text-xs font-semibold text-[var(--text-muted)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--text)]"
            >
              <RefreshIcon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">
                {lang === 'vi' ? 'Đặt lại' : 'Reset'}
              </span>
            </button>
          </div>
        </div>

        {/* Live SOLAS Engineering Advisory Line */}
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border)] pt-2 text-[11px]">
          <div className="flex items-center gap-1.5 font-medium text-[var(--text-muted)]">
            {stability.verdict === 'CRITICAL' ? (
              <AlertTriangleIcon className="h-3.5 w-3.5 shrink-0 text-red-600" />
            ) : (
              <CheckCircleIcon className="h-3.5 w-3.5 shrink-0 text-[var(--accent-emerald)]" />
            )}
            <span
              data-testid="solas-advisory-text"
              className={
                stability.verdict === 'CRITICAL'
                  ? 'font-bold text-red-600 dark:text-red-400'
                  : ''
              }
            >
              {lang === 'vi' ? stability.advisoryVi : stability.advisoryEn}
            </span>
          </div>
          <div className="font-mono-tech flex items-center gap-3 text-[10px] font-semibold text-[var(--text-dim)]">
            <span>DRY {stability.dryCount}</span>
            <span>REEFER {stability.reeferCount}</span>
            <span>HAZMAT {stability.hazmatCount}</span>
            <span>LIFTS {craneHud.completedLifts}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MaritimePort3DStage;
