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
controls.enabled = false;
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.target.set(0, 0, 0);

let model;
const loader = new THREE.GLTFLoader();

const modelSelectionDiv = document.getElementById('model-selection');
const modelDropdown = document.getElementById('model-dropdown');
const loadModelButton = document.getElementById('load-model-button');

const availableModels = ['bei', 'diag', 'model', 'ostap', 'port_three', 'show', 'urb']; // From previous glob

function loadModel(modelName) {
    const modelPath = `models/${modelName}.gltf`;
    console.log(`Loading model: ${modelPath}`);

    loader.load(modelPath, function (gltf) {
        if (model) { // Remove previous model if exists
            scene.remove(model);
        }
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
        const boundingSphere = box.getBoundingSphere(new THREE.Sphere());
        const objectRadius = boundingSphere.radius;
        const objectCenter = boundingSphere.center;

        // Calculate optimal camera distance to fit the object in view
        const fov = camera.fov * (Math.PI / 180);
        const cameraZ = objectRadius / Math.sin(fov / 2);

        // Set camera position and target
        camera.position.set(objectCenter.x, objectCenter.y + objectRadius * 0.5, objectCenter.z + cameraZ * 1.5); // Position camera slightly further back and higher
        camera.lookAt(objectCenter);
        controls.target.copy(objectCenter);

        // Adjust near and far planes based on object size
        camera.near = Math.max(0.1, cameraZ - objectRadius * 2); // Ensure near is not too small
        camera.far = cameraZ + objectRadius * 2;
        camera.updateProjectionMatrix();

        // Adjust sun shadow camera to encompass the model
        const shadowCameraSize = objectRadius * 2.5; // A bit larger than the object radius
        sun.shadow.camera.left = -shadowCameraSize;
        sun.shadow.camera.right = shadowCameraSize;
        sun.shadow.camera.top = shadowCameraSize;
        sun.shadow.camera.bottom = -shadowCameraSize;
        sun.shadow.camera.near = 0.1; // Can be small
        sun.shadow.camera.far = objectRadius * 5; // Far enough to cover the model and its shadows
        sun.shadow.camera.updateProjectionMatrix(); // Important to update after changing parameters

        controls.update();
    }, undefined, function (error) {
        console.error("GLTF load error:", error);
        alert("Failed to load model. Please try again.");
    });
}

// Check URL hash for model name
const initialModelName = window.location.hash.substring(1);

if (initialModelName && availableModels.includes(initialModelName)) {
    loadModel(initialModelName);
    // Overlay remains visible, waiting for click
    document.getElementById('overlay').style.backgroundColor = 'white';
    document.getElementById('text').style.color = 'gray';
    controls.enabled = false; // Controls disabled until overlay is clicked
} else {
    // No valid hash, show model selection
    modelSelectionDiv.style.display = 'block';
    controls.enabled = false; // Disable controls until model is loaded
    document.getElementById('overlay').style.display = 'none'; // Hide overlay

    // Populate dropdown
    availableModels.forEach(model => {
        const option = document.createElement('option');
        option.value = model;
        option.textContent = model;
        modelDropdown.appendChild(option);
    });

    // Load selected model on button click
    loadModelButton.addEventListener('click', () => {
        const selectedModel = modelDropdown.value;
        if (selectedModel) {
            loadModel(selectedModel);
            modelSelectionDiv.style.display = 'none'; // Hide selection after loading
            controls.enabled = true; // Enable controls after model loads
            document.getElementById('overlay').style.display = 'none'; // Ensure overlay is hidden
        }
    });
}

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

let isRotating = true;

function animate() {
    requestAnimationFrame(animate);
    if (model && isRotating) {
        model.rotation.y += 0.005;
    }
    controls.update();
    renderer.render(scene, camera);
}

animate();

const toggleRotationButton = document.getElementById('toggleRotation');
if (toggleRotationButton) {
    toggleRotationButton.addEventListener('click', () => {
        isRotating = !isRotating;
    });
}

window.addEventListener('resize', function () {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

document.getElementById('overlay').addEventListener('click', () => {
    controls.enabled = true;
    document.getElementById('overlay').style.display = 'none';
});


// Add a simple loading manager to track progress
const manager = new THREE.LoadingManager();
manager.onStart = function (url, itemsLoaded, itemsTotal) {
    console.log('Started loading file: ' + url + '.\nLoaded ' + itemsLoaded + ' of ' + itemsTotal + ' files.');
};

manager.onLoad = function () {
    console.log('Loading complete!');
};

manager.onProgress = function (url, itemsLoaded, itemsTotal) {
    console.log('Loading file: ' + url + '.\nLoaded ' + itemsLoaded + ' of ' + itemsTotal + ' files.');
};

manager.onError = function (url) {
    console.log('There was an error loading ' + url);
};

// Pass the manager to the loader
const loaderWithManager = new THREE.GLTFLoader(manager);
// Use this loader for your models
// loaderWithManager.load(...)