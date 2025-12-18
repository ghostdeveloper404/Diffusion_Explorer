const dSlider = document.getElementById("dSlider");
const dtSlider = document.getElementById("dtSlider");
const nSlider = document.getElementById("nSlider");
const distanceInput = document.getElementById("distanceInput");
const results = document.getElementById("results");
const dValue = document.getElementById("dValue");
const dtValue = document.getElementById("dtValue");
const nValue = document.getElementById("nValue");
const msdPlot = document.getElementById("msdPlot");
const diffusionTimePlot = document.getElementById("diffusionTimePlot");
const tempSlider = document.getElementById("tempSlider");
const viscSlider = document.getElementById("viscSlider");
const radiusSlider = document.getElementById("radiusSlider");
const tempValue = document.getElementById("tempValue");
const viscValue = document.getElementById("viscValue");
const radiusValue = document.getElementById("radiusValue");
const comparePlot = document.getElementById("comparePlot")

let D = parseFloat(dSlider.value); // diffusion coefficient in m²/s
let dt = parseFloat(dtSlider.value); // time step in seconds
let N = parseInt(nSlider.value, 10); // number of particles

let step = 0; // animation step counter

let temperature = parseFloat(tempSlider.value);
let viscosity = parseFloat(viscSlider.value);
let ionRadius = parseFloat(radiusSlider.value) * 1e-9; 

let u = Math.random(); 
let v = Math.random();

let random_number = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);

let particles = [];
const particlesMesh = [];

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
    70,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
);

camera.position.z = 10;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// keep the canvas behind UI
renderer.domElement.style.position = "fixed";
renderer.domElement.style.top = "0";
renderer.domElement.style.left = "0";
renderer.domElement.style.zIndex = "-1";



const geometry = new THREE.SphereGeometry(0.05, 16, 16);
const material = new THREE.MeshBasicMaterial({ color: 0xffffff });

const RENDER_SCALE = 1e4; // scale meters to a visible size in the scene

