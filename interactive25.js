import { ARButton } from 'https://unpkg.com/three@0.140.0/examples/jsm/webxr/ARButton.js';

let isGLBLoaded = false;
let isVideoLoaded = false;
let allAudioLoaded = false;
let audioLoadedCount = 0;
let court;

// VIDEO STUFF
const video = document.createElement('video');
video.crossOrigin = "anonymous";
video.preload = 'auto';  
video.load(); 
video.muted = true;

// Create a texture from the video element
const videoTexture = new THREE.VideoTexture(video);
videoTexture.minFilter = THREE.LinearFilter;
videoTexture.magFilter = THREE.LinearFilter;
videoTexture.format = THREE.RGBAFormat;

// Create a plane geometry that will use the video texture
const geometry = new THREE.PlaneGeometry(4, 2.25); // 16:9 aspect ratio, adjust size as needed
const material = new THREE.MeshBasicMaterial({ map: videoTexture, side: THREE.DoubleSide });
const videoScreen = new THREE.Mesh(geometry, material);
// Set position and rotation of the video screen relative to the camera
videoScreen.position.set(0, 2, -5); // Adjust position as needed
videoScreen.rotation.y = Math.PI; // Adjust rotation if needed

// Set up scene, camera, renderer
const scene = new THREE.Scene();
scene.add(videoScreen);
const renderer = new THREE.WebGLRenderer({ alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
const listener = new THREE.AudioListener();
const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 1000);
renderer.xr.setReferenceSpaceType('local-floor'); // or 'local-floor' based on your needs
renderer.xr.enabled = true;
document.body.appendChild(ARButton.createButton(renderer, { requiredFeatures: ['hit-test'] }));
scene.background = null;
// Set initial camera position and rotation to match the "center" position
const initialCameraPosition = new THREE.Vector3(0, 2, 6); // Center position
const initialCameraRotation = new THREE.Euler(0, THREE.MathUtils.degToRad(0), 0); // Center rotation
camera.position.copy(initialCameraPosition);
camera.rotation.copy(initialCameraRotation);
camera.updateProjectionMatrix(); // Update projection matrix if needed
camera.add(listener); // Attach audio listener to the camera

function preloadVideo(url) {
    const req = new XMLHttpRequest();
    req.open('GET', url, true);
    req.responseType = 'blob';

    req.onload = function() {
        if (this.status === 200) {
            var videoBlob = this.response;
            var vid = URL.createObjectURL(videoBlob); // IE10+
            video.src = vid;
            console.log('Video preloaded!');
        }
    };
    req.onerror = function() {
        console.log('Error on preloading video.');
    };

    req.send();
}

preloadVideo('https://cdn.jsdelivr.net/gh/zpennachi/ESR-VSE_DEMO@main/NBA_AllStar_Demo_Clip%20(2).mp4');

const audioUrls = [
    'https://raw.githubusercontent.com/zpennachi/ESR-VSE_DEMO/main/Ball_Stem.mp3',
    'https://raw.githubusercontent.com/zpennachi/ESR-VSE_DEMO/main/Player1_Stem.mp3',
    'https://raw.githubusercontent.com/zpennachi/ESR-VSE_DEMO/main/Player2_Stem.mp3',
    'https://raw.githubusercontent.com/zpennachi/ESR-VSE_DEMO/main/Player3_Stem.mp3',
    'https://raw.githubusercontent.com/zpennachi/ESR-VSE_DEMO/main/Player4_Stem.mp3',
    'https://raw.githubusercontent.com/zpennachi/ESR-VSE_DEMO/main/Player5_Stem.mp3',
    'https://raw.githubusercontent.com/zpennachi/ESR-VSE_DEMO/main/Player6_Stem.mp3',
    'https://raw.githubusercontent.com/zpennachi/ESR-VSE_DEMO/main/NetL_Stem.mp3',
    'https://raw.githubusercontent.com/zpennachi/ESR-VSE_DEMO/main/NetR_Stem.mp3' // Add the URL for basket1
];

const modelIDs = ['1', '2', '3', '4', '5', '6', '7', 'basket1', 'basket2']; // Add 'basket1' to the modelIDs array

const audioSources = [];
const audioLoader = new THREE.AudioLoader();

let ball;
let net1;
let net2;
let net1Audio;
let net2Audio;

// Load the GLTF model with animations
const loader = new THREE.GLTFLoader();
let mixer;
const clock = new THREE.Clock(); // Clock for managing animation frame updates
loader.load('https://uploads-ssl.webflow.com/62585c8f3b855d70abac2fff/66462cf580fe660530359d84_nets-fix.glb.txt', function(gltf) {
    const court = gltf.scene;
    scene.add(court);

    court.traverse((child) => {
        const index = modelIDs.indexOf(child.name);
        if (index !== -1) {
            audioLoader.load(audioUrls[index], (buffer) => {
                if (child.name === 'basket1' || child.name === 'basket2') {
                    // Use non-spatialized audio for the nets
                    const audio = new THREE.Audio(listener);
                    audio.setBuffer(buffer);
                    audio.setVolume(0); // Start with volume 0
                    listener.add(audio);
                    audioSources.push(audio);

                    if (child.name === 'basket1') {
                        net1 = child;
                        net1Audio = audio;
                    } else if (child.name === 'basket2') {
                        net2 = child;
                        net2Audio = audio;
                    }
                } else {
                    // Use spatialized audio for other objects
                    const audio = new THREE.PositionalAudio(listener);
                    audio.setBuffer(buffer);
                    audio.setRefDistance(1);
                    audio.setDistanceModel('exponential');
                    audio.setRolloffFactor(2.5);
                    child.add(audio);
                    audioSources.push(audio);

                    if (child.name === '1') {
                        ball = child;
                    }
                }

                // Increment the loaded count and check if all audio is loaded
                audioLoadedCount++;
                if (audioLoadedCount === audioUrls.length) {
                    allAudioLoaded = true;
                    checkAllLoaded();
                }
            }, undefined, function(error) {
                console.error(`Error loading audio for model ${child.name}:`, error);
            });
        }
    });

    // Animation Mixer
    mixer = new THREE.AnimationMixer(court);
    gltf.animations.forEach((clip) => {
        mixer.clipAction(clip).play();
    });

    // Once the model is loaded, set the flag and check all resources
    isGLBLoaded = true;
    checkAllLoaded();
}, undefined, function(error) {
    console.error('An error happened during the loading of the GLB:', error);
});

// Load non-spatialized audio track
const nonSpatialAudioUrl = 'https://raw.githubusercontent.com/zpennachi/ESR-VSE_DEMO/main/AllStar_Game_FOH.mp3'; 
const nonSpatialAudio = new THREE.Audio(listener);
const nonSpatialAudioLoader = new THREE.AudioLoader();

nonSpatialAudioLoader.load(nonSpatialAudioUrl, (buffer) => {
    nonSpatialAudio.setBuffer(buffer);
    nonSpatialAudio.setLoop(true); // Set to loop if desired
    nonSpatialAudio.setVolume(0.2); // Set the desired volume
    listener.add(nonSpatialAudio); // Add audio to the listener
    audioSources.push(nonSpatialAudio); // Add to list of audio sources for management
    console.log("FOH audio loaded and added to listener");
}, undefined, function(error) {
    console.error('Error loading FOH audio:', error);
});

// Camera positions and rotations
const cameraPositions = [
    { position: new THREE.Vector3(5, 1, 0), rotation: new THREE.Euler(0, THREE.MathUtils.degToRad(90), 0) },
    { position: new THREE.Vector3(0, 2, 6), rotation: new THREE.Euler(0, THREE.MathUtils.degToRad(0), 0) },
    { position: new THREE.Vector3(-4, .5, 3), rotation: new THREE.Euler(0, THREE.MathUtils.degToRad(-45), 0) },
    { position: new THREE.Vector3(-1, 1, 0), rotation: new THREE.Euler(0, THREE.MathUtils.degToRad(90), 0) }
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

function checkAllLoaded() {
    console.log(`GLB Loaded: ${isGLBLoaded}, Video Loaded: ${isVideoLoaded}, All Audio Loaded: ${allAudioLoaded}`);
    if (isGLBLoaded && isVideoLoaded && allAudioLoaded) {
        // Target the first start button
        var startButton1 = document.getElementById('startButton1');
        if (startButton1) {
            startButton1.disabled = false; // Enable the start button only if it exists
            console.log("Start Button 1 enabled.");
        } else {
            console.log("Start Button 1 not found!");
        }

        // Target the second start button
        var startButton2 = document.getElementById('startButton2');
        if (startButton2) {
            startButton2.disabled = false; // Enable the start button only if it exists
            console.log("Start Button 2 enabled.");
        } else {
            console.log("Start Button 2 not found!");
        }

        console.log("All assets loaded. Ready to start!");
    }
}

video.addEventListener('canplaythrough', () => {
    isVideoLoaded = true;
    checkAllLoaded();
});
if (video.readyState >= 4) {  // HAVE_ENOUGH_DATA
    isVideoLoaded = true;
    checkAllLoaded();
}

// Function to update net audio based on the distance to the ball
function updateNetAudio() {
    if (ball && net1 && net2) {
        const ballPosition = ball.position;
        const net1Position = net1.position;
        const net2Position = net2.position;

        const distanceToNet1 = ballPosition.distanceTo(net1Position);
        const distanceToNet2 = ballPosition.distanceTo(net2Position);

        const maxDistance = 2; // Maximum distance for full volume
        const minDistance = 0.5; // Minimum distance for no volume

        // Calculate volume based on distance (linear interpolation)
        const volumeNet1 = Math.max(0, Math.min(1, 1 - (distanceToNet1 - minDistance) / (maxDistance - minDistance)));
        const volumeNet2 = Math.max(0, Math.min(1, 1 - (distanceToNet2 - minDistance) / (maxDistance - minDistance)));

        // Set the volume for net audios
        net1Audio.setVolume(volumeNet1);
        net2Audio.setVolume(volumeNet2);
    }
}

function animate() {
    renderer.setAnimationLoop(() => {
        // Calculate the time delta
        const delta = clock.getDelta();
        
        // Update the animation mixer if it's been initialized
        if (mixer) {
            mixer.update(delta);
        }
        
        // Ensure the video texture updates if the video has enough data
        if (video && video.readyState >= video.HAVE_CURRENT_DATA) {
            videoTexture.needsUpdate = true;
        }

        // Update net audio volumes based on ball proximity
        updateNetAudio();

        // Render the scene with the camera
        renderer.render(scene, camera);
    });
}

// Easing function: easeInOutQuad
function easeInOutQuad(t) {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

const cameraControls = document.getElementById('cameraControls'); // Get the parent element

const buttonLabels = ['Under Basket', 'Center', 'Courtside', 'Three Point']; // Button labels

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

function onSessionStarted(session) {
    // Start the AR session
    session.requestReferenceSpace('local').then(function(referenceSpace) {
        renderer.xr.setReferenceSpaceType('local');
        renderer.xr.setReferenceSpace(referenceSpace);
        session.requestAnimationFrame(onAnimationFrame);
    });
}

function onAnimationFrame(time, frame) {
    const referenceSpace = frame.session.refSpace;
    const viewerPose = frame.getViewerPose(referenceSpace);

    if (viewerPose) {
        const viewerPosition = viewerPose.transform.position;
        const viewerRotation = viewerPose.transform.orientation;

        // Offset the spawn point in front of the user and down at their waist
        const offset = new THREE.Vector3(0, -2, -2); // 2 feet down, 2 feet in front
        offset.applyQuaternion(viewerRotation);
        const spawnPoint = viewerPosition.clone().add(offset);

        // Set the position of the model
        court.position.copy(spawnPoint);
    }

    renderer.render(scene, camera);
    frame.session.requestAnimationFrame(onAnimationFrame);
}

// Start AR session
renderer.xr.addEventListener('sessionstart', onSessionStarted);

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

function stopExperience() {
    if (mixer) {
        mixer.stopAllAction(); // Stop all animations
        mixer._actions.forEach(action => {
            action.stop();
            action.reset(); // Reset actions to their initial state
        });
    }

    // Stop all audio
    audioSources.forEach(audio => audio.stop());

    // Pause and reset the video
    video.pause();
    video.currentTime = 0;

    // Show the start buttons again
    document.querySelectorAll('.startButton').forEach(button => {
        button.style.display = 'block';
    });
}

let experienceTimer;
const totalDuration = 120; // Or set this dynamically based on your animation duration

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
            action.play(); // Restart the action
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

function startButtonFunctionality() { 
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
            // Play the video
            video.play();
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
        video.play();
    }

    startExperience();
}

document.addEventListener('visibilitychange', function() {
    if (document.hidden) {
        stopExperience(); // Stop the experience when the tab is not in focus
    }
});
