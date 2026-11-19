// city.js — Equator City: grid streets, facaded towers, plaza, waterfront, garage, police HQ.
import * as THREE from '../vendor/three.module.min.js';
import { facadeTexture, roadTexture, plazaTexture, billboardTexture, signTexture, grassTexture } from './textures.js';
import { pick, range, rangeInt } from './rng.js';

function texMat(canvasTex, repeatX = 1, repeatY = 1) {
  const t = new THREE.CanvasTexture(canvasTex);
  t.wrapS = THREE.RepeatWrapping; t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeatX, repeatY); t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return new THREE.MeshStandardMaterial({ map: t, roughness: 0.85, metalness: 0.05 });
}

export function buildCity(scene, rng) {
  const colliders = []; // {x,z,hx,hz}
  const buildings = [];
  const roadLines = [-80, -40, 0, 40, 80];
  const HALF = 104;

  // ground
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(460, 460), texMat(grassTexture(rng), 40, 40));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);

  // roads: strips along each grid line, both directions
  const roadMat = texMat(roadTexture(rng), 1, 10);
  for (const c of roadLines) {
    const ns = new THREE.Mesh(new THREE.PlaneGeometry(10, HALF * 2), roadMat);
    ns.rotation.x = -Math.PI / 2; ns.position.set(c, 0.03, 0); ns.receiveShadow = true; scene.add(ns);
    const ew = new THREE.Mesh(new THREE.PlaneGeometry(HALF * 2, 10), roadMat);
    ew.rotation.x = -Math.PI / 2; ew.position.set(0, 0.03, c); ew.receiveShadow = true; scene.add(ew);
    // sidewalks
    const walkMat = new THREE.MeshStandardMaterial({ color: 0xb9b3a4, roughness: 0.95 });
    const w1 = new THREE.Mesh(new THREE.PlaneGeometry(3, HALF * 2), walkMat);
    w1.rotation.x = -Math.PI / 2; w1.position.set(c - 6.5, 0.02, 0); w1.receiveShadow = true; scene.add(w1);
    const w2 = w1.clone(); w2.position.x = c + 6.5; scene.add(w2);
  }
  // crosswalks at centre intersections
  const crossMat = new THREE.MeshStandardMaterial({ color: 0xe8e8e8, roughness: 0.9 });
  for (const cx of [0, 40]) for (const cz of [0, 40]) {
    for (let i = 0; i < 5; i++) {
      const s = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 3.4), crossMat);
      s.rotation.x = -Math.PI / 2; s.position.set(cx - 4 + i * 2, 0.05, cz + 7); scene.add(s);
    }
  }

  // central plaza at (0,0) block — fountain + palms + benches
  const plaza = new THREE.Mesh(new THREE.PlaneGeometry(34, 34), texMat(plazaTexture(rng), 1, 1));
  plaza.rotation.x = -Math.PI / 2; plaza.position.set(20, 0.04, 20); plaza.receiveShadow = true; scene.add(plaza);
  const fountainBase = new THREE.Mesh(new THREE.CylinderGeometry(4.4, 4.8, 0.9, 20), new THREE.MeshStandardMaterial({ color: 0xcfc8b8, roughness: 0.8 }));
  fountainBase.position.set(20, 0.45, 20); fountainBase.castShadow = true; scene.add(fountainBase);
  const water = new THREE.Mesh(new THREE.CylinderGeometry(3.9, 3.9, 0.25, 20), new THREE.MeshStandardMaterial({ color: 0x2fb3c9, roughness: 0.15, metalness: 0.4 }));
  water.position.set(20, 0.85, 20); scene.add(water);
  const jet = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.6, 2.2, 10), new THREE.MeshStandardMaterial({ color: 0xcfc8b8, roughness: 0.8 }));
  jet.position.set(20, 1.8, 20); scene.add(jet);

  // buildings per block (skip plaza block centre, skip garage + police blocks)
  const palette = ['#e8b04b', '#d96a4a', '#7fb069', '#5b8dbf', '#c97ba8', '#e8e0d0', '#8a7fbf', '#4fa8a0'];
  const garageBlock = { bx: -60, bz: 60 };
  const policeBlock = { bx: 60, bz: -60 };
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x3a3f46, roughness: 0.95 });
  const acMat = new THREE.MeshStandardMaterial({ color: 0x9aa0a8, roughness: 0.7, metalness: 0.4 });
  for (let bi = 0; bi < 4; bi++) {
    for (let bj = 0; bj < 4; bj++) {
      const bx = -60 + bi * 40, bz = -60 + bj * 40;
      if (bx === 20 && bz === 20) continue; // plaza
      if (bx === garageBlock.bx && bz === garageBlock.bz) continue;
      if (bx === policeBlock.bx && bz === policeBlock.bz) continue;
      const n = rangeInt(rng, 2, 4);
      for (let k = 0; k < n; k++) {
        const ox = bx + pick(rng, [-9, 2, 9]) + range(rng, -2, 2);
        const oz = bz + pick(rng, [-9, 2, 9]) + range(rng, -2, 2);
        const w = range(rng, 10, 15), d = range(rng, 10, 15);
        const floors = rangeInt(rng, 3, 9);
        const h = floors * 3.4 + 3;
        const base = pick(rng, palette);
        const facade = texMat(facadeTexture(rng, base, floors, floors >= 7 ? 'tower' : 'shop'), 1, 1);
        const mats = [facade, facade, roofMat, roofMat, facade, facade];
        const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mats);
        b.position.set(ox, h / 2, oz); b.castShadow = true; b.receiveShadow = true;
        scene.add(b);
        buildings.push({ x: ox, z: oz, w, d, h });
        colliders.push({ x: ox, z: oz, hx: w / 2, hz: d / 2 });
        // rooftop props: AC unit + water tank + antenna
        const ac = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.9, 1.2), acMat);
        ac.position.set(ox - w / 4, h + 0.45, oz); ac.castShadow = true; scene.add(ac);
        const tank = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 1.8, 12), new THREE.MeshStandardMaterial({ color: 0x7a6a55, roughness: 0.9 }));
        tank.position.set(ox + w / 4, h + 0.9, oz - d / 4); tank.castShadow = true; scene.add(tank);
        if (rng() < 0.5) {
          const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.1, 4, 6), new THREE.MeshStandardMaterial({ color: 0x333333 }));
          ant.position.set(ox, h + 2, oz + d / 4); scene.add(ant);
          const tip = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 8), new THREE.MeshStandardMaterial({ color: 0xff2222, emissive: 0xff0000, emissiveIntensity: 1.5 }));
          tip.position.set(ox, h + 4, oz + d / 4); scene.add(tip);
        }
      }
    }
  }

  // garage (Broomworks) at (-60,60): low wide hall + open door + respray pad
  const garage = new THREE.Group();
  const gFacade = texMat(facadeTexture(rng, '#3a6ea5', 2, 'shop'), 1, 1);
  const gBody = new THREE.Mesh(new THREE.BoxGeometry(22, 7, 14), [gFacade, gFacade, roofMat, roofMat, gFacade, gFacade]);
  gBody.position.y = 3.5; gBody.castShadow = true; garage.add(gBody);
  const door = new THREE.Mesh(new THREE.PlaneGeometry(8, 5), new THREE.MeshStandardMaterial({ color: 0x0c0e12, roughness: 1 }));
  door.position.set(-4, 2.5, 7.05); garage.add(door);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(16, 2.2), new THREE.MeshStandardMaterial({ map: new THREE.CanvasTexture(signTexture('GARAGE • BROOMWORKS', '#ff2e88', '#ffffff')), roughness: 0.6 }));
  sign.position.set(0, 6.2, 7.1); garage.add(sign);
  garage.position.set(-60, 0, 60); scene.add(garage);
  colliders.push({ x: -60, z: 60, hx: 11, hz: 7 });
  // respray pad: magenta ring on the forecourt
  const pad = new THREE.Mesh(new THREE.RingGeometry(3.2, 4, 24), new THREE.MeshStandardMaterial({ color: 0xff2e88, emissive: 0xff2e88, emissiveIntensity: 0.7, side: THREE.DoubleSide }));
  pad.rotation.x = -Math.PI / 2; pad.position.set(-60, 0.06, 76); scene.add(pad);

  // police HQ at (60,-60): white/blue block + sign + flag
  const police = new THREE.Group();
  const pFacade = texMat(facadeTexture(rng, '#dfe6ee', 4, 'tower'), 1, 1);
  const pBody = new THREE.Mesh(new THREE.BoxGeometry(18, 12, 14), [pFacade, pFacade, roofMat, roofMat, pFacade, pFacade]);
  pBody.position.y = 6; pBody.castShadow = true; police.add(pBody);
  const pSign = new THREE.Mesh(new THREE.PlaneGeometry(12, 2), new THREE.MeshStandardMaterial({ map: new THREE.CanvasTexture(signTexture('EQUATOR POLICE', '#1c3d8f', '#ffffff')), roughness: 0.6 }));
  pSign.position.set(0, 10.5, 7.1); police.add(pSign);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 9, 8), new THREE.MeshStandardMaterial({ color: 0xd8dde2, metalness: 0.8, roughness: 0.3 }));
  pole.position.set(7, 4.5, 8); police.add(pole);
  const flag = new THREE.Mesh(new THREE.PlaneGeometry(3, 1.8), new THREE.MeshStandardMaterial({ color: 0x19b8a6, side: THREE.DoubleSide }));
  flag.position.set(8.6, 8, 8); police.add(flag);
  police.position.set(60, 0, -60); scene.add(police);
  colliders.push({ x: 60, z: -60, hx: 9, hz: 7 });

  // billboards on two tall blocks
  const bb1 = new THREE.Mesh(new THREE.PlaneGeometry(14, 7), new THREE.MeshStandardMaterial({ map: new THREE.CanvasTexture(billboardTexture(rng, ['BROOMBROOM S1', 'ELECTRIC. FAST. FUN.'], '#10131a', '#ff2e88')), roughness: 0.6 }));
  bb1.position.set(-40, 22, -38); bb1.rotation.y = 0; scene.add(bb1);
  const bb1pole = new THREE.Mesh(new THREE.BoxGeometry(0.6, 8, 0.6), new THREE.MeshStandardMaterial({ color: 0x333333 }));
  bb1pole.position.set(-40, 14, -38); scene.add(bb1pole);
  const bb2 = new THREE.Mesh(new THREE.PlaneGeometry(14, 7), new THREE.MeshStandardMaterial({ map: new THREE.CanvasTexture(billboardTexture(rng, ['EQUATOR CITY', 'DRIVE THE DAY'], '#0e7d74', '#ffffff')), roughness: 0.6 }));
  bb2.position.set(40, 20, 62); bb2.rotation.y = Math.PI; scene.add(bb2);

  // street lamps + trees + traffic lights
  const lampPoleMat = new THREE.MeshStandardMaterial({ color: 0x2c2f36, metalness: 0.6, roughness: 0.5 });
  const lampHeadMat = new THREE.MeshStandardMaterial({ color: 0xfff2c0, emissive: 0xffe89a, emissiveIntensity: 1.4 });
  const lamps = [];
  for (const c of roadLines) {
    for (const t of [-90, -50, -10, 30, 70]) {
      for (const side of [-6.5, 6.5]) {
        const poleM = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 5.4, 8), lampPoleMat);
        poleM.position.set(c + side, 2.7, t); poleM.castShadow = true; scene.add(poleM);
        const arm = new THREE.Mesh(new THREE.BoxGeometry(side > 0 ? -1.4 : 1.4, 0.1, 0.1), lampPoleMat);
        arm.position.set(c + side + (side > 0 ? -0.7 : 0.7), 5.3, t); scene.add(arm);
        const head = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.18, 0.3), lampHeadMat);
        head.position.set(c + (side > 0 ? side - 1.4 : side + 1.4), 5.25, t); scene.add(head);
        lamps.push(new THREE.Vector3(head.position.x, 5.2, t));
      }
    }
  }
  // trees: trunk + 2-3 foliage spheres
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6b4a2f, roughness: 1 });
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x3f8f3a, roughness: 1 });
  const palmMat = new THREE.MeshStandardMaterial({ color: 0x4da34a, roughness: 1 });
  for (let i = 0; i < 46; i++) {
    const x = pick(rng, roadLines) + pick(rng, [-8.5, 8.5]);
    const z = range(rng, -95, 95);
    if (Math.abs(x - 20) < 20 && Math.abs(z - 20) < 20) continue;
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.28, 2.6, 8), trunkMat);
    trunk.position.set(x, 1.3, z); trunk.castShadow = true; scene.add(trunk);
    const isPalm = rng() < 0.4;
    if (isPalm) {
      for (let f = 0; f < 6; f++) {
        const frond = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.07, 0.42), palmMat);
        frond.position.set(x, 3.0, z); frond.rotation.y = (f / 6) * Math.PI * 2; frond.rotation.z = 0.45;
        frond.translateX(0.8); scene.add(frond);
      }
    } else {
      const s1 = new THREE.Mesh(new THREE.SphereGeometry(1.5, 10, 8), leafMat);
      s1.position.set(x, 3.4, z); s1.castShadow = true; scene.add(s1);
      const s2 = new THREE.Mesh(new THREE.SphereGeometry(1.0, 10, 8), leafMat);
      s2.position.set(x + 0.8, 2.8, z + 0.4); scene.add(s2);
    }
  }
  // traffic lights at 4 main intersections
  for (const [ix, iz] of [[0, 0], [0, 40], [40, 0], [40, 40]]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 4.2, 8), lampPoleMat);
    post.position.set(ix + 6, 2.1, iz + 6); scene.add(post);
    const boxL = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.2, 0.4), new THREE.MeshStandardMaterial({ color: 0x111111 }));
    boxL.position.set(ix + 6, 4.4, iz + 6); scene.add(boxL);
    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 8), new THREE.MeshStandardMaterial({ color: 0x22ff66, emissive: 0x00ff44, emissiveIntensity: 1.6 }));
    dot.position.set(ix + 6, 4.7, iz + 6.22); scene.add(dot);
  }
  // benches + hydrants near plaza
  for (let i = 0; i < 6; i++) {
    const bx = 20 + pick(rng, [-14, 14]) + range(rng, -3, 3);
    const bz = 20 + range(rng, -14, 14);
    const bench = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.12, 0.6), new THREE.MeshStandardMaterial({ color: 0x8a6b3f, roughness: 0.9 }));
    bench.position.set(bx, 0.55, bz); bench.castShadow = true; scene.add(bench);
  }

  // waterfront east: sand + sea
  const sand = new THREE.Mesh(new THREE.PlaneGeometry(18, HALF * 2 + 60), new THREE.MeshStandardMaterial({ color: 0xe8d8a8, roughness: 1 }));
  sand.rotation.x = -Math.PI / 2; sand.position.set(113, 0.02, 0); sand.receiveShadow = true; scene.add(sand);
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(60, HALF * 2 + 60), new THREE.MeshStandardMaterial({ color: 0x1f8fb8, roughness: 0.2, metalness: 0.3 }));
  sea.rotation.x = -Math.PI / 2; sea.position.set(152, 0.0, 0); scene.add(sea);

  // traffic loops: rectangles around blocks on road centres
  const loops = [];
  for (const cx of [-60, -20, 20, 60]) for (const cz of [-60, -20, 20, 60]) {
    loops.push([
      new THREE.Vector3(cx - 20, 0, cz - 20), new THREE.Vector3(cx + 20, 0, cz - 20),
      new THREE.Vector3(cx + 20, 0, cz + 20), new THREE.Vector3(cx - 20, 0, cz + 20),
    ]);
  }
  return {
    colliders, buildings, lamps,
    garagePos: new THREE.Vector3(-60, 0, 76),
    policePos: new THREE.Vector3(60, 0, -60),
    plazaPos: new THREE.Vector3(20, 0, 20),
    loops, bounds: HALF,
  };
}