function randomGaussian() {
    // Box-Muller transform for standard normal samples
    let u = 0;
    let v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

// This function clears the scene and creates a new set of particles, usually when the number of particles changes
function resetParticles(newN) {
    // Remove existing particles from scene
    particlesMesh.forEach(mesh => scene.remove(mesh));
    // Clears both array: particlesMesh → visual objects in Three.js scene
    particlesMesh.length = 0;
    // particles → data objects tracking positions .(physics data)
    particles = [];

    for (let i = 0; i < newN; i++) { // Loops newN times to create particles.
        particles.push({ x: 0, y: 0, z: 0 }); // Initializes each particle at the origin and Stores real-world positions (meters).
        const sphere = new THREE.Mesh(geometry, material); // Creates a sphere mesh using shared geometry & material. and Starts at the origin.
        sphere.position.set(0, 0, 0); // Keeps track of the mesh position in Three.js scene (scaled).
        particlesMesh.push(sphere); // Adds the mesh to particlesMesh array for rendering.
        scene.add(sphere); // Adds the mesh to the Three.js scene for rendering.
    }
}

function animate() { // Animation loop for simulating Brownian motion.
    requestAnimationFrame(animate); // Requests the next frame for smooth animation.
    step++; // Increments the simulation steps counter.

    // Every 5 steps, compute Mean Squared Displacement; 
    if (step % 5 === 0) {
        // This reduces computation and improves performance.
        computeMSD(step);
        // every 20 steps, update Mean Squared Displacement plot
        if (step % 20 === 0) plotMSD();
    }

    // Brownian motion update for each particle
    const sigma = Math.sqrt(2 * D * dt); // Standard deviation for displacement based on diffusion coefficient and time step

    // Update each particle's position
    for (let i = 0; i < N; i++) {
        const p = particles[i]; // Current particle position
        // Adds a random Gaussian displacement in each direction
        p.x += sigma * randomGaussian(); // x displacement
        p.y += sigma * randomGaussian(); // y displacement
        p.z += sigma * randomGaussian(); // z displacement
        // Update the corresponding mesh position in the Three.js scene
        particlesMesh[i].position.set(
            p.x * RENDER_SCALE,
            p.y * RENDER_SCALE,
            p.z * RENDER_SCALE
        );
    }
    // Draws the updated particle positions to the screen and Uses the current camera view
    renderer.render(scene, camera);
}

resetParticles(N); // Creates initial particles
animate(); // Starts the animation loop

dSlider.addEventListener("input", () => { // Updates diffusion coefficient D when slider changes
    D = parseFloat(dSlider.value); // in m²/s
    dValue.innerText = Number(D).toExponential(2); // Updates displayed value
    plotDiffusionTime(D); // Updates diffusion time plot
    plotComparison(D, 50); // Updates comparison plot
});

// Updates number of particles N when slider changes
nSlider.addEventListener("input", () => {
    N = parseInt(nSlider.value, 10); // Converts slider value to integer
    nValue.innerText = N; // Updates displayed value
    resetParticles(N); // Resets particles to match new N

});

// Updates time step dt when slider changes
dtSlider.addEventListener("input", () => {
    dt = parseFloat(dtSlider.value); // in seconds
    dtValue.innerText = dt.toFixed(3); // Updates displayed value
});

// Updates temperature when slider changes
tempSlider.addEventListener("input", () => {
    temperature = parseFloat(tempSlider.value); // in Kelvin
    tempValue.innerText = temperature.toFixed(0); // Updates displayed value
});


// Updates viscosity when slider changes
viscSlider.addEventListener("input", () => {
    viscosity = parseFloat(viscSlider.value); // in Pa·s
    viscValue.innerText = viscosity.toFixed(4); // Updates displayed value
});


// Updates ion radius when slider changes
radiusSlider.addEventListener("input", () => {
    ionRadius = parseFloat(radiusSlider.value) * 1e-9; // convert nm → m
    radiusValue.innerText = (ionRadius * 1e9).toFixed(2); // Updates displayed value in nm
});


// Applies physical parameters to recalculate D
document.getElementById("applyParams").onclick = () => {
    updateDfromPhysics(temperature, viscosity, ionRadius); // Recalculates D based on current physical parameters
    dSlider.value = D; // Updates slider to new D
    plotDiffusionTime(D); // Updates diffusion time plot
    plotComparison(D, 50); // Updates comparison plot
};

// Resets physical parameters to default values
function updateDfromPhysics(T, eta, r) {
    const kB = 1.38e-23; // Boltzmann constant
    D = kB * T / (6 * Math.PI * eta * r); // Stokes-Einstein equation
    dValue.innerText = Number(D).toExponential(2); // Updates displayed D value
}


// Calculates diffusion time for a given distance and diffusion coefficient
function diffusionTime(distance, D) {
    return (distance * distance) / (6 * D); // The average time it takes a particle to move a distance distance by diffusion.
}

// Calculates action potential travel time for a given distance and velocity
function apTime(distance, velocity = 50) {
    return distance / velocity; // The time it takes for an action potential to travel a distance at a given velocity (default 50 m/s).
}


// Assigns an arrow function to run when the button is clicked
document.getElementById("calcBtn").onclick = () => {
    // Reads distance input in micrometers
    const um = parseFloat(distanceInput.value);
    // Validates input
    if (Number.isNaN(um)) return; // If the input is not a valid number, the function exits early

    const distance = um * 1e-6; // convert micrometers → meters

    const tDiff = diffusionTime(distance, D); // Calculates diffusion time
    // Assumes constant velocity = 50 (units consistent with meters/second)
    const tAP = apTime(distance, 50); // Calculates action potential time

    // Displays results in the results div
    results.innerHTML = `
        <p><b>Diffusion Time:</b> ${tDiff.toFixed(4)} s</p> // Diffusion → 4 decimals (usually larger)
        <p><b>Action Potential Time:</b> ${tAP.toFixed(6)} s</p> //AP time → 6 decimals (usually much smaller)
    `;

    // Update plots with highlighted point
    plotDiffusionTime(D, um);
    plotComparison(D, 50, um);
};

// Adjusts camera and renderer on window resize
window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight; // Updates camera aspect ratio
    camera.updateProjectionMatrix(); // Applies the aspect ratio change
    renderer.setSize(window.innerWidth, window.innerHeight); // Updates renderer size
});

let msdData = []; // Stores Mean Squared Displacement data over time
let timeData = []; // Stores corresponding time data

// Computes Mean Squared Displacement at the current step
function computeMSD(step) {
    let sum = 0; // Sum of squared displacements
    for (let i = 0; i < N; i++) { // Loops through all particles
        const pos = particles[i]; // Current particle position
        sum += pos.x * pos.x + pos.y * pos.y + pos.z * pos.z; // Adds squared displacement to sum
    }
    msdData.push(sum / N); // Averages squared displacement and stores in msdData
    timeData.push(step * dt); // Stores corresponding time
}

// Plots Mean Squared Displacement vs Time using Plotly
function plotMSD() {
    const trace = { // Data trace for MSD plot
        x: timeData, // Time data
        y: msdData, // Mean Squared Displacement data
        mode: 'lines', // Line mode
        name: 'MSD' // Trace name
    };

    // Layout configuration for the plot
    const layout = {
        title: 'Mean Squared Displacement vs Time',
        xaxis: { title: 'Time (s)' },
        yaxis: { title: 'MSD (m²)' }
    };
    // 
    Plotly.react(msdPlot, [trace], layout);
}
// Plots Diffusion Time vs Distance using Plotly
function plotDiffusionTime(D, highlightUm = null) {
    const distances = []; //  x-axis (distance in µm) 
    const times = []; // y-axis (diffusion time in seconds)
    // 
    for (let um = 1; um <= 2000; um += 10) { // Loops from 1 µm to 2000 µm
        const x = um * 1e-6; // Converts distance to meters for physics
        distances.push(um);
        times.push((x*x) / (6 * D)); // Uses the diffusion formula: t = x² / (6D)
    }
    
    // This produces the parabolic diffusion curve.
    const trace = {
        x: distances,
        y: times,
        mode: 'lines',
        name: 'Diffusion Time'
    };

    const traces = [trace]; // Array to hold all traces for the plot

    // If a specific distance is highlighted, add that point to the plot
    // This block runs only if the user clicked “Calculate”.
    if (highlightUm !== null) { // highlightUm is in µm
        const highlightDist = highlightUm * 1e-6; // µm to meters
        const highlightTime = (highlightDist * highlightDist) / (6 * D); // Computes diffusion time for the selected distance
        // Adds a red marker for the highlighted point
        traces.push({
            x: [highlightUm],
            y: [highlightTime],
            mode: 'markers',
            marker: { size: 12, color: 'red' },
            name: 'Calculated Point'
        });
    }

    const layout = {
        title: 'Diffusion Time vs Distance',
        xaxis: { title: 'Distance (µm)' },
        yaxis: { title: 'Time (seconds)' }
    };
    // Plotly.react updates the plot efficiently
    Plotly.react(diffusionTimePlot, traces, layout); // Reuses the same graph without re-creating it
}
// Initial plot call deferred until Plotly is confirmed loaded


// Plots comparison of Diffusion Time and Action Potential Time vs Distance
function plotComparison(D, velocity = 50, highlightUm = null) { 
    // velocity → speed of active transport and highlightUm → optional distance to highlight
    const distances = []; // x-axis: distance (mm)
    const diffusionTimes = []; // y-axis: time (seconds)
    const apTimes = []; 

    for (let mm = 0.1; mm <= 100; mm += 0.5) { // Distance range: 0.1 mm to 100 mm
        const x = mm / 1000; // mm → meters
        distances.push(mm); // Store distance in mm for x-axis

        diffusionTimes.push((x*x) / (6 * D)); // Diffusion time calculation
        apTimes.push(x / velocity); // Action potential time calculation
    }

    const trace1 = {
        x: distances,
        y: diffusionTimes,
        mode: 'lines',
        name: 'Diffusion'
    };

    const trace2 = {
        x: distances,
        y: apTimes,
        mode: 'lines',
        name: 'Action Potential'
    };

    const traces = [trace1, trace2]; // Array to hold all traces for the plot

    // If a specific distance is highlighted, add that point to the plot
    if (highlightUm !== null) { // highlightUm is in µm
        const highlightMm = highlightUm / 1000; // µm to mm
        const highlightDist = highlightMm / 1000; // mm to m
        const highlightDiffTime = (highlightDist * highlightDist) / (6 * D); // Diffusion time
        const highlightAPTime = highlightDist / velocity; // Action potential time

        // Adds red markers for the highlighted points
        traces.push({
            x: [highlightMm, highlightMm],
            y: [highlightDiffTime, highlightAPTime],
            mode: 'markers',
            marker: { size: 12, color: 'red' },
            name: 'Calculated Points'
        });
    }

    const layout = {
        title: 'Diffusion vs Action Potential Time',
        xaxis: { title: 'Distance (mm)' },
        yaxis: { title: 'Time (seconds)' },
        yaxis2: { overlaying: 'y', side: 'right' }
    };

    Plotly.react(comparePlot, traces, layout);
}
// Initial plot call deferred until Plotly is confirmed loaded

function ensurePlotlyReady(callback) {
    if (window.Plotly) {
        callback();
        return;
    }
    const script = document.createElement('script');
    script.src = 'https://cdn.plot.ly/plotly-2.27.0.min.js';
    script.async = true;
    script.onload = callback;
    script.onerror = () => console.error('Plotly failed to load');
    document.head.appendChild(script);
}

ensurePlotlyReady(() => {
    plotMSD();
    plotDiffusionTime(D);
    plotComparison(D, 50);
});

