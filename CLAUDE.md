# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

This is a static web application showcasing the College of Digital Arts and Humanities with TRON-style animations. It's a pure frontend application with no build process or backend components.

## Development Commands

### Running the Application
- **Development**: Open `index.html` directly in a web browser
- **No build/compile step required** - this is a static site
- **No package manager** - no npm, yarn, or other dependency management

### Testing
- No testing framework is currently implemented
- Manual testing only via browser

## Architecture & Structure

### Technology Stack
- **HTML5** - Canvas API for animations
- **Vanilla JavaScript** (ES6+) - No frameworks
- **CSS3** - Animations and transitions
- **Static Assets** - JPG images for departments

### Core Application Structure
The entire application logic is contained in the `TronCircuitboard` class in script.js:

1. **Animation Pipeline**:
   - Circuit line generation and rendering
   - Intersection detection and pulse effects
   - Progressive reveal: circuit → text → button → department nodes

2. **State Management**:
   - All state managed within the TronCircuitboard class
   - Animation stages tracked via boolean flags (`textShown`, `digitalShown`, etc.)

3. **Data Model**:
   - Department data stored in `new_data.json`
   - Each department contains: degrees, partners, highlights, technologies

4. **Key Components**:
   - Canvas-based circuit animation system
   - Department node navigation
   - Popup/modal system for department details
   - Data visualization with interactive filtering

### File Organization
```
/home/lucid/DAH/
├── index.html          # Main entry point
├── script.js           # Core application logic (TronCircuitboard class)
├── styles.css          # All styling and animations
├── new_data.json       # Department data structure
└── *.jpg              # Department images
```

### Key Methods in TronCircuitboard Class
- `generateLines()` - Creates random circuit paths
- `drawCircuit()` - Main animation loop
- `checkIntersections()` - Detects and animates line crossings
- `showDepartmentNodes()` - Reveals interactive department navigation
- `createVisualization()` - Builds network graph for department connections

## GitHub Pages Deployment
The application is designed for GitHub Pages deployment:
- Set Pages source to main branch, root folder
- Access at: `https://[username].github.io/DAH`

## Customization Points
- Grid spacing: `this.grid` in script.js
- Animation colors: `getRandomColor()` method
- Animation timing: `this.animationSpeed`
- Department data: Edit `new_data.json`