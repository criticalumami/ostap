const scene = new THREE.Scene();
scene.background = new THREE.Color(0xffffff); // Set white background

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
// Set a reasonable default position (not too high or far)
camera.position.set(0, 3, -5);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true; // Enable shadows
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.getElementById('threejs-container').appendChild(renderer.domElement);

// Add ambient light
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

// Add a "sun" (directional light with shadows)
const sun = new THREE.DirectionalLight(0xfff7e0, 1.2);
sun.position.set(10, 20, 10);
sun.castShadow = true;
sun.shadow.mapSize.width = 2048;
sun.shadow.mapSize.height = 2048;
sun.shadow.camera.near = 1;
sun.shadow.camera.far = 50;
sun.shadow.camera.left = -20;
sun.shadow.camera.right = 20;
sun.shadow.camera.top = 20;
sun.shadow.camera.bottom = -20;
scene.add(sun);

// Optional: visualize the sun's shadow camera
// const helper = new THREE.CameraHelper(sun.shadow.camera);
// scene.add(helper);

// Add a ground plane to catch shadows
const groundGeo = new THREE.PlaneGeometry(100, 100);
const groundMat = new THREE.MeshPhongMaterial({ color: 0xf0f0f0, depthWrite: true });
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -1;
ground.receiveShadow = true;
scene.add(ground);

// Add OrbitControls
const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.target.set(0, 0, 0);

let model;
const loader = new THREE.GLTFLoader();
loader.load('models/ostap.gltf', function (gltf) {
    model = gltf.scene;
    // Center the model
    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    model.position.sub(center); // Center at (0,0,0)
    // Move model so its bottom touches the ground plane (y = -1)
    const minY = box.min.y - center.y;
    model.position.y -= minY + 1; // -1 is the ground plane's y position

    // Add thin black strokes (edges) to each mesh
    model.traverse((child) => {
        if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            // Restore original material (remove forced grayscale)
            // If you want to keep the model's original material, do not overwrite it:
            // (Just remove the child.material = ... block entirely)
            // If you want to ensure shadows, you can keep the castShadow/receiveShadow lines.
            // No material assignment here.
            // Add edge lines
            const edges = new THREE.EdgesGeometry(child.geometry);
            const line = new THREE.LineSegments(
                edges,
                new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 1 })
            );
            line.position.copy(child.position);
            line.rotation.copy(child.rotation);
            line.scale.copy(child.scale);
            child.add(line);
        }
    });
    scene.add(model);

    // Adjust camera and controls to fit model (less aggressive multipliers)
    const maxDim = Math.max(size.x, size.y, size.z);
    camera.position.set(0, maxDim * 0.7, -maxDim * 1.5);
    camera.lookAt(0, -1, 0);
    controls.target.set(0, -1, 0);
    controls.update();
}, undefined, function (error) {
    console.error("GLTF load error:", error);
});

// Sun orientation slider logic
const sunAzimuth = document.getElementById('sunAzimuth');
const sunElevation = document.getElementById('sunElevation');

function updateSunPosition() {
    // Convert degrees to radians
    const azimuthRad = THREE.MathUtils.degToRad(parseFloat(sunAzimuth.value));
    const elevationRad = THREE.MathUtils.degToRad(parseFloat(sunElevation.value));
    // Spherical coordinates to Cartesian
    const radius = 30;
    const x = radius * Math.cos(elevationRad) * Math.sin(azimuthRad);
    const y = radius * Math.sin(elevationRad);
    const z = radius * Math.cos(elevationRad) * Math.cos(azimuthRad);
    sun.position.set(x, y, z);
}

// Initialize sun position
if (sunAzimuth && sunElevation) {
    sunAzimuth.addEventListener('input', updateSunPosition);
    sunElevation.addEventListener('input', updateSunPosition);
    updateSunPosition();
}

function animate() {
    requestAnimationFrame(animate);
    if (model) {
        model.rotation.y += 0.005;
    }
    controls.update();
    renderer.render(scene, camera);
}

animate();

window.addEventListener('resize', function () {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});