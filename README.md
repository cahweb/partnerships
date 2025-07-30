# College of Digital Arts and Humanities - TRON Animation

A full-screen HTML5 canvas animation featuring TRON-style circuitboard lines that light up when they intersect, followed by animated text revealing "College of Digital Arts and Humanities".

## Features

- **TRON-style Circuit Animation**: Dynamic generation of glowing circuit lines across the screen
- **Interactive Intersections**: Lines light up and pulse when they cross each other
- **Animated Text Reveal**: "College of Arts and Humanities" drops in from the top, followed by "Digital" appearing in a bold TRON-esque font
- **Interactive Navigation**: Click "Explore" to reveal department nodes spread across the circuit background
- **Department Nodes**: 10 glowing neon nodes representing different schools and departments
- **Responsive Design**: Adapts to different screen sizes
- **GitHub Pages Ready**: Optimized for deployment on GitHub Pages

## Live Demo

Visit the live demo at: `https://[your-username].github.io/DAH`

## Local Development

1. Clone this repository
2. Open `index.html` in your web browser
3. Enjoy the TRON-style animation!

## Deployment on GitHub Pages

1. Go to your repository settings
2. Scroll down to "Pages" section
3. Select "Deploy from a branch"
4. Choose "main" branch and "/ (root)" folder
5. Click "Save"
6. Your site will be available at `https://[your-username].github.io/DAH`

## Technologies Used

- HTML5 Canvas
- Vanilla JavaScript
- CSS3 with Google Fonts (Orbitron)
- Responsive design principles

## Animation Sequence

1. **Circuit Generation**: Lines are randomly generated across a grid system
2. **Intersection Detection**: When lines cross, they create glowing intersection points
3. **Pulse Effects**: Intersections trigger expanding pulse animations
4. **Text Animation**: After sufficient circuit density, text animations begin
5. **Final Reveal**: "Digital" text appears with a dramatic scale and rotation effect
6. **Interactive Exploration**: Click "Explore" button to reveal department navigation nodes
7. **Department Nodes**: Individual department nodes appear with hover and click interactions

## Customization

You can modify various aspects of the animation:

- **Grid spacing**: Change `this.grid` value in `script.js`
- **Colors**: Modify the color array in `getRandomColor()` method
- **Animation speed**: Adjust `this.animationSpeed` and interval timings
- **Text content**: Update the HTML and CSS for different text
- **Font styles**: Change the Google Fonts import and CSS font-family

## Browser Compatibility

This animation works in all modern browsers that support HTML5 Canvas and CSS3 animations.
