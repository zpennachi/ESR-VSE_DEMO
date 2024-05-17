        import { ARButton } from 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/jsm/webxr/ARButton.js';

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
        videoScreen.scale.set(-1, 1, 1);

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

            req.onload = function () {
                if (this.status === 200) {
                    var videoBlob = this.response;
                    var vid = URL.createObjectURL(videoBlob); // IE10+
                    video.src = vid;
                    console.log('Video preloaded!');
                }
            };
            req.onerror = function () {
                console.log('Error on preloading video.');
            };

            req.send();
        }

        preloadVideo('https://raw.githubusercontent.com/zpennachi/ESR-VSE_DEMO/main/NBA_AllStar_Demo_Clip%20(2).mp4');

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

        const modelIDs = ['1', '2', '3', '4', '5', '6', '7', 'basket1', 'basket2'];

        const audioSources = [];
        const audioLoader = new THREE.AudioLoader();

        // Load the GLTF model with animations
        const loader = new THREE.GLTFLoader();
        let mixer;
        const clock = new THREE.Clock(); // Clock for managing animation frame updates
        loader.load('https://uploads-ssl.webflow.com/62585c8f3b855d70abac2fff/66464fdbb596dafdc5a82406_rtvse-asd.glb.txt', function (gltf) {
            court = gltf.scene;
            court.scale.set(0.1, 0.1, 0.1); // Set the scale to 0.1 for AR
            scene.add(court);

            // Animation Mixer
            mixer = new THREE.AnimationMixer(court);
            gltf.animations.forEach((clip) => {
                mixer.clipAction(clip).play();
            });
            court.traverse((child) => {
                const index = modelIDs.indexOf(child.name);
                if (index !== -1) {
                    audioLoader.load(audioUrls[index], (buffer) => {
                        const audio = new THREE.PositionalAudio(listener);
                        audio.setBuffer(buffer);
                        audio.setRefDistance(1);
                        audio.setDistanceModel('exponential');
                        audio.setRolloffFactor(2.5);
                        child.add(audio);
                        audioSources.push(audio);

                        // Increment the loaded count and check if all audio is loaded
                        audioLoadedCount++;
                        if (audioLoadedCount === audioUrls.length) {
                            allAudioLoaded = true;
                            checkAllLoaded();
                        }
                    }, undefined, function (error) {
                        console.error(`Error loading audio for model ${child.name}:`, error);
                    });
                }
            });
            // Once the model is loaded, set the flag and check all resources
            isGLBLoaded = true;
            checkAllLoaded();
        }, undefined, function (error) {
            console.error('An error happened during the loading of the GLB:', error);
        });

        // Load non-spatialized audio track
        const nonSpatialAudioUrl = 'https://raw.githubusercontent.com/zpennachi/ESR-VSE_DEMO/main/AllStar_Game_FOH.mp3';
        const nonSpatialAudio = new THREE.Audio(listener);
        const nonSpatialAudioLoader = new THREE.AudioLoader();

        nonSpatialAudioLoader.load(nonSpatialAudioUrl, (buffer) => {
            // Lower the volume here (0.5 is half volume, adjust as needed)
            nonSpatialAudio.setVolume(1);

            listener.add(nonSpatialAudio); // Add audio to the listener
            audioSources.push(nonSpatialAudio); // Add to list of audio sources for management
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

        function checkAllLoaded() {
            console.log(`GLB Loaded: ${isGLBLoaded}, Video Loaded: ${isVideoLoaded}, All Audio Loaded: ${allAudioLoaded}`);
            if (isGLBLoaded && isVideoLoaded && allAudioLoaded) {
                // Enable the start button only if it exists
                const startButton1 = document.getElementById('startButton1');
                if (startButton1) {
                    startButton1.disabled = false;
                    console.log("Start Button 1 enabled.");
                } else {
                    console.log("Start Button 1 not found!");
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

                // Render the scene with the camera
                renderer.render(scene, camera);
            });
        }

        function onSessionStarted(session) {
            // Start the AR session
            session.requestReferenceSpace('local').then(function (referenceSpace) {
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
            } else {
                video.play();
            }
            animate(); // Start animation loop
        }

        // Create a 3D restart button
        const restartButtonGeometry = new THREE.BoxGeometry(0.2, 0.1, 0.05);
        const restartButtonMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
        const restartButton = new THREE.Mesh(restartButtonGeometry, restartButtonMaterial);
        restartButton.position.set(0, 1, -2); // Adjust position as needed
        scene.add(restartButton);

        // Add an event listener to the restart button
        const raycaster = new THREE.Raycaster();
        const mouse = new THREE.Vector2();
        function onMouseClick(event) {
            // Calculate mouse position in normalized device coordinates (-1 to +1) for both components
            mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
            mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

            raycaster.setFromCamera(mouse, camera);

            // Calculate objects intersecting the picking ray
            const intersects = raycaster.intersectObjects(scene.children);
            for (let i = 0; i < intersects.length; i++) {
                if (intersects[i].object === restartButton) {
                    // Restart the experience when the button is clicked
                    stopExperience();
                    startExperience();
                }
            }
        }
        window.addEventListener('click', onMouseClick, false);

        // HTML reset button functionality
        document.getElementById('resetButton').addEventListener('click', () => {
            stopExperience();
            startExperience();
        });

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

        // Start button click event listeners
        document.getElementById('startButton1').addEventListener('click', startButtonFunctionality);

        document.addEventListener('visibilitychange', function () {
            if (document.hidden) {
                stopExperience(); // Stop the experience when the tab is not in focus
            }
        });

        window.addEventListener('resize', onWindowResize, false);
