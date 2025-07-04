const scene = new THREE.Scene();
scene.background = new THREE.Color(0xffffff); // Set white background

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 1, 5); // Set a nice initial camera position

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true; // Enable shadows
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

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

const loader = new THREE.GLTFLoader();
loader.load('models/port_three.gltf', function (gltf) {
    const model = gltf.scene;
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

    // Adjust camera and controls to fit model
    const maxDim = Math.max(size.x, size.y, size.z);
    const camZ = maxDim * 2;
    camera.position.set(0, maxDim * 0.3, camZ);
    controls.target.set(0, -1, 0);
    controls.update();
}, undefined, function (error) {
    console.error(error);
});

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}

animate();

window.addEventListener('resize', function () {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});