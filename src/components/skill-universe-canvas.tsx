import { useEffect, useRef } from "react";
import * as THREE from "three";

/**
 * Client-only WebGL skill constellation (imperative three.js).
 * Nodes drift on a shell; nearest neighbors are linked.
 * Slow rotation + pointer parallax. Labels are DOM-projected.
 */

const LABELED = [
  "PYTHON",
  "FASTAPI",
  "DOCKER",
  "POSTGRES",
  "RAG",
  "LLM",
  "REACT",
  "SQL",
  "REDIS",
  "AWS",
];

const ACCENT = "#4ade80";
const NODE = "#8fa3c8";
const LINE = "#3d4a63";

export default function SkillUniverseCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const labelRefs = useRef<(HTMLSpanElement | null)[]>([]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x0b0e16, 9, 18);
    const camera = new THREE.PerspectiveCamera(52, 1, 0.1, 100);
    camera.position.set(0, 0, 10.5);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    container.appendChild(renderer.domElement);

    // ---- graph ----
    const COUNT = 42;
    const positions: THREE.Vector3[] = [];
    const group = new THREE.Group();
    const nodeMat = new THREE.MeshBasicMaterial({ color: NODE, transparent: true, opacity: 0.6 });
    const nodeAccentMat = new THREE.MeshBasicMaterial({ color: ACCENT, transparent: true, opacity: 0.95 });
    const nodeLabelMat = new THREE.MeshBasicMaterial({ color: NODE, transparent: true, opacity: 0.95 });
    const sphere = new THREE.SphereGeometry(1, 12, 12);

    for (let i = 0; i < COUNT; i++) {
      const t = i / COUNT;
      const phi = Math.acos(1 - 2 * (t + 0.02));
      const theta = Math.PI * (1 + Math.sqrt(5)) * i;
      const r = 4.6 + Math.sin(i * 7.3) * 0.9;
      const pos = new THREE.Vector3(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.sin(phi) * Math.sin(theta) * 0.62,
        r * Math.cos(phi) * 0.8,
      );
      positions.push(pos);
      const labeled = i < LABELED.length;
      const scale = labeled ? 0.068 : 0.036 + ((i * 13) % 10) / 500;
      const mesh = new THREE.Mesh(sphere, labeled ? nodeLabelMat : i % 9 === 0 ? nodeAccentMat : nodeMat);
      mesh.position.copy(pos);
      mesh.scale.setScalar(scale);
      group.add(mesh);
    }

    const linePts: number[] = [];
    const seen = new Set<string>();
    for (let i = 0; i < COUNT; i++) {
      const dists = positions
        .map((p, j) => ({ j, d: positions[i]!.distanceTo(p) }))
        .filter((x) => x.j !== i)
        .sort((a, b) => a.d - b.d);
      for (const { j } of dists.slice(0, 2)) {
        const key = i < j ? `${i}-${j}` : `${j}-${i}`;
        if (seen.has(key)) continue;
        seen.add(key);
        linePts.push(positions[i]!.x, positions[i]!.y, positions[i]!.z, positions[j]!.x, positions[j]!.y, positions[j]!.z);
      }
    }
    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute("position", new THREE.Float32BufferAttribute(linePts, 3));
    group.add(new THREE.LineSegments(lineGeo, new THREE.LineBasicMaterial({ color: LINE, transparent: true, opacity: 0.35 })));
    scene.add(group);

    // ---- sizing ----
    const resize = () => {
      const w = container.clientWidth || 1;
      const h = container.clientHeight || 1;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(container);

    // ---- animation ----
    const pointer = { x: 0, y: 0 };
    const onPointer = (e: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
    };
    window.addEventListener("pointermove", onPointer);

    let raf = 0;
    const clock = new THREE.Clock();
    const worldPos = new THREE.Vector3();
    const animate = () => {
      raf = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      group.rotation.y += delta * 0.045;
      group.rotation.x += (pointer.y * 0.18 - group.rotation.x) * 0.04;
      group.rotation.z += (pointer.x * 0.08 - group.rotation.z) * 0.04;
      renderer.render(scene, camera);

      // project labels
      const w = container.clientWidth;
      const h = container.clientHeight;
      for (let i = 0; i < LABELED.length; i++) {
        const el = labelRefs.current[i];
        if (!el) continue;
        worldPos.copy(positions[i]!).applyMatrix4(group.matrixWorld).project(camera);
        const x = (worldPos.x * 0.5 + 0.5) * w;
        const y = (-worldPos.y * 0.5 + 0.5) * h;
        const visible = worldPos.z < 1;
        el.style.transform = `translate(${x.toFixed(1)}px, ${(y - 18).toFixed(1)}px)`;
        el.style.opacity = visible ? "1" : "0";
      }
    };
    animate();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("pointermove", onPointer);
      renderer.dispose();
      lineGeo.dispose();
      sphere.dispose();
      nodeMat.dispose();
      nodeAccentMat.dispose();
      nodeLabelMat.dispose();
      container.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div ref={containerRef} className="absolute inset-0">
      {LABELED.map((label, i) => (
        <span
          key={label}
          ref={(el) => {
            labelRefs.current[i] = el;
          }}
          className="pointer-events-none absolute top-0 left-0 font-mono text-[10px] tracking-[0.18em] whitespace-nowrap text-[#93a5c9]/80 transition-opacity duration-300"
        >
          {label}
        </span>
      ))}
    </div>
  );
}
