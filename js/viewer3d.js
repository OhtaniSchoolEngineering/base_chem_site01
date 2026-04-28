// js/viewer3d.js

let scene, camera, renderer, controls;
let atomsGroup = new THREE.Group();
let electronsGroup = new THREE.Group();

window.init_viewer3d = function() {
    const container = document.getElementById('viewer3d-canvas');
    if (!container) return;
    
    // Check if already initialized
    if (container.children.length > 0) return;

    // Setup Three.js Scene
    scene = new THREE.Scene();
    
    // Add subtle background particles
    const bgGeo = new THREE.BufferGeometry();
    const bgCount = 500;
    const bgPos = new Float32Array(bgCount * 3);
    for(let i=0; i<bgCount*3; i++) {
        bgPos[i] = (Math.random() - 0.5) * 100;
    }
    bgGeo.setAttribute('position', new THREE.BufferAttribute(bgPos, 3));
    const bgMat = new THREE.PointsMaterial({color: 0x3b82f6, size: 0.1, transparent: true, opacity: 0.5});
    const bgPoints = new THREE.Points(bgGeo, bgMat);
    scene.add(bgPoints);

    camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.z = 25;

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);

    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 1.0;

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    
    const pointLight1 = new THREE.PointLight(0xffffff, 0.8);
    pointLight1.position.set(10, 10, 10);
    scene.add(pointLight1);
    
    const pointLight2 = new THREE.PointLight(0x3b82f6, 0.5);
    pointLight2.position.set(-10, -10, 5);
    scene.add(pointLight2);

    scene.add(atomsGroup);
    scene.add(electronsGroup);

    // Handle Resize
    window.addEventListener('resize', () => {
        if (!document.getElementById('view-viewer3d').classList.contains('active')) return;
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
    });

    // Initial draw
    window.viewer3d_update(1); // Hydrogen default

    animate();
}

function animate(time) {
    requestAnimationFrame(animate);
    TWEEN.update(time);
    if (controls) controls.update();
    
    // Rotate electrons
    if (electronsGroup) {
        electronsGroup.children.forEach((shellGroup) => {
            // Find the orbiting group inside the shell group
            const orbitingGroup = shellGroup.children.find(child => child.isGroup);
            if (orbitingGroup) {
                const speed = orbitingGroup.userData.speed || 0.02;
                orbitingGroup.rotation.z += speed;
            }
        });
    }
    
    // Rotate nucleus slightly
    if (atomsGroup) {
        atomsGroup.rotation.y += 0.005;
        atomsGroup.rotation.x += 0.002;
    }

    if (renderer && scene && camera) {
        renderer.render(scene, camera);
    }
}

window.viewer3d_update = function(atomicNumber) {
    const el = ELEMENTS.find(e => e.num === atomicNumber);
    if (!el) return;

    // Update UI
    document.getElementById('viewer3d-p').textContent = el.num;
    document.getElementById('viewer3d-n').textContent = el.mass - el.num;
    document.getElementById('viewer3d-e').textContent = el.num;

    // Clear previous
    while(atomsGroup.children.length > 0){ 
        atomsGroup.remove(atomsGroup.children[0]); 
    }
    while(electronsGroup.children.length > 0){ 
        electronsGroup.remove(electronsGroup.children[0]); 
    }

    const protons = el.num;
    const neutrons = el.mass - el.num;
    const electrons = el.num;

    // Nucleus
    const pGeo = new THREE.SphereGeometry(0.4, 32, 32);
    const pMat = new THREE.MeshPhongMaterial({ color: 0xef4444, shininess: 100 }); // Red for Protons
    const nMat = new THREE.MeshPhongMaterial({ color: 0x9ca3af, shininess: 100 }); // Gray for Neutrons

    const nucleusParticles = [];
    for(let i=0; i<protons; i++) nucleusParticles.push('p');
    for(let i=0; i<neutrons; i++) nucleusParticles.push('n');
    
    // Shuffle array for mixed nucleus
    nucleusParticles.sort(() => Math.random() - 0.5);

    const radius = Math.pow(protons + neutrons, 1/3) * 0.4;
    
    nucleusParticles.forEach((type, i) => {
        const mesh = new THREE.Mesh(pGeo, type === 'p' ? pMat : nMat);
        
        // Random packing inside sphere
        const phi = Math.acos( -1 + ( 2 * i ) / nucleusParticles.length );
        const theta = Math.sqrt( nucleusParticles.length * Math.PI ) * phi;
        
        const r = radius * Math.random(); // Distribute inside
        
        mesh.position.set(
            r * Math.cos(theta) * Math.sin(phi),
            r * Math.sin(theta) * Math.sin(phi),
            r * Math.cos(phi)
        );
        atomsGroup.add(mesh);
    });

    // Shell Colors (K, L, M, N)
    const shellColors = [0xfacc15, 0x4ade80, 0x60a5fa, 0xc084fc]; 

    const eGeo = new THREE.SphereGeometry(0.15, 16, 16);

    let eCount = 0;
    el.shells.forEach((count, shellIndex) => {
        const orbitRadius = radius + 3 + (shellIndex * 2);
        
        const shellColor = shellColors[shellIndex] || 0xffffff;
        const eMat = new THREE.MeshPhongMaterial({ color: shellColor, emissive: shellColor, emissiveIntensity: 0.5 });
        
        // Group for the ring and its electrons
        const shellGroup = new THREE.Group();
        
        // Give each shell group a random rotation
        const rx = Math.random() * Math.PI;
        const ry = Math.random() * Math.PI;
        shellGroup.rotation.set(rx, ry, 0);

        // Draw orbit ring inside the group
        const ringGeo = new THREE.RingGeometry(orbitRadius - 0.05, orbitRadius + 0.05, 64);
        const ringMat = new THREE.MeshBasicMaterial({ color: shellColor, side: THREE.DoubleSide, transparent: true, opacity: 0.3 });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        shellGroup.add(ring);

        // Group specifically for rotating the electrons around the Z axis
        const orbitingGroup = new THREE.Group();
        orbitingGroup.userData = { speed: 0.02 + Math.random() * 0.01 - (shellIndex * 0.005) };
        shellGroup.add(orbitingGroup);

        // Add electrons to this shell
        for(let i=0; i<count; i++) {
            const mesh = new THREE.Mesh(eGeo, eMat);
            
            // Start angle
            const angle = (Math.PI * 2 / count) * i;
            mesh.position.set(Math.cos(angle) * orbitRadius, Math.sin(angle) * orbitRadius, 0);
            
            orbitingGroup.add(mesh);
            eCount++;
        }
        
        electronsGroup.add(shellGroup);
    });
}
