const scene = new THREE.Scene();
scene.background = new THREE.Color(0xffffff);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 2, 5);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
document.getElementById('threejs-container').appendChild(renderer.domElement);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const sun = new THREE.DirectionalLight(0xfff7e0, 1.0);
sun.position.set(15, 25, 20);
sun.castShadow = true;
sun.shadow.mapSize.width = 2048;
sun.shadow.mapSize.height = 2048;
sun.shadow.camera.near = 1;
sun.shadow.camera.far = 60;
sun.shadow.camera.left = -25;
sun.shadow.camera.right = 25;
sun.shadow.camera.top = 25;
sun.shadow.camera.bottom = -25;
sun.shadow.bias = -0.001;
sun.shadow.normalBias = 0.05;
scene.add(sun);

const groundGeo = new THREE.PlaneGeometry(100, 100);
const groundMat = new THREE.MeshPhongMaterial({ color: 0xf0f0f0, depthWrite: true });
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -1;
ground.receiveShadow = true;
scene.add(ground);

const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enabled = false;
controls.enableDamping = true;
controls.dampingFactor = 0.07;
controls.target.set(0, 0, 0);

let model;
const loader = new THREE.GLTFLoader();

const modelSelectionDiv = document.getElementById('model-selection');
const modelDropdown = document.getElementById('model-dropdown');
const loadModelButton = document.getElementById('load-model-button');
const overlay = document.getElementById('overlay');
const textElement = document.getElementById('text');

const availableModels = ['bei', 'diag', 'mies', 'ostap', 'port_three', 'show', 'urb', 'vag'];

function loadModel(modelName) {
    const modelPath = `models/${modelName}.gltf`;
    textElement.textContent = 'loading...';
    overlay.style.display = 'flex';

    loader.load(modelPath, function (gltf) {
        if (model) {
            scene.remove(model);
        }
        model = gltf.scene;
        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        model.position.sub(center);
        const minY = box.min.y - center.y;
        model.position.y -= (minY + 1);

        model.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
                if (child.material.map) {
                    child.material.map.anisotropy = renderer.capabilities.getMaxAnisotropy();
                    child.material.map.minFilter = THREE.LinearMipmapLinearFilter;
                }
                const edges = new THREE.EdgesGeometry(child.geometry);
                const line = new THREE.LineSegments(
                    edges,
                    new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 0.01 })
                );
                child.add(line);
            }
        });
        scene.add(model);

        const boundingSphere = box.getBoundingSphere(new THREE.Sphere());
        const objectRadius = boundingSphere.radius;
        const objectCenter = boundingSphere.center;

        const fov = camera.fov * (Math.PI / 180);
        const cameraZ = objectRadius / Math.sin(fov / 2);

        camera.position.set(objectCenter.x, objectCenter.y + objectRadius * 0.4, objectCenter.z + cameraZ * 1.2);
        camera.lookAt(objectCenter);
        controls.target.copy(objectCenter);

        camera.near = Math.max(0.1, cameraZ - objectRadius * 2);
        camera.far = cameraZ + objectRadius * 2;
        camera.updateProjectionMatrix();

        const shadowCameraSize = objectRadius * 2;
        sun.shadow.camera.left = -shadowCameraSize;
        sun.shadow.camera.right = shadowCameraSize;
        sun.shadow.camera.top = shadowCameraSize;
        sun.shadow.camera.bottom = -shadowCameraSize;
        sun.shadow.camera.near = 0.1;
        sun.shadow.camera.far = objectRadius * 4;
        sun.shadow.camera.updateProjectionMatrix();

        controls.update();
        textElement.textContent = 'click/tap to control';
        overlay.style.display = 'flex'; 
        controls.enabled = false;

    }, undefined, function (error) {
        console.error("GLTF load error:", error);
        alert("Failed to load model. Please try again.");
        overlay.style.display = 'none';
    });
}

function showModelSelection() {
    modelSelectionDiv.style.display = 'block';
    overlay.style.display = 'none';
    controls.enabled = false;

    if (modelDropdown.options.length === 0) {
        availableModels.forEach(modelName => {
            const option = document.createElement('option');
            option.value = modelName;
            option.textContent = modelName;
            modelDropdown.appendChild(option);
        });
    }
}

loadModelButton.addEventListener('click', () => {
    const selectedModel = modelDropdown.value;
    if (selectedModel) {
        window.location.hash = selectedModel;
        loadModel(selectedModel);
        modelSelectionDiv.style.display = 'none';
    }
});

const initialModelName = window.location.hash.substring(1);
if (initialModelName && availableModels.includes(initialModelName)) {
    loadModel(initialModelName);
} else {
    showModelSelection();
}

const sunAzimuth = document.getElementById('sunAzimuth');
const sunElevation = document.getElementById('sunElevation');

function updateSunPosition() {
    const azimuthRad = THREE.MathUtils.degToRad(parseFloat(sunAzimuth.value));
    const elevationRad = THREE.MathUtils.degToRad(parseFloat(sunElevation.value));
    const radius = 30;
    const x = radius * Math.cos(elevationRad) * Math.sin(azimuthRad);
    const y = radius * Math.sin(elevationRad);
    const z = radius * Math.cos(elevationRad) * Math.cos(azimuthRad);
    sun.position.set(x, y, z);
}

if (sunAzimuth && sunElevation) {
    sunAzimuth.addEventListener('input', updateSunPosition);
    sunElevation.addEventListener('input', updateSunPosition);
    updateSunPosition();
}

let isRotating = true;
const toggleRotationCheckbox = document.getElementById('toggleRotation');

if (toggleRotationCheckbox) {
    toggleRotationCheckbox.addEventListener('change', () => {
        isRotating = toggleRotationCheckbox.checked;
    });
}

function animate() {
    requestAnimationFrame(animate);
    if (model && isRotating) {
        model.rotation.y += 0.004;
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

overlay.addEventListener('click', () => {
    if (model) {
        controls.enabled = true;
        overlay.style.display = 'none';
    }
});
