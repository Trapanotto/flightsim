let scene, camera, renderer;
let airplane;
let buildings = [];
let speed = 0;
let pitch = 0;
let yaw = 0;
let roll = 0;
let keys = {};
let velocity = new THREE.Vector3(0, 0, 0);
let thrust = 0;
let lift = 0;
let onGround = true;
let minSpeed = 0.4;
let maxThrust = 0.015;
let thrustIncrement = 0.0003;
let groundFriction = 0.997;
let liftCoefficient = 0.008;
let gravity = 0.0006;
let dragCoefficient = 0.002;
let stallAngle = Math.PI / 6;
let optimalAoA = Math.PI / 12;
let engineSound;
let speedDisplay;
let rotationSpeed = 0.015;

// Add these constants at the top
const TERRAIN_SIZE = 2000;
const CITY_SIZE = 400;
const BUILDING_DENSITY = 0.3;

function init() {
    // Create scene
    scene = new THREE.Scene();
    
    // Add skybox
    const loader = new THREE.CubeTextureLoader();
    const skyboxTexture = loader.load([
        'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/cube/skybox/px.jpg',
        'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/cube/skybox/nx.jpg',
        'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/cube/skybox/py.jpg',
        'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/cube/skybox/ny.jpg',
        'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/cube/skybox/pz.jpg',
        'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/cube/skybox/nz.jpg',
    ]);
    scene.background = skyboxTexture;

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // Create airplane with more realistic design
    airplane = new THREE.Group();

    // Fuselage
    const fuselageGeometry = new THREE.CylinderGeometry(0.5, 0.3, 4, 12);
    const fuselageMaterial = new THREE.MeshPhongMaterial({ 
        color: 0xCCCCCC,
        shininess: 100
    });
    const fuselage = new THREE.Mesh(fuselageGeometry, fuselageMaterial);
    fuselage.rotation.x = Math.PI / 2;  // Rotate to point forward
    airplane.add(fuselage);

    // Main wings
    const wingGeometry = new THREE.BoxGeometry(1.2, 0.1, 5);  // Swapped width and depth
    const wingMaterial = new THREE.MeshPhongMaterial({ 
        color: 0xCCCCCC,
        shininess: 100
    });
    const wings = new THREE.Mesh(wingGeometry, wingMaterial);
    wings.position.set(0, 0, 0);
    // Angle the wings slightly upward
    wings.rotation.x = Math.PI * 0.02;
    airplane.add(wings);

    // Tail section (vertical stabilizer)
    const tailFinGeometry = new THREE.BoxGeometry(0.1, 1, 1);  // Adjusted dimensions
    const tailFin = new THREE.Mesh(tailFinGeometry, wingMaterial);
    tailFin.position.set(0, 0.5, 1.8);  // Moved to back
    airplane.add(tailFin);

    // Horizontal stabilizers
    const stabilizerGeometry = new THREE.BoxGeometry(2, 0.1, 0.8);  // Swapped width and depth
    const stabilizer = new THREE.Mesh(stabilizerGeometry, wingMaterial);
    stabilizer.position.set(0, 0.15, 1.8);  // Moved to back
    airplane.add(stabilizer);

    // Cockpit
    const cockpitGeometry = new THREE.SphereGeometry(0.5, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    const cockpitMaterial = new THREE.MeshPhongMaterial({
        color: 0x333333,
        shininess: 150,
        transparent: true,
        opacity: 0.7
    });
    const cockpit = new THREE.Mesh(cockpitGeometry, cockpitMaterial);
    cockpit.position.set(0, 0.3, -1);  // Moved to front
    cockpit.rotation.x = -Math.PI / 2;  // Oriented forward
    airplane.add(cockpit);

    // Engine nacelles
    const nacelleGeometry = new THREE.CylinderGeometry(0.2, 0.2, 0.8, 12);
    const nacelleMaterial = new THREE.MeshPhongMaterial({
        color: 0x666666,
        shininess: 80
    });

    // Left engine
    const leftEngine = new THREE.Mesh(nacelleGeometry, nacelleMaterial);
    leftEngine.position.set(-1.5, -0.2, 0);
    leftEngine.rotation.x = Math.PI / 2;
    airplane.add(leftEngine);

    // Right engine
    const rightEngine = new THREE.Mesh(nacelleGeometry, nacelleMaterial);
    rightEngine.position.set(1.5, -0.2, 0);
    rightEngine.rotation.x = Math.PI / 2;
    airplane.add(rightEngine);

    // Engine intakes (rings)
    const ringGeometry = new THREE.TorusGeometry(0.2, 0.05, 16, 32);
    const ringMaterial = new THREE.MeshPhongMaterial({
        color: 0x333333,
        shininess: 100
    });

    const leftRing = new THREE.Mesh(ringGeometry, ringMaterial);
    leftRing.position.set(-1.5, -0.2, -0.4);
    leftRing.rotation.y = Math.PI / 2;
    airplane.add(leftRing);

    const rightRing = new THREE.Mesh(ringGeometry, ringMaterial);
    rightRing.position.set(1.5, -0.2, -0.4);
    rightRing.rotation.y = Math.PI / 2;
    airplane.add(rightRing);

    // Windows
    const windowMaterial = new THREE.MeshPhongMaterial({
        color: 0x333333,
        shininess: 150
    });

    // Add a row of windows on each side
    for (let i = 0; i < 4; i++) {
        const windowGeometry = new THREE.BoxGeometry(0.1, 0.15, 0.1);
        
        // Left side windows
        const leftWindow = new THREE.Mesh(windowGeometry, windowMaterial);
        leftWindow.position.set(-0.49, 0.2, -0.5 + i * 0.7);
        airplane.add(leftWindow);
        
        // Right side windows
        const rightWindow = new THREE.Mesh(windowGeometry, windowMaterial);
        rightWindow.position.set(0.49, 0.2, -0.5 + i * 0.7);
        airplane.add(rightWindow);
    }

    scene.add(airplane);

    // Enhance lighting for paper material
    const ambientLight = new THREE.AmbientLight(0x606060);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 5, 5);
    scene.add(directionalLight);

    // Add subtle point lights for better paper appearance
    const pointLight1 = new THREE.PointLight(0xffffff, 0.5);
    pointLight1.position.set(0, 10, 0);
    scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0xffffff, 0.3);
    pointLight2.position.set(0, -10, 0);
    scene.add(pointLight2);

    // Create terrain
    const terrainGeometry = new THREE.PlaneGeometry(TERRAIN_SIZE, TERRAIN_SIZE, 100, 100);
    const terrainMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x3c8f3c,
        shininess: 10,
        wireframe: false
    });

    // Modify terrain vertices
    const vertices = terrainGeometry.attributes.position.array;
    for (let i = 0; i < vertices.length; i += 3) {
        const x = vertices[i];
        const z = vertices[i + 2];
        if (Math.abs(x) > 50 || Math.abs(z) > 50) { // Keep runway area flat
            vertices[i + 1] = generateTerrainHeight(x, z);
        }
    }
    terrainGeometry.computeVertexNormals();

    const terrain = new THREE.Mesh(terrainGeometry, terrainMaterial);
    terrain.rotation.x = -Math.PI / 2;
    terrain.position.y = -0.1;
    scene.add(terrain);

    // Add cities
    const cities = [
        { x: -200, z: -200 },
        { x: 200, z: -200 },
        { x: 0, z: -300 },
        { x: -200, z: 200 },
        { x: 200, z: 200 }
    ];

    cities.forEach(city => {
        const cityMesh = generateCity(city.x, city.z, CITY_SIZE);
        scene.add(cityMesh);
    });

    // Add trees (randomly placed outside runway area)
    const treeGeometry = new THREE.ConeGeometry(2, 8, 8);
    const treeMaterial = new THREE.MeshPhongMaterial({ color: 0x2d5a27 });
    const trunkGeometry = new THREE.CylinderGeometry(0.5, 0.5, 2, 8);
    const trunkMaterial = new THREE.MeshPhongMaterial({ color: 0x4a2f1b });

    for (let i = 0; i < 1000; i++) {
        const treeGroup = new THREE.Group();
        const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
        const leaves = new THREE.Mesh(treeGeometry, treeMaterial);
        
        leaves.position.y = 5;
        treeGroup.add(trunk);
        treeGroup.add(leaves);

        let x, z;
        do {
            x = (Math.random() - 0.5) * TERRAIN_SIZE * 0.8;
            z = (Math.random() - 0.5) * TERRAIN_SIZE * 0.8;
        } while (Math.abs(x) < 30 && Math.abs(z) < 70); // Keep away from runway

        const y = generateTerrainHeight(x, z);
        treeGroup.position.set(x, y, z);
        scene.add(treeGroup);
    }

    // Add runway before the ground
    const runwayGeometry = new THREE.PlaneGeometry(20, 100);
    const runwayMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x333333,
        side: THREE.DoubleSide,
        shininess: 30
    });
    const runway = new THREE.Mesh(runwayGeometry, runwayMaterial);
    runway.rotation.x = Math.PI / 2;
    runway.position.y = -0.1; // Slightly above ground to prevent z-fighting
    scene.add(runway);

    // Add runway markings
    const stripeGeometry = new THREE.PlaneGeometry(1, 4);
    const stripeMaterial = new THREE.MeshPhongMaterial({ 
        color: 0xFFFFFF,
        side: THREE.DoubleSide
    });
    
    // Create center line stripes
    for(let i = -40; i <= 40; i += 8) {
        const stripe = new THREE.Mesh(stripeGeometry, stripeMaterial);
        stripe.rotation.x = Math.PI / 2;
        stripe.position.set(0, -0.05, i);
        scene.add(stripe);
    }

    // Add speed indicator
    speedDisplay = document.createElement('div');
    speedDisplay.style.position = 'absolute';
    speedDisplay.style.bottom = '20px';
    speedDisplay.style.left = '20px';
    speedDisplay.style.color = 'white';
    speedDisplay.style.backgroundColor = 'rgba(0,0,0,0.5)';
    speedDisplay.style.padding = '10px';
    speedDisplay.style.fontFamily = 'monospace';
    speedDisplay.style.borderRadius = '5px';
    document.body.appendChild(speedDisplay);

    // Add runway lights
    const runwayLightGeometry = new THREE.BoxGeometry(0.3, 0.1, 0.3);
    const runwayLightMaterial = new THREE.MeshPhongMaterial({ 
        color: 0xFFFF00,
        emissive: 0xFFFF00,
        emissiveIntensity: 0.5
    });

    // Add lights along runway edges
    for(let i = -45; i <= 45; i += 5) {
        for(let side of [-9.5, 9.5]) {
            const light = new THREE.Mesh(runwayLightGeometry, runwayLightMaterial);
            light.position.set(side, 0, i);
            scene.add(light);
        }
    }

    // Add threshold markings
    const thresholdGeometry = new THREE.PlaneGeometry(1, 3);
    const thresholdMaterial = new THREE.MeshPhongMaterial({ 
        color: 0xFFFFFF,
        side: THREE.DoubleSide
    });

    // Add threshold stripes at runway ends
    for(let i = -8; i <= 8; i += 2) {
        const stripe1 = new THREE.Mesh(thresholdGeometry, thresholdMaterial);
        stripe1.rotation.x = Math.PI / 2;
        stripe1.position.set(i, -0.05, -45);
        scene.add(stripe1);

        const stripe2 = new THREE.Mesh(thresholdGeometry, thresholdMaterial);
        stripe2.rotation.x = Math.PI / 2;
        stripe2.position.set(i, -0.05, 45);
        scene.add(stripe2);
    }

    // Initial airplane position on runway
    airplane.position.set(0, 0.5, 40); // Start at the end of runway
    airplane.rotation.y = Math.PI; // Face down the runway
}

