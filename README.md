
# Diffusion Explorer

Interactive Neural Diffusion Simulator

## Concept

A web-based simulation tool that visualizes why diffusion fails for long-distance neural signaling, making the **<x²> = 2Dt** law intuitive.

## Key Features

- **3D Visualization** of ion diffusion at different scales (synapse, dendrite, axon)
- **Time Calculator** showing how long it takes for neurotransmitters/ions to diffuse specific distances
- **Comparison Tool** between diffusion vs. action potential propagation speeds
- **Parameter Explorer** showing how temperature, viscosity, and ion size affect diffusion constant D

## Installation

```bash
git clone https://github.com/yourusername/diffusion-explorer.git
cd diffusion-explorer
```

## Usage

Open `http://localhost:3000` in your browser. Use the UI controls to adjust diffusion parameters and observe real-time visualization updates.

## Technologies

- **library**: Three.js
- **Simulation**: Custom diffusion algorithms
- **Visualization**: WebGL
