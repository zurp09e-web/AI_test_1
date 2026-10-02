import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface Props {
  themeColor?: string;
}

export const CyberGridWallpaper: React.FC<Props> = ({ themeColor = '#00f0ff' }) => {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    // Scene
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x05070f, 0.035);

    // Camera
    const camera = new THREE.PerspectiveCamera(65, width / height, 0.1, 1000);
    camera.position.set(0, 3, 10);
    camera.rotation.x = -0.15;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    container.appendChild(renderer.domElement);

    // Moving Cyber Grid Floor
    const gridHelper1 = new THREE.GridHelper(120, 60, new THREE.Color(0xff007f), new THREE.Color(themeColor));
    gridHelper1.position.y = -1;
    scene.add(gridHelper1);

    const gridHelper2 = new THREE.GridHelper(120, 60, new THREE.Color(0xff007f), new THREE.Color(themeColor));
    gridHelper2.position.set(0, -1, -120);
    scene.add(gridHelper2);

    // Neon Cyber Sun / Holographic Orb
    const sunGeo = new THREE.SphereGeometry(6, 32, 32);
    const sunMat = new THREE.MeshBasicMaterial({
      color: 0xff007f,
      wireframe: true,
    });
    const sun = new THREE.Mesh(sunGeo, sunMat);
    sun.position.set(0, 7, -50);
    scene.add(sun);

    // Glowing Sun Inner Core
    const coreGeo = new THREE.SphereGeometry(4.5, 24, 24);
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0xffe600,
      wireframe: true,
      transparent: true,
      opacity: 0.7,
    });
    const core = new THREE.Mesh(coreGeo, coreMat);
    core.position.set(0, 7, -50);
    scene.add(core);

    // Wireframe Mountain Ranges
    const mountainGeo = new THREE.PlaneGeometry(100, 30, 24, 12);
    const pos = mountainGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      if (y > -10) {
        pos.setZ(i, Math.sin(x * 0.2) * 5 + Math.cos(y * 0.3) * 4 + Math.random() * 2);
      }
    }
    mountainGeo.computeVertexNormals();

    const mountainMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(themeColor),
      wireframe: true,
      transparent: true,
      opacity: 0.35,
    });

    const leftMountains = new THREE.Mesh(mountainGeo, mountainMat);
    leftMountains.position.set(-35, 4, -40);
    leftMountains.rotation.y = 0.4;
    scene.add(leftMountains);

    const rightMountains = new THREE.Mesh(mountainGeo, mountainMat);
    rightMountains.position.set(35, 4, -40);
    rightMountains.rotation.y = -0.4;
    scene.add(rightMountains);

    // Floating Cyber Particles
    const particleCount = 400;
    const particleGeo = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount * 3; i += 3) {
      particlePositions[i] = (Math.random() - 0.5) * 80;
      particlePositions[i + 1] = Math.random() * 25 - 1;
      particlePositions[i + 2] = (Math.random() - 0.5) * 100 - 20;
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    const particleMat = new THREE.PointsMaterial({
      color: 0x00f0ff,
      size: 0.18,
      transparent: true,
      opacity: 0.8,
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    // Mouse Parallax
    let mouseX = 0;
    let mouseY = 0;
    const handleMouseMove = (e: MouseEvent) => {
      mouseX = (e.clientX / window.innerWidth - 0.5) * 0.8;
      mouseY = (e.clientY / window.innerHeight - 0.5) * 0.4;
    };
    window.addEventListener('mousemove', handleMouseMove);

    // Animation Loop
    let animationFrameId: number;
    const speed = 0.18;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      // Move floor grids towards camera
      gridHelper1.position.z += speed;
      gridHelper2.position.z += speed;

      if (gridHelper1.position.z >= 120) {
        gridHelper1.position.z = gridHelper2.position.z - 120;
      }
      if (gridHelper2.position.z >= 120) {
        gridHelper2.position.z = gridHelper1.position.z - 120;
      }

      // Rotate sun
      sun.rotation.y += 0.003;
      sun.rotation.x += 0.001;
      core.rotation.y -= 0.005;

      // Parallax camera easing
      camera.position.x += (mouseX * 3 - camera.position.x) * 0.05;
      camera.position.y += (3 - mouseY * 1.5 - camera.position.y) * 0.05;
      camera.lookAt(0, 4, -40);

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [themeColor]);

  return <div ref={mountRef} className="absolute inset-0 pointer-events-none" />;
};