document.addEventListener('keydown', (event) => {
    keys[event.key] = true;
});
document.addEventListener('keyup', (event) => {
    keys[event.key] = false;
});

function animate() {
    requestAnimationFrame(animate);

    // Handle thrust with more realistic engine behavior
    if (keys['ArrowUp']) {
        const thrustIncrease = thrustIncrement * (1 - (thrust / maxThrust));
        thrust = Math.min(thrust + thrustIncrease, maxThrust);
    }
    if (keys['ArrowDown']) thrust = Math.max(thrust - thrustIncrement * 1.5, 0);

    const speed = velocity.length();
    const airDensity = Math.exp(-airplane.position.y / 1000);

    // Update speed display
    speedDisplay.textContent = `Speed: ${Math.round(speed * 100)} knots\nAltitude: ${Math.round(airplane.position.y)} ft\nThrust: ${Math.round(thrust/maxThrust * 100)}%`;

    // Calculate thrust vector
    const thrustVector = new THREE.Vector3(0, 0, -1);
    thrustVector.applyQuaternion(airplane.quaternion);
    thrustVector.multiplyScalar(thrust);
    velocity.add(thrustVector);

    if (onGround) {
        // Ground physics
        velocity.multiplyScalar(groundFriction);
        
        // Keep plane on ground until takeoff
        airplane.position.y = 0.5;
        velocity.y = 0;
        
        // Ground handling
        const groundEffect = 1 - (Math.min(speed, minSpeed) / minSpeed);
        const turnRate = Math.min(0.008 * (speed / minSpeed), 0.015) * groundEffect;
        
        if (keys['a']) yaw -= turnRate * (1 + speed/2);
        if (keys['d']) yaw += turnRate * (1 + speed/2);
        
        // Simplified takeoff physics
        if (speed > minSpeed) {
            if (keys['w']) {
                // Rotate the nose up during takeoff
                pitch += rotationSpeed;
                
                // Generate lift based on speed and pitch
                const takeoffLift = speed * speed * liftCoefficient * Math.max(0, pitch);
                velocity.y += takeoffLift;

                // Take off when enough lift is generated
                if (pitch > 0.1 && takeoffLift > gravity * 2) {
                    onGround = false;
                }
            }
        }

        // Reset roll while on ground
        roll *= 0.8;
        
        // Allow pitch to return to neutral when not taking off
        if (!keys['w']) {
            pitch *= 0.95;
        }
    } else {
        // Air physics
        velocity.y -= gravity;

        // Calculate angle of attack (AoA)
        const verticalSpeed = velocity.y;
        const horizontalSpeed = Math.sqrt(velocity.x * velocity.x + velocity.z * velocity.z);
        const angleOfAttack = Math.atan2(-verticalSpeed, horizontalSpeed) + pitch;

        // Stall mechanics
        let liftMultiplier = 1;
        if (Math.abs(angleOfAttack) > stallAngle) {
            liftMultiplier = Math.max(0, 1 - (Math.abs(angleOfAttack) - stallAngle) * 2);
        } else if (Math.abs(angleOfAttack) < optimalAoA) {
            liftMultiplier = angleOfAttack / optimalAoA;
        }

        // Calculate lift and drag
        const liftForce = speed * speed * liftCoefficient * Math.cos(angleOfAttack) * liftMultiplier * airDensity;
        const dragForce = speed * speed * dragCoefficient * (1 + Math.abs(angleOfAttack) * 2) * airDensity;

        // Apply forces
        velocity.y += liftForce;
        velocity.multiplyScalar(1 - dragForce);

        // Flight controls with realistic effectiveness
        const controlEffectiveness = Math.min(speed / minSpeed, 1) * airDensity;
        
        if (keys['w']) pitch -= 0.008 * controlEffectiveness;
        if (keys['s']) pitch += 0.008 * controlEffectiveness;
        if (keys['a']) {
            roll -= 0.012 * controlEffectiveness;
            yaw -= 0.003 * controlEffectiveness * (1 + Math.abs(roll));
        }
        if (keys['d']) {
            roll += 0.012 * controlEffectiveness;
            yaw += 0.003 * controlEffectiveness * (1 + Math.abs(roll));
        }
        if (keys['q']) yaw -= 0.008 * controlEffectiveness;
        if (keys['e']) yaw += 0.008 * controlEffectiveness;

        // More realistic auto-leveling
        if (!keys['a'] && !keys['d']) {
            roll *= 0.985;
        }
        if (!keys['w'] && !keys['s']) {
            pitch *= 0.99;
        }
    }

    // Add air resistance
    velocity.multiplyScalar(0.998);

    // Update position based on velocity
    airplane.position.add(velocity);

    // Check for ground contact
    if (airplane.position.y < 0.5 && !onGround) {
        onGround = true;
        airplane.position.y = 0.5;
        velocity.set(velocity.x * 0.5, 0, velocity.z * 0.5); // Reduce speed on landing
        pitch = 0;
        roll = 0;
    }

    // Apply rotations to airplane
    airplane.rotation.set(pitch, yaw, roll);

    // Update camera position to follow behind airplane
    const cameraOffset = new THREE.Vector3(0, 2, 10);
    cameraOffset.applyQuaternion(airplane.quaternion);
    
    camera.position.copy(airplane.position).add(cameraOffset);
    camera.lookAt(airplane.position);

    renderer.render(scene, camera);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

window.addEventListener('resize', onWindowResize);

// Add these functions after the existing variables
function generateTerrainHeight(x, z) {
    // Simple noise function for terrain height
    return Math.sin(x * 0.02) * Math.cos(z * 0.02) * 10 +
           Math.sin(x * 0.05 + z * 0.03) * 5;
}

function generateCity(centerX, centerZ, size) {
    const buildings = new THREE.Group();
    const buildingTypes = [
        { minHeight: 10, maxHeight: 20, width: 5, depth: 5, color: 0x808080 },
        { minHeight: 20, maxHeight: 40, width: 8, depth: 8, color: 0x707070 },
        { minHeight: 40, maxHeight: 80, width: 12, depth: 12, color: 0x606060 },
    ];

    // Create city blocks
    for (let x = -size/2; x < size/2; x += 20) {
        for (let z = -size/2; z < size/2; z += 20) {
            if (Math.random() < BUILDING_DENSITY) {
                const worldX = centerX + x + (Math.random() - 0.5) * 10;
                const worldZ = centerZ + z + (Math.random() - 0.5) * 10;
                
                // Get terrain height at building position
                const terrainHeight = generateTerrainHeight(worldX, worldZ);
                
                const distanceFromCenter = Math.sqrt(x*x + z*z);
                const buildingType = buildingTypes[
                    distanceFromCenter < size/4 ? 2 :
                    distanceFromCenter < size/3 ? 1 : 0
                ];

                const height = Math.random() * (buildingType.maxHeight - buildingType.minHeight) + buildingType.minHeight;
                const buildingGeometry = new THREE.BoxGeometry(
                    buildingType.width, 
                    height, 
                    buildingType.depth
                );

                const windowTexture = createWindowTexture();
                const buildingMaterial = new THREE.MeshPhongMaterial({ 
                    color: buildingType.color,
                    map: windowTexture,
                    shininess: 50
                });

                const building = new THREE.Mesh(buildingGeometry, buildingMaterial);
                building.position.set(
                    worldX,
                    terrainHeight + height/2, // Place on terrain
                    worldZ
                );
                buildings.add(building);
            }
        }
    }
    return buildings;
}

function createWindowTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    
    // Background
    ctx.fillStyle = '#444444';
    ctx.fillRect(0, 0, 64, 64);
    
    // Windows
    ctx.fillStyle = '#888888';
    for (let y = 4; y < 64; y += 12) {
        for (let x = 4; x < 64; x += 12) {
            ctx.fillRect(x, y, 8, 8);
            // Random lit windows
            if (Math.random() < 0.3) {
                ctx.fillStyle = '#FFFF99';
                ctx.fillRect(x, y, 8, 8);
                ctx.fillStyle = '#888888';
            }
        }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(2, 4);
    return texture;
}

init();
animate(); 