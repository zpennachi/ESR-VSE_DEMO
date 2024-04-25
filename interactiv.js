// Set up scene, camera, renderer
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.getElementById('myContainer').appendChild(renderer.domElement);
let isAudioPlaying = false; // Global variable to track audio playback state

// Add an audio listener to the camera
const listener = new THREE.AudioListener();
camera.add(listener);


const audioUrls = [
    'https://dl.dropboxusercontent.com/scl/fi/1z3svxo35cibx41o7aqo4/Obj_4.wav?rlkey=gjvzblj98te5poofg0g5p1l3c&st=ks08aca6&dl=1',
    'https://dl.dropboxusercontent.com/scl/fi/87oonsmphqwjdxrtuehlg/Obj_3.wav?rlkey=wnmhjl4ex6fgnv4fth3cw93av&st=vlk6haqc&dl=1',
    'https://dl.dropboxusercontent.com/scl/fi/ryuw8v9r9hdqns5nkvxlg/Obj_2.wav?rlkey=e63n5f44f8q18wks1b1g3wc3e&st=is889qj9&dl=1',
    'https://dl.dropboxusercontent.com/scl/fi/b10yqo42r8biq6h0jtzge/Obj_1.wav?rlkey=csonvb9b19yp2zp4lx6elpum9&st=8ee4pnvr&dl=1'
];
const audioPositions = [
    new THREE.Vector3(2, 0, -8),
    new THREE.Vector3(-1, 0, 8),
    new THREE.Vector3(1, 0, 8),
    new THREE.Vector3(-1, 0, 8)
];
const audioLoader = new THREE.AudioLoader();
const audioSources = [];

// Load audio sources and attach them to spheres
audioUrls.forEach((url, index) => {
    audioLoader.load(url, (buffer) => {
        const audio = new THREE.PositionalAudio(listener);
        audio.setBuffer(buffer);
        audio.setRefDistance(1);
        audio.play(); // Play the audio once it's loaded
        audioSources.push(audio); // Add the loaded audio to the audioSources array
    }, undefined, (err) => {
        console.error('Failed to load audio:', err);
    });
});

// Create OrbitControls
const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.screenSpacePanning = false;
controls.maxPolarAngle = Math.PI / 2;
// Disable camera controls initially
controls.enabled = false;

// Set the desired x, y, z coordinates for the orbit point
const targetX = 0;
const targetY = 2;
const targetZ = 10;

// Set the target coordinates for the OrbitControls
controls.target.set(targetX, targetY, targetZ);

// Set the camera position based on your preferred values
const cameraX = 0;
const cameraY = 0;
const cameraZ = 10;

// Set the camera position
camera.position.set(cameraX, cameraY, cameraZ);
setCameraPosition(1); // Set initial camera position to follow button 1

// Load the court model
const loader = new THREE.GLTFLoader();
loader.load('https://uploads-ssl.webflow.com/62585c8f3b855d70abac2fff/661ff82bac0f1347a21cbaf6_branded-court-optimized.glb.TXT', function(gltf) {
    const court = gltf.scene;
    scene.add(court);

    // Set camera position based on the bounding box of the court model
    const box = new THREE.Box3().setFromObject(court);
    const center = box.getCenter(new THREE.Vector3());
    camera.position.set(center.x +0 , center.y + 2, center.z + 0);

    // Find the position of the basket in the scene
    let basketPosition = new THREE.Vector3();
    court.traverse((child) => {
        if (child.name === 'Basket') {
            basketPosition = child.getWorldPosition(basketPosition);
        }
    });

    // Set the basket position as the target for the camera
    camera.lookAt(basketPosition);
}, undefined, function(error) {
    console.error('An error happened during the loading of the GLB:', error);
});

// Add lights to the scene
const ambientLight = new THREE.AmbientLight(0xffffff, 1);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(0, 20, 10);
scene.add(directionalLight);

const pointLight1 = new THREE.PointLight(0xFFA500, 0.4, 30); // Orange/Gold
pointLight1.position.set(0, 10, -25); // Above one basket
scene.add(pointLight1);

const pointLight2 = new THREE.PointLight(0xFFA500, 0.4, 30); // Orange/Gold
pointLight2.position.set(0, 10, 25); // Above the other basket
scene.add(pointLight2);

const pointLight3 = new THREE.PointLight(0x0000FF, 0.4, 30); // Blue
pointLight3.position.set(-10, 10, 0); // Left side of the center
scene.add(pointLight3);

const pointLight4 = new THREE.PointLight(0x0000FF, 0.4, 30); // Blue
pointLight4.position.set(10, 10, 0); // Right side of the center
scene.add(pointLight4);

// Button event listeners
document.getElementById('btn1').addEventListener('click', () => {
    setCameraPosition(1);
});

document.getElementById('btn2').addEventListener('click', () => {
    setCameraPosition(2);
});

document.getElementById('btn3').addEventListener('click', () => {
    setCameraPosition(3);
});

