"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

export default function Earth3D() {
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
    camera.position.set(0, 0.2, 3.2);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    const setSize = () => {
      const rect = container.getBoundingClientRect();
      camera.aspect = rect.width / rect.height;
      camera.updateProjectionMatrix();
      renderer.setSize(rect.width, rect.height);
    };
    setSize();

    // Lights
    const ambient = new THREE.AmbientLight(0x404060, 0.65);
    scene.add(ambient);

    const sunLight = new THREE.DirectionalLight(0xffffff, 1.2);
    sunLight.position.set(5, 3, 5);
    scene.add(sunLight);

    const backLight = new THREE.PointLight(0xccaa66, 0.4);
    backLight.position.set(-2, -1, -3);
    scene.add(backLight);

    const fillLight = new THREE.PointLight(0x88aaff, 0.3);
    fillLight.position.set(1, 2, 2);
    scene.add(fillLight);

    // Textures
    const loader = new THREE.TextureLoader();
    const earthMap = "https://threejs.org/examples/textures/planets/earth_atmos_2048.jpg";
    const normalMap = "https://threejs.org/examples/textures/planets/earth_normal_2048.jpg";
    const specularMap = "https://threejs.org/examples/textures/planets/earth_specular_2048.jpg";
    const cloudMap = "https://threejs.org/examples/textures/planets/earth_clouds_1024.png";

    // Earth
    const earthGeo = new THREE.SphereGeometry(1, 128, 128);
    const earthMat = new THREE.MeshStandardMaterial({
      map: loader.load(earthMap),
      normalMap: loader.load(normalMap),
      roughness: 0.5,
      metalness: 0.1,
    });
    // Load specular separately to avoid constructor overload issue
    loader.load(specularMap, (tex) => {
      earthMat.roughnessMap = tex;
      earthMat.roughness = 0.4;
      earthMat.needsUpdate = true;
    });
    const earth = new THREE.Mesh(earthGeo, earthMat);
    scene.add(earth);

    // Clouds
    const cloudGeo = new THREE.SphereGeometry(1.008, 128, 128);
    const cloudMat = new THREE.MeshPhongMaterial({
      map: loader.load(cloudMap),
      transparent: true,
      opacity: 0.28,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
    const clouds = new THREE.Mesh(cloudGeo, cloudMat);
    scene.add(clouds);

    // Atmosphere glow
    const glowGeo = new THREE.SphereGeometry(1.12, 64, 64);
    const glowMat = new THREE.MeshPhongMaterial({
      color: 0x88aaff,
      transparent: true,
      opacity: 0.05,
      side: THREE.BackSide,
    });
    scene.add(new THREE.Mesh(glowGeo, glowMat));

    // Orbit ring
    const ringGeo = new THREE.TorusGeometry(1.02, 0.002, 64, 800);
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0x88aaff,
      emissive: 0x224466,
      emissiveIntensity: 0.3,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    earth.add(ring);

    // Dust particles
    const dustCount = 800;
    const dustPositions = new Float32Array(dustCount * 3);
    for (let i = 0; i < dustCount; i++) {
      const r = 1.5 + Math.random() * 1.2;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      dustPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      dustPositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      dustPositions[i * 3 + 2] = r * Math.cos(phi);
    }
    const dustGeo = new THREE.BufferGeometry();
    dustGeo.setAttribute("position", new THREE.BufferAttribute(dustPositions, 3));
    const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({
      color: 0xffaa66,
      size: 0.008,
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending,
    }));
    scene.add(dust);

    const dust2Positions = new Float32Array(600 * 3);
    for (let i = 0; i < 600; i++) {
      const r = 1.45 + Math.random() * 1.1;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      dust2Positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      dust2Positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      dust2Positions[i * 3 + 2] = r * Math.cos(phi);
    }
    const dust2Geo = new THREE.BufferGeometry();
    dust2Geo.setAttribute("position", new THREE.BufferAttribute(dust2Positions, 3));
    const dust2 = new THREE.Points(dust2Geo, new THREE.PointsMaterial({
      color: 0x88ccff,
      size: 0.006,
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending,
    }));
    scene.add(dust2);

    let time = 0;

    const animate = () => {
      rafRef.current = requestAnimationFrame(animate);
      time += 0.016;

      earth.rotation.y += 0.0028;
      clouds.rotation.y += 0.0032;
      ring.rotation.z += 0.0005;

      dust.rotation.y += 0.002;
      dust.rotation.x += 0.001;
      dust2.rotation.y -= 0.0015;
      dust2.rotation.z += 0.0008;

      sunLight.intensity = 1.1 + Math.sin(time * 0.27) * 0.05;

      renderer.render(scene, camera);
    };

    animate();

    const resizeObserver = new ResizeObserver(setSize);
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      cancelAnimationFrame(rafRef.current);
      renderer.dispose();
      container.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="fixed pointer-events-none"
      style={{
        right: 0,
        top: "50%",
        transform: "translateY(-50%)",
        width: "44vw",
        height: "100vh",
        zIndex: 0,
      }}
      aria-hidden="true"
    />
  );
}
