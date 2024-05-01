// Set up scene, camera, renderer
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.getElementById('myContainer').appendChild(renderer.domElement);

const listener = new THREE.AudioListener();
camera.add(listener);

const audioUrls = [
    'https://dl.dropboxusercontent.com/scl/fi/b10yqo42r8biq6h0jtzge/Obj_1.wav?rlkey=csonvb9b19yp2zp4lx6elpum9&st=8ee4pnvr&dl=1',
    'https://dl.dropboxusercontent.com/scl/fi/ryuw8v9r9hdqns5nkvxlg/Obj_2.wav?rlkey=e63n5f44f8q18wks1b1g3wc3e&st=is889qj9&dl=1',
    'https://dl.dropboxusercontent.com/scl/fi/87oonsmphqwjdxrtuehlg/Obj_3.wav?rlkey=wnmhjl4ex6fgnv4fth3cw93av&st=vlk6haqc&dl=1',
    'https://dl.dropbox.com/scl/fi/1z3svxo35cibx41o7aqo4/Obj_4.wav?rlkey=gjvzblj98te5poofg0g5p1l3c&st=ks08aca6&dl=1'
];
const modelIDs = ['1', '2', '3', '4'];
const audioSources = [];
const audioLoader = new THREE.AudioLoader();

// Create OrbitControls
const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.screenSpacePanning = false;
controls.maxPolarAngle = Math.PI / 2;
// Disable camera controls initially
controls.enabled = false;

// Load the GLTF model with animations
const loader = new THREE.GLTFLoader();
let mixer;
const clock = new THREE.Clock(); // Clock for managing animation frame updates
loader.load('https://uploads-ssl.webflow.com/62585c8f3b855d70abac2fff/66326e3f7f1ec3bbab6e5e54_court-w-ball.glb.txt', function (gltf) {
    const court = gltf.scene;
    scene.add(court);

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

    // Animation Mixer
    mixer = new THREE.AnimationMixer(court);
    gltf.animations.forEach((clip) => {
        mixer.clipAction(clip).play();
    });

    // Attach audio to specific models
    court.traverse((child) => {
        const index = modelIDs.indexOf(child.name);
        if (index !== -1) {
            audioLoader.load(audioUrls[index], (buffer) => {
                const audio = new THREE.PositionalAudio(listener);
                audio.setBuffer(buffer);
                audio.setRefDistance(1);
                child.add(audio);
                audioSources.push(audio);
            });
        }
    });
}, undefined, function (error) {
    console.error('An error happened during the loading of the GLB:', error);
});


// Set camera field of view
const fov = 45; // Example value
camera.fov = fov;
camera.updateProjectionMatrix();

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

// Button event listeners for camera control
document.getElementById('btn1').addEventListener('click', () => setCameraPosition(1));
document.getElementById('btn2').addEventListener('click', () => setCameraPosition(2));
document.getElementById('btn3').addEventListener('click', () => setCameraPosition(3));

function setCameraPosition(position) {
    const startPosition = camera.position.clone();
    let targetPosition;
    switch (position) {
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

// Animation function
function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    if (mixer) mixer.update(delta);
    controls.update();
    renderer.render(scene, camera);
}

// Function to handle window resize
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Event listener for window resize
window.addEventListener('resize', onWindowResize);

// Initial resize call
onWindowResize();

// Function to stop and reset the experience
function stopExperience() {
    if (mixer) {
        mixer.stopAllAction(); // Stop all actions
        mixer._actions.forEach(action => {
            action.stop();
            action.reset(); // Reset action to initial state
        });
    }

    // Stop all audio
    audioSources.forEach(audio => audio.stop());

    // Pause the video
    const videoElement = document.getElementById('videoElement');
    if (videoElement) {
        videoElement.pause();
        videoElement.currentTime = 0; // Reset to the start
    }

    // Disable camera controls
    controls.enabled = false;

    // Show the start button again
    document.getElementById('startButton').style.display = 'block';
}

let experienceTimer;
const totalDuration = 26; // Or set this dynamically based on your animation duration

function startExperience() {
    // Reset the timer
    clearTimeout(experienceTimer);
    experienceTimer = setTimeout(stopExperience, totalDuration * 1000);

    // Restart animations
    if (mixer) {
        mixer.stopAllAction(); // Stop all current actions
        mixer.update(0); // Reset time

        mixer._actions.forEach(action => {
            action.reset(); // Reset action
            action.play();  // Restart the action
          
        });
    }

    // Play the video
    const videoElement = document.getElementById('videoElement');
    if (videoElement) {
        videoElement.play();
    }

    controls.enabled = false;
    animate(); // Start animation loop
}

// Start button click event listener
document.getElementById('startButton').addEventListener('click', function () {
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
    }

    startExperience();
    this.style.display = 'none'; // Hide the start button
});

// Handle visibility change
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        stopExperience();
    }
});