// Function to set camera positions smoothly
function setCameraPosition(position) {
    const startPosition = camera.position.clone(); // Get current camera position
    let targetPosition;

    switch(position) {
        case 1:
            targetPosition = new THREE.Vector3(0, 0, 2);
            break;
        case 2:
            targetPosition = new THREE.Vector3(-8, 0, 2);
            break;
        case 3:
            targetPosition = new THREE.Vector3(8, 0, 2);
            break;
    }

    const duration = 2000; // Transition duration in milliseconds
    let currentTime = 0;

    function easeInOutQuad(t) {
        return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    }

    function update() {
        currentTime += 16; // Assuming 60fps, 1000ms/60fps ≈ 16ms

        if (currentTime >= duration) {
            camera.position.copy(targetPosition); // Ensure the camera reaches the exact target position
            controls.enabled = false; // Disable camera controls after changing position
            return;
        }

        const t = currentTime / duration;
        const easedT = easeInOutQuad(t); // Apply easing function
        camera.position.lerpVectors(startPosition, targetPosition, easedT);
        requestAnimationFrame(update);
    }
    update();
}


// Set camera field of view
const fov = 65; // Example value
camera.fov = fov;
camera.updateProjectionMatrix();

// Start button click event listener
document.getElementById('startButton').addEventListener('click', function() {
    const audioContext = THREE.AudioContext.getContext();

    // Check if the audio context is suspended, then resume it
    if (audioContext.state === 'suspended') {
        audioContext.resume().then(() => {
            console.log("Audio Context resumed successfully!");
            // Play all audio sources after resuming the context
            audioSources.forEach(audio => {
                if (!audio.isPlaying) {
                    audio.play();
                }
            });

            // Play the video
            videoElement.play();
        }).catch(error => {
            console.error("Error resuming audio context:", error);
        });
    } else {
        // If not suspended, just play everything
        audioSources.forEach(audio => {
            if (!audio.isPlaying) {
                audio.play();
            }
        });
        // Play the video
        videoElement.play();
    }

    // Enable camera controls after starting
    controls.enabled = true;

    // Start animation loop
    animate();
    
    // Hide the start button
    this.style.display = 'none';
});






function animate() {
    requestAnimationFrame(animate);
    controls.update(); // This will adjust the camera based on user interaction
    renderer.render(scene, camera);
    
    // Update audio listener's position to match the camera
    const cameraPosition = camera.getWorldPosition(new THREE.Vector3());
    listener.position.copy(cameraPosition);
}
// Function to handle window resize
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Event listener for window resize
window.addEventListener('resize', onWindowResize);

// Set initial size
onWindowResize();




// Function to create a sphere with audio source attached
function createAudioSphere(position, audioUrl) {
    const sphereGeometry = new THREE.SphereGeometry(0.5, 32, 32);
    const sphereMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);

    // Set position
    sphere.position.copy(position);

    // Create an object to hold the audio source
    const audioHolder = new THREE.Object3D();
    sphere.add(audioHolder);

    // Add audio source
    const audio = new THREE.PositionalAudio(listener);
    const audioLoader = new THREE.AudioLoader();
    audioLoader.load(audioUrl, (buffer) => {
        audio.setBuffer(buffer);
        audio.setRefDistance(1);
        audioHolder.add(audio); // Attach audio to the audio holder
        audio.play(); // You may want to control when to play the audio based on user interaction
    }, undefined, (err) => {
        console.error('Failed to load audio:', err);
    });

    scene.add(sphere);

    return sphere;
}


// Add spheres with audio sources
const audioSpheres = [];
for (let i = 0; i < audioUrls.length; i++) {
    const sphere = createAudioSphere(audioPositions[i], audioUrls[i]);
    audioSpheres.push(sphere);
}

// Sample animation for spheres to move around the court
function animateAudioSpheres() {
    for (let i = 0; i < audioSpheres.length; i++) {
        // Sample movement - you can customize this animation according to your needs
        const time = Date.now() * 0.001;
        const amplitude = 5;
        const frequency = 1;
        const positionOffset = new THREE.Vector3(
            Math.sin(frequency * time + i) * amplitude,
            0,
            Math.cos(frequency * time + i) * amplitude
        );
        audioSpheres[i].position.copy(audioPositions[i]).add(positionOffset);
        audioSpheres[i].children[0].position.copy(positionOffset); // Update audio position
    }

    // Request next frame
    requestAnimationFrame(animateAudioSpheres);
}



// Start animation loop for audio spheres
animateAudioSpheres();

// Reset button click event listener
document.getElementById('resetButton').addEventListener('click', function() {
    // Reset camera position
    setCameraPosition(1); // Reset camera position to default
    
    // Stop and reset audio sources
    audioSources.forEach(audio => {
        audio.stop(); // Stop playing audio
        audio.isPlaying = false; // Update the 'isPlaying' state
        if (audio.source) {
            audio.source.stop(); // Stop the Web Audio API source node
            audio.source.disconnect(); // Disconnect the source node
            delete audio.source; // Remove the source node reference
        }
    });
    
    // Hide the reset button
    this.style.display = 'none';
    
    // Show the start button again
    document.getElementById('startButton').style.display = 'block';
});
