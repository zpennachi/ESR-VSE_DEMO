// Set up scene, camera, renderer
const scene = new THREE.Scene();

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
const listener = new THREE.AudioListener();

const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 1000);

// Set initial camera position and rotation
const initialCameraPosition = new THREE.Vector3(-8, 1, 8); // Example initial position
const initialCameraRotation = new THREE.Euler(0, THREE.MathUtils.degToRad(-90), 0); // Example initial rotation

camera.position.copy(initialCameraPosition);
camera.rotation.copy(initialCameraRotation);
camera.updateProjectionMatrix(); // Update projection matrix if needed

// Attach audio listener to the camera
camera.add(listener);
const audioUrls = [ 'https://raw.githubusercontent.com/zpennachi/ESR-VSE_DEMO/raw/main/Obj_1%20(1).mp3',
    'https://raw.githubusercontent.com/zpennachi/ESR-VSE_DEMO/raw/main/Obj_2%20(1).mp3',
    'https://raw.githubusercontent.com/zpennachi/ESR-VSE_DEMO/raw/main/Obj_3%20(1).mp3',
    'https://raw.githubusercontent.com/zpennachi/ESR-VSE_DEMO/raw/main/Obj_4%20(1).mp3'
];
const modelIDs = ['1', '2', '3', '4'];
const audioSources = [];
const audioLoader = new THREE.AudioLoader();


// Load the GLTF model with animations
const loader = new THREE.GLTFLoader();
let mixer;
const clock = new THREE.Clock(); // Clock for managing animation frame updates
loader.load('https://uploads-ssl.webflow.com/62585c8f3b855d70abac2fff/6631423fe7e0db20d7b8321b_court-w-animation.glb.txt', function (gltf) {
    const court = gltf.scene;
    scene.add(court);

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

// Camera positions and rotations
const cameraPositions = [
    { position: new THREE.Vector3(8, 1, 4), rotation: new THREE.Euler(0, THREE.MathUtils.degToRad(102.857), 0) },
       { position: new THREE.Vector3(0, 1, 3), rotation: new THREE.Euler(0, THREE.MathUtils.degToRad(-180), 0) },
      { position: new THREE.Vector3(-8, 1, 8), rotation: new THREE.Euler(0, THREE.MathUtils.degToRad(-90), 0) },
    { position: new THREE.Vector3(0, 1, 12), rotation: new THREE.Euler(0, THREE.MathUtils.degToRad(-0), 0) }
];

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

// Animation function
function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    if (mixer) mixer.update(delta);
    renderer.render(scene, camera);
}

// Easing function: easeInOutQuad
function easeInOutQuad(t) {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

const cameraControls = document.getElementById('cameraControls'); // Get the parent element

const buttonLabels = ['Left', 'Center', 'Courtside', 'Basket']; // Button labels

// Add click event listeners to position buttons
cameraPositions.forEach((pos, index) => {
    const button = document.createElement('button');
    button.textContent = buttonLabels[index]; // Set button label
    button.classList.add('interactive-btn'); // Add the class "interactive-btn"
    button.onclick = () => {
        const targetPosition = pos.position;
        const targetRotation = pos.rotation;
        transitionCameraPosition(targetPosition, targetRotation, 2000, easeInOutQuad); // Adjust duration and easing function as needed
        // Reset click counts
        leftClickCount = 0;
        rightClickCount = 0;
    };
    cameraControls.appendChild(button); // Append button directly to cameraControls element
});




// Function to smoothly transition between camera positions
function transitionCameraPosition(targetPosition, targetRotation, duration, easingFunction) {
    const startPosition = camera.position.clone();
    const startRotation = camera.rotation.clone();
    const startQuaternion = new THREE.Quaternion().setFromEuler(startRotation);
    const targetQuaternion = new THREE.Quaternion().setFromEuler(targetRotation);
    const startTime = Date.now();

    // Default easing function if not provided
    easingFunction = easingFunction || function(t) { return t; };

    function update() {
        const now = Date.now();
        const elapsed = now - startTime;
        let t = Math.min(1, elapsed / duration);
        t = easingFunction(t);

        camera.position.lerpVectors(startPosition, targetPosition, t);
        camera.quaternion.slerp(targetQuaternion, t);

        if (t < 1) {
            requestAnimationFrame(update);
        }
    }

    update();
}

let leftClickCount = 0;
let rightClickCount = 0;

// Function to rotate the camera left with smooth transition
function rotateCameraLeftSmooth() {
    if (leftClickCount < 2) {
        console.log("Rotate left clicked");
        const rotationIncrement = THREE.MathUtils.degToRad(20); // Increase rotation increment as needed
        const rotationAxis = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion); // Calculate rotation axis based on camera orientation
        camera.rotateOnAxis(rotationAxis, rotationIncrement); // Rotate the camera
        normalizeRotation(); // Ensure rotation stays within [0, 2π)
        leftClickCount++;
        rightClickCount = Math.max(-2, rightClickCount - 1); // Decrement right click count, but limit it to -2
    }
}

// Function to rotate the camera right with smooth transition
function rotateCameraRightSmooth() {
    if (rightClickCount < 2) {
        console.log("Rotate right clicked");
        const rotationIncrement = THREE.MathUtils.degToRad(20); // Increase rotation increment as needed
        const rotationAxis = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion); // Calculate rotation axis based on camera orientation
        camera.rotateOnAxis(rotationAxis, -rotationIncrement); // Rotate the camera in the opposite direction
        normalizeRotation(); // Ensure rotation stays within [0, 2π)
        rightClickCount++;
        leftClickCount = Math.min(2, leftClickCount - 1); // Decrement left click count, but limit it to 2
    }
}



// Event listener for left arrow button with smooth transition
document.getElementById('leftArrow').addEventListener('click', rotateCameraLeftSmooth);

// Event listener for right arrow button with smooth transition
document.getElementById('rightArrow').addEventListener('click', rotateCameraRightSmooth);

// Function to normalize rotation to ensure it remains within [0, 2 * Math.PI)
function normalizeRotation() {
    camera.rotation.y = (camera.rotation.y + Math.PI * 4) % (Math.PI * 2);
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

    // Show the start buttons again
    document.querySelectorAll('.startButton').forEach(button => {
        button.style.display = 'block';
    });
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
    animate(); // Start animation loop
}

// Start button click event listeners
document.getElementById('startButton1').addEventListener('click', startButtonFunctionality);
document.getElementById('startButton2').addEventListener('click', startButtonFunctionality);

// Functionality for start buttons
function startButtonFunctionality() {
    // Hide all elements with the class name 'startButton' after any start button is clicked
    document.querySelectorAll('.startButton').forEach(button => {
        button.style.display = 'none';
    });

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
}

// Handle visibility change
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        stopExperience();
    }
});

