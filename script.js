class TronCircuitboard {
    constructor() {
        this.canvas = document.getElementById('circuitCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.vizCanvas = document.getElementById('nodeVizCanvas');
        this.vizCtx = this.vizCanvas.getContext('2d');
        this.lines = [];
        this.intersections = [];
        this.pulses = [];
        this.grid = 30; // Grid spacing
        this.animationSpeed = 3;  // Increased from 2 for faster movement
        this.maxLines = 40;
        this.textShown = false;
        this.digitalShown = false;
        this.buttonShown = false;
        this.nodesGenerated = false;
        this.nodes = [];
        this.departmentData = null;
        this.isDetailView = false;
        this.currentNode = null;
        this.vizNodes = [];
        this.vizLinks = [];
        this.animationTime = 0; // For time-based animations
        this.canSkipAnimation = true; // Allow skipping animation
        
        this.departmentNames = [
            'School of Performing Arts',
            'School of Visual Arts and Design',
            'English',
            'History',
            'Modern Languages and Literatures',
            'Philosophy',
            'Writing and Rhetoric',
            'Texts and Technology',
            'Themed Experience',
            'Women\'s and Gender Studies'
        ];
        
        // Load department data
        this.loadDepartmentData();
        
        this.setupCanvas();
        this.generateGrid();
        this.animate();
        
        // Setup click-through functionality
        this.setupClickThrough();
        
        // Start line generation after a short delay
        setTimeout(() => {
            this.generateLines();
        }, 500);
        
        // Setup new UI functionality
        this.setupNewUI();
    }
    
    setupClickThrough() {
        // Add click event listener to canvas for skipping animation
        this.canvas.addEventListener('click', (e) => {
            if (this.canSkipAnimation && !this.buttonShown) {
                this.skipToFinalState();
            }
        });
        
        // Also add to document for broader click area
        document.addEventListener('click', (e) => {
            // Only skip if clicking outside of any interactive elements
            if (this.canSkipAnimation && !this.buttonShown && 
                !e.target.closest('.neon-node') && 
                !e.target.closest('#exploreButton') &&
                !e.target.closest('#backButton') &&
                !e.target.closest('.data-card') &&
                !e.target.closest('.viz-area')) {
                this.skipToFinalState();
            }
        });
    }
    
    skipToFinalState() {
        console.log('Skipping to final animation state');
        this.canSkipAnimation = false;
        
        // Complete all line animations instantly
        this.lines.forEach(line => {
            line.progress = 1;
            if (line.branches) {
                line.branches.forEach(branch => {
                    branch.progress = 1;
                });
            }
        });
        
        // Skip all text animations and show final state
        this.textShown = true;
        this.digitalShown = true;
        this.buttonShown = true;
        
        // Show all text elements immediately
        const collegeText = document.getElementById('collegeText');
        const digitalText = document.getElementById('digitalText');
        const artsText = document.getElementById('artsText');
        const humanitiesText = document.getElementById('humanitiesText');
        const button = document.getElementById('exploreButton');
        
        collegeText.classList.add('show');
        digitalText.classList.add('show');
        artsText.style.opacity = '1';
        humanitiesText.style.opacity = '1';
        button.classList.add('show');
        
        // Enable clicking on the main title when skipping to final state
        collegeText.style.pointerEvents = 'auto';
        
        // Add click event listener to button if not already added
        if (!button.hasAttribute('data-listener-added')) {
            button.addEventListener('click', () => {
                this.exploreClicked(button);
            });
            button.setAttribute('data-listener-added', 'true');
        }
    }
    
    async loadDepartmentData() {
        try {
            const response = await fetch('new_data.json');
            this.departmentData = await response.json();
            console.log('Department data loaded successfully');
        } catch (error) {
            console.error('Error loading department data:', error);
        }
    }
    
    setupNewUI() {
        // Wait for DOM to be ready
        setTimeout(() => {
            // Setup main title click - but disable it initially
            const collegeText = document.getElementById('collegeText');
            if (collegeText) {
                console.log('Setting up click handler for college text');
                // Disable pointer events initially
                collegeText.style.pointerEvents = 'none';
                collegeText.addEventListener('click', (e) => {
                    console.log('College text clicked!');
                    e.preventDefault();
                    e.stopPropagation();
                    
                    // Hide the explore button if it's still visible
                    const button = document.getElementById('exploreButton');
                    if (button && button.style.display !== 'none' && this.buttonShown) {
                        button.style.opacity = '0';
                        button.style.transform = 'translateY(50px) scale(0.8)';
                        setTimeout(() => {
                            button.style.display = 'none';
                        }, 800);
                    }
                    
                    // If nodes haven't been generated yet, generate them
                    if (!this.nodesGenerated) {
                        this.generateNodes();
                    } else {
                        // If nodes are already generated, show the college data card
                        this.showDataCard('college-of-arts-and-humanities');
                    }
                });
            } else {
                console.error('College text element not found');
            }
        }, 100);
        
        // Setup back button
        const backButton = document.getElementById('backButton');
        backButton.addEventListener('click', () => {
            this.exitDetailView();
        });
        
        // ESC key to exit detail view
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isDetailView) {
                this.exitDetailView();
            }
        });
    }
    
    setupCanvas() {
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
    }
    
    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        
        // Setup viz canvas
        if (this.vizCanvas) {
            this.vizCanvas.width = this.vizCanvas.offsetWidth;
            this.vizCanvas.height = this.vizCanvas.offsetHeight;
        }
    }
    
    generateGrid() {
        this.gridPoints = [];
        for (let x = 0; x <= this.canvas.width; x += this.grid) {
            for (let y = 0; y <= this.canvas.height; y += this.grid) {
                this.gridPoints.push({ x, y });
            }
        }
    }
    
    generateLines() {
        let edgeCounter = 0; // To ensure even distribution
        const interval = setInterval(() => {
            if (this.lines.length >= this.maxLines) {
                clearInterval(interval);
                this.showText();
                return;
            }
            
            this.createRandomLine(edgeCounter % 4); // Pass the edge to use
            edgeCounter++;
        }, 200);
    }
    
    createRandomLine(forcedEdge = null) {
        // Get the approximate center area where the title appears
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        
        // Choose edge - use forced edge for even distribution, or random
        const edge = forcedEdge !== null ? forcedEdge : Math.floor(Math.random() * 4);
        let startPoint, straightEndPoint, curveEndPoint;
        
        // Limit penetration to 40% of window dimensions
        const maxPenetrationWidth = this.canvas.width * 0.4;
        const maxPenetrationHeight = this.canvas.height * 0.4;
        
        // Create straight segment length (20-40% of the way across screen)
        const straightLength = (0.2 + Math.random() * 0.2) * Math.min(this.canvas.width, this.canvas.height);
        
        switch(edge) {
            case 0: // Top edge - start horizontal, then curve down
                startPoint = {
                    x: Math.random() * this.canvas.width,
                    y: -this.grid * 2 // Start offscreen
                };
                // Straight segment goes down
                straightEndPoint = {
                    x: startPoint.x,
                    y: Math.min(startPoint.y + straightLength, maxPenetrationHeight)
                };
                // Curve toward center area, but limited by penetration
                curveEndPoint = {
                    x: Math.max(maxPenetrationWidth, Math.min(this.canvas.width - maxPenetrationWidth, 
                        centerX + (Math.random() - 0.5) * maxPenetrationWidth)),
                    y: Math.min(straightEndPoint.y + this.grid * (2 + Math.floor(Math.random() * 4)), maxPenetrationHeight)
                };
                break;
            case 1: // Right edge - start vertical, then curve left
                startPoint = {
                    x: this.canvas.width + this.grid * 2, // Start offscreen
                    y: Math.random() * this.canvas.height
                };
                // Straight segment goes left
                straightEndPoint = {
                    x: Math.max(startPoint.x - straightLength, this.canvas.width - maxPenetrationWidth),
                    y: startPoint.y
                };
                // Curve toward center area, but limited by penetration
                curveEndPoint = {
                    x: Math.max(straightEndPoint.x - this.grid * (2 + Math.floor(Math.random() * 4)), 
                        this.canvas.width - maxPenetrationWidth),
                    y: Math.max(maxPenetrationHeight, Math.min(this.canvas.height - maxPenetrationHeight,
                        centerY + (Math.random() - 0.5) * maxPenetrationHeight))
                };
                break;
            case 2: // Bottom edge - start horizontal, then curve up
                startPoint = {
                    x: Math.random() * this.canvas.width,
                    y: this.canvas.height + this.grid * 2 // Start offscreen
                };
                // Straight segment goes up
                straightEndPoint = {
                    x: startPoint.x,
                    y: Math.max(startPoint.y - straightLength, this.canvas.height - maxPenetrationHeight)
                };
                // Curve toward center area, but limited by penetration
                curveEndPoint = {
                    x: Math.max(maxPenetrationWidth, Math.min(this.canvas.width - maxPenetrationWidth,
                        centerX + (Math.random() - 0.5) * maxPenetrationWidth)),
                    y: Math.max(straightEndPoint.y - this.grid * (2 + Math.floor(Math.random() * 4)), 
                        this.canvas.height - maxPenetrationHeight)
                };
                break;
            case 3: // Left edge - start vertical, then curve right
                startPoint = {
                    x: -this.grid * 2, // Start offscreen
                    y: Math.random() * this.canvas.height
                };
                // Straight segment goes right
                straightEndPoint = {
                    x: Math.min(startPoint.x + straightLength, maxPenetrationWidth),
                    y: startPoint.y
                };
                // Curve toward center area, but limited by penetration
                curveEndPoint = {
                    x: Math.min(straightEndPoint.x + this.grid * (2 + Math.floor(Math.random() * 4)), 
                        maxPenetrationWidth),
                    y: Math.max(maxPenetrationHeight, Math.min(this.canvas.height - maxPenetrationHeight,
                        centerY + (Math.random() - 0.5) * maxPenetrationHeight))
                };
                break;
        }
        
        const line = {
            start: startPoint,
            straightEnd: straightEndPoint,
            end: curveEndPoint,
            progress: 0,
            color: this.getRandomColor(),
            width: Math.random() < 0.3 ? 3 : 2,
            glowIntensity: 0.5 + Math.random() * 0.5,
            hasBranch: Math.random() < 0.4, // 40% chance of branching
            branches: [],
            isCurved: true // Flag to indicate this is a curved line
        };
        
        // Create branch if this line should branch (on the straight segment)
        if (line.hasBranch) {
            this.createBranch(line);
        }
        
        this.lines.push(line);
        this.checkIntersections(line);
    }
    
    createBranch(parentLine) {
        // Calculate branch point on the straight segment only (50-80% along straight segment)
        const branchPoint = 0.5 + Math.random() * 0.3;
        const branchStart = {
            x: parentLine.start.x + (parentLine.straightEnd.x - parentLine.start.x) * branchPoint,
            y: parentLine.start.y + (parentLine.straightEnd.y - parentLine.start.y) * branchPoint
        };
        
        // Determine parent's straight direction
        const parentDirection = Math.atan2(
            parentLine.straightEnd.y - parentLine.start.y,
            parentLine.straightEnd.x - parentLine.start.x
        );
        
        // Branch at +/- 30 degrees (π/6 radians) from the straight segment
        const branchAngle = parentDirection + (Math.random() < 0.5 ? Math.PI/6 : -Math.PI/6);
        const branchLength = this.grid * (2 + Math.floor(Math.random() * 4)); // Shorter branches to respect penetration limits
        
        // Apply penetration limits to branch endpoints
        const maxPenetrationWidth = this.canvas.width * 0.4;
        const maxPenetrationHeight = this.canvas.height * 0.4;
        
        let branchEnd = {
            x: branchStart.x + Math.cos(branchAngle) * branchLength,
            y: branchStart.y + Math.sin(branchAngle) * branchLength
        };
        
        // Ensure branch respects penetration limits
        branchEnd.x = Math.max(maxPenetrationWidth, 
                     Math.min(this.canvas.width - maxPenetrationWidth, branchEnd.x));
        branchEnd.y = Math.max(maxPenetrationHeight, 
                     Math.min(this.canvas.height - maxPenetrationHeight, branchEnd.y));
        
        // Calculate the progress along the parent line where branching occurs
        const straightDistance = Math.sqrt(
            Math.pow(parentLine.straightEnd.x - parentLine.start.x, 2) + 
            Math.pow(parentLine.straightEnd.y - parentLine.start.y, 2)
        );
        const curveDistance = Math.sqrt(
            Math.pow(parentLine.end.x - parentLine.straightEnd.x, 2) + 
            Math.pow(parentLine.end.y - parentLine.straightEnd.y, 2)
        );
        const totalDistance = straightDistance + curveDistance;
        const branchParentProgress = (straightDistance * branchPoint) / totalDistance;
        
        const branch = {
            start: branchStart,
            end: branchEnd,
            progress: 0,
            color: parentLine.color,
            width: Math.max(1, parentLine.width - 1),
            glowIntensity: parentLine.glowIntensity * 0.8,
            parentProgress: branchParentProgress,
            isBranch: true,
            isCurved: false // Branches are straight
        };
        
        parentLine.branches.push(branch);
    }
    
    getRandomGridPoint() {
        return this.gridPoints[Math.floor(Math.random() * this.gridPoints.length)];
    }
    
    getRandomColor() {
        const colors = [
            '#ffff00', // Yellow
            '#00ff80', // Green-cyan
            '#80ff00', // Lime green
            '#8000ff', // Purple
            '#ff0080'  // Magenta
        ];
        return colors[Math.floor(Math.random() * colors.length)];
    }
    
    checkIntersections(newLine) {
        this.lines.forEach(existingLine => {
            if (existingLine === newLine) return;
            
            const intersection = this.getLineIntersection(newLine, existingLine);
            if (intersection) {
                // Add intersection point for circle drawing
                this.intersections.push({
                    x: intersection.x,
                    y: intersection.y,
                    intensity: 1,
                    maxRadius: 15,
                    currentRadius: 0,
                    color: this.blendColors(newLine.color, existingLine.color),
                    isIntersection: true // Flag to identify as intersection
                });
                
                // Create pulse effect
                this.createPulse(intersection.x, intersection.y);
            }
        });
    }
    
    getLineIntersection(line1, line2) {
        // For curved lines, check intersections with both segments
        const intersections = [];
        
        // Helper function to check intersection between two straight segments
        const checkSegmentIntersection = (seg1Start, seg1End, seg2Start, seg2End) => {
            const x1 = seg1Start.x, y1 = seg1Start.y;
            const x2 = seg1End.x, y2 = seg1End.y;
            const x3 = seg2Start.x, y3 = seg2Start.y;
            const x4 = seg2End.x, y4 = seg2End.y;
            
            const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
            if (Math.abs(denom) < 0.001) return null;
            
            const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
            const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;
            
            if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
                return {
                    x: x1 + t * (x2 - x1),
                    y: y1 + t * (y2 - y1)
                };
            }
            return null;
        };
        
        // Get all segments for both lines
        const line1Segments = this.getLineSegments(line1);
        const line2Segments = this.getLineSegments(line2);
        
        // Check all segment combinations
        line1Segments.forEach(seg1 => {
            line2Segments.forEach(seg2 => {
                const intersection = checkSegmentIntersection(seg1.start, seg1.end, seg2.start, seg2.end);
                if (intersection) {
                    intersections.push(intersection);
                }
            });
        });
        
        // Return the first intersection found (could be extended to handle multiple)
        return intersections.length > 0 ? intersections[0] : null;
    }
    
    getLineSegments(line) {
        if (!line.isCurved) {
            // Simple straight line
            return [{ start: line.start, end: line.end }];
        } else {
            // Curved line has two segments: straight and curved
            return [
                { start: line.start, end: line.straightEnd },
                { start: line.straightEnd, end: line.end }
            ];
        }
    }
    
    blendColors(color1, color2) {
        // Simple color blending - return the brighter color
        const brightness1 = this.getColorBrightness(color1);
        const brightness2 = this.getColorBrightness(color2);
        return brightness1 > brightness2 ? color1 : color2;
    }
    
    getColorBrightness(color) {
        const hex = color.replace('#', '');
        const r = parseInt(hex.substr(0, 2), 16);
        const g = parseInt(hex.substr(2, 2), 16);
        const b = parseInt(hex.substr(4, 2), 16);
        return (r * 299 + g * 587 + b * 114) / 1000;
    }
    
    createPulse(x, y) {
        this.pulses.push({
            x,
            y,
            radius: 0,
            maxRadius: 30,
            intensity: 1,
            color: '#ffffff'
        });
    }
    
    showText() {
        if (this.textShown) return;
        this.textShown = true;
        
        setTimeout(() => {
            const collegeText = document.getElementById('collegeText');
            collegeText.classList.add('show');
            
            // Show "Digital" text after the main text is fully visible
            setTimeout(() => {
                this.showDigitalText();
            }, 2500);
        }, 1000);
    }
    
    showDigitalText() {
        if (this.digitalShown) return;
        this.digitalShown = true;
        
        const digitalText = document.getElementById('digitalText');
        const artsText = document.getElementById('artsText');
        const humanitiesText = document.getElementById('humanitiesText');
        
        // Hide "Arts" and "Humanities" temporarily for dramatic effect
        artsText.style.opacity = '0.3';
        humanitiesText.style.opacity = '0.3';
        
        digitalText.classList.add('show');
        
        // Show "Arts" and "Humanities" again after Digital is positioned
        setTimeout(() => {
            artsText.style.opacity = '1';
            humanitiesText.style.opacity = '1';
            artsText.style.transition = 'opacity 0.5s ease-in-out';
            humanitiesText.style.transition = 'opacity 0.5s ease-in-out';
        }, 800);
        
        // Show button after Digital text animation completes
        setTimeout(() => {
            this.showButton();
        }, 2000);
    }
    
    showButton() {
        if (this.buttonShown) return;
        this.buttonShown = true;
        this.canSkipAnimation = false; // Disable skipping once button is shown
        
        // Enable clicking on the main title now that the button is shown
        const collegeText = document.getElementById('collegeText');
        if (collegeText) {
            collegeText.style.pointerEvents = 'auto';
        }
        
        const button = document.getElementById('exploreButton');
        button.classList.add('show');
        
        // Add click event listener
        button.addEventListener('click', () => {
            this.exploreClicked(button);
        });
    }
    
    exploreClicked(button) {
        // Remove the button with animation
        button.style.opacity = '0';
        button.style.transform = 'translateY(50px) scale(0.8)';
        
        setTimeout(() => {
            button.style.display = 'none';
            this.generateNodes();
        }, 800);
    }
    
    generateNodes() {
        if (this.nodesGenerated) return;
        this.nodesGenerated = true;
        
        // Enable clicking on the main title now that nodes are being generated
        const collegeText = document.getElementById('collegeText');
        if (collegeText) {
            collegeText.style.pointerEvents = 'auto';
        }
        
        // Keep the main text visible - remove the fadeout
        // const textContainer = document.getElementById('textContainer');
        // textContainer.style.opacity = '0';
        // textContainer.style.transform = 'scale(0.8)';
        // textContainer.style.transition = 'all 1s ease-out';
        
        // Generate nodes for each department
        this.departmentNames.forEach((name, index) => {
            setTimeout(() => {
                this.createNode(name, index);
            }, index * 200);
        });
    }
    
    createNode(name, index) {
        const node = document.createElement('div');
        node.className = 'neon-node';
        node.textContent = name;
        
        // Temporarily add to DOM to measure actual dimensions
        node.style.opacity = '0';
        node.style.position = 'absolute';
        node.style.top = '-9999px';
        document.body.appendChild(node);
        
        // Get actual node dimensions
        const nodeRect = node.getBoundingClientRect();
        const nodeWidth = nodeRect.width;
        const nodeHeight = nodeRect.height;
        
        // Get text area bounds to avoid overlap
        const textContainer = document.getElementById('textContainer');
        const textRect = textContainer.getBoundingClientRect();
        
        // Calculate center point
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        
        // Position nodes in a more intentional circular pattern around the center
        const totalNodes = this.departmentNames.length;
        const baseRadius = Math.min(this.canvas.width, this.canvas.height) * 0.35; // Increased radius
        
        // Calculate angle for this node with even distribution
        const angle = (index / totalNodes) * 2 * Math.PI;
        
        // Add slight variation to avoid perfect rigidity, but keep it controlled
        const radiusVariation = 30; // Reduced variation for more even distribution
        const angleVariation = (Math.PI / totalNodes) * 0.3; // Small angle variation
        
        const finalRadius = baseRadius + (Math.random() - 0.5) * radiusVariation;
        const finalAngle = angle + (Math.random() - 0.5) * angleVariation;
        
        // Calculate initial position
        let x = centerX + Math.cos(finalAngle) * finalRadius;
        let y = centerY + Math.sin(finalAngle) * finalRadius;
        
        // Ensure nodes stay within screen bounds with proper margins
        const margin = 20;
        x = Math.max(margin, Math.min(x, this.canvas.width - nodeWidth - margin));
        y = Math.max(margin, Math.min(y, this.canvas.height - nodeHeight - margin));
        
        // Add extra padding around text area
        const textPadding = 100; // Increased padding for better spacing
        const textArea = {
            left: textRect.left - textPadding,
            right: textRect.right + textPadding,
            top: textRect.top - textPadding,
            bottom: textRect.bottom + textPadding
        };
        
        // If overlapping with text, push node away from center
        if (this.overlapsWithText(x, y, nodeWidth, nodeHeight, textArea)) {
            // Push away from center text along the same angle
            const pushDistance = Math.max(
                (textArea.right - textArea.left) / 2 + 80, // Increased push distance
                (textArea.bottom - textArea.top) / 2 + 80
            );
            
            x = centerX + Math.cos(finalAngle) * pushDistance;
            y = centerY + Math.sin(finalAngle) * pushDistance;
            
            // Ensure still within bounds
            x = Math.max(margin, Math.min(x, this.canvas.width - nodeWidth - margin));
            y = Math.max(margin, Math.min(y, this.canvas.height - nodeHeight - margin));
        }
        
        // Check for overlap with existing nodes and adjust if needed
        let attempts = 0;
        const maxAttempts = 15; // Reduced attempts since we have better initial positioning
        while (attempts < maxAttempts && this.overlapsWithExistingNodes(x, y, nodeWidth, nodeHeight)) {
            // Make smaller adjustments to maintain even distribution
            const adjustAngle = finalAngle + (Math.random() - 0.5) * (Math.PI / 6); // Smaller angle adjustment
            const adjustDistance = 40; // Smaller distance adjustment
            x += Math.cos(adjustAngle) * adjustDistance;
            y += Math.sin(adjustAngle) * adjustDistance;
            
            // Keep within bounds
            x = Math.max(margin, Math.min(x, this.canvas.width - nodeWidth - margin));
            y = Math.max(margin, Math.min(y, this.canvas.height - nodeHeight - margin));
            
            attempts++;
        }
        
        // Set final position
        node.style.left = x + 'px';
        node.style.top = y + 'px';
        node.style.opacity = '0';
        node.style.transform = 'scale(0) rotate(180deg)';
        
        // Animate in
        setTimeout(() => {
            node.style.opacity = '1';
            node.style.transform = 'scale(1) rotate(0deg)';
        }, 100);
        
        // Store node data for interaction
        this.nodes.push({
            element: node,
            name: name,
            x: x,
            y: y,
            width: nodeWidth,
            height: nodeHeight
        });
        
        // Add hover and click effects
        this.addNodeInteractions(node);
    }
    
    overlapsWithExistingNodes(x, y, width, height) {
        const buffer = 30; // Increased buffer for better spacing between larger nodes
        return this.nodes.some(existingNode => {
            return !(x + width + buffer < existingNode.x || 
                     x > existingNode.x + existingNode.width + buffer || 
                     y + height + buffer < existingNode.y || 
                     y > existingNode.y + existingNode.height + buffer);
        });
    }
    
    overlapsWithText(x, y, width, height, textArea) {
        // Check if node rectangle overlaps with text area rectangle
        return !(x + width < textArea.left || 
                 x > textArea.right || 
                 y + height < textArea.top || 
                 y > textArea.bottom);
    }
    
    addNodeInteractions(node) {
        node.addEventListener('click', () => {
            // Move node to center and enter detail view
            const departmentId = this.getDepartmentId(node.textContent);
            this.enterDetailView(node, departmentId);
        });
    }
    
    getDepartmentId(departmentName) {
        // Convert department name to ID format
        return departmentName.toLowerCase()
            .replace(/\s+/g, '-')
            .replace(/'/g, '')
            .replace(/&/g, 'and');
    }
    
    enterDetailView(clickedNode, departmentId) {
        if (this.isDetailView) return;
        this.isDetailView = true;
        this.currentNode = clickedNode;
        
        // Fade out other elements
        this.canvas.classList.add('fade-out');
        document.getElementById('textContainer').classList.add('fade-out');
        
        // Fade out other nodes
        this.nodes.forEach(nodeData => {
            if (nodeData.element !== clickedNode) {
                nodeData.element.classList.add('fade-out');
            } else {
                // Hide the clicked node too - we'll show the department name in the viz
                nodeData.element.classList.add('fade-out');
            }
        });
        
        // Show data card and viz area
        setTimeout(() => {
            this.showDataCard(departmentId);
            this.showVizArea();
            this.createPartnershipVisualization(departmentId);
        }, 400);
    }
    
    exitDetailView() {
        if (!this.isDetailView) return;
        this.isDetailView = false;
        
        // Hide data card and viz area
        this.hideDataCard();
        this.hideVizArea();
        
        // Fade in other elements
        setTimeout(() => {
            this.canvas.classList.remove('fade-out');
            document.getElementById('textContainer').classList.remove('fade-out');
            
            // Fade in all nodes (including the previously clicked one)
            this.nodes.forEach(nodeData => {
                nodeData.element.classList.remove('fade-out');
            });
            
            this.currentNode = null;
        }, 300);
    }
    
    showDataCard(departmentId) {
        if (!this.departmentData) {
            console.warn('Department data not loaded yet');
            return;
        }
        
        const department = this.departmentData.departments.find(d => d.id === departmentId);
        if (!department) {
            console.warn('Department not found:', departmentId);
            return;
        }
        
        const cardContent = document.getElementById('dataCardContent');
        cardContent.innerHTML = this.generateCardContent(department);
        
        const dataCard = document.getElementById('dataCard');
        dataCard.classList.add('show');
    }
    
    hideDataCard() {
        const dataCard = document.getElementById('dataCard');
        dataCard.classList.remove('show');
    }
    
    showVizArea() {
        const vizArea = document.getElementById('vizArea');
        vizArea.classList.add('show');
        
        // Resize viz canvas
        setTimeout(() => {
            this.vizCanvas.width = this.vizCanvas.offsetWidth;
            this.vizCanvas.height = this.vizCanvas.offsetHeight;
        }, 100);
    }
    
    hideVizArea() {
        const vizArea = document.getElementById('vizArea');
        vizArea.classList.remove('show');
    }
    
    createPartnershipVisualization(departmentId) {
        if (!this.departmentData) return;
        
        const department = this.departmentData.departments.find(d => d.id === departmentId);
        if (!department) return;
        
        // Clear previous visualization
        this.vizNodes = [];
        this.vizLinks = [];
        
        const canvasWidth = this.vizCanvas.width;
        const canvasHeight = this.vizCanvas.height;
        const centerX = canvasWidth / 2;
        const centerY = canvasHeight / 2;
        
        // Create central node
        this.vizNodes.push({
            id: department.id,
            name: department.name,
            x: centerX,
            y: centerY,
            type: 'central',
            radius: 20
        });
        
        // Create partner nodes
        const allPartners = [
            ...department.internalPartners.map(p => ({ name: p, type: 'internal' })),
            ...department.externalPartners.map(p => ({ name: p, type: 'external' }))
        ];
        
        // Process degrees to group by main program
        const processedDegrees = this.processDegreeHierarchy(department.degrees || []);
        
        // Combine all peripheral nodes (partners + main degree programs)
        const allPeripheralNodes = [...allPartners, ...processedDegrees.mainPrograms];
        
        if (allPeripheralNodes.length > 0) {
            const angleStep = (Math.PI * 2) / allPeripheralNodes.length;
            const radius = Math.min(canvasWidth, canvasHeight) * 0.3;
            
            allPeripheralNodes.forEach((item, index) => {
                const angle = index * angleStep;
                const x = centerX + Math.cos(angle) * radius;
                const y = centerY + Math.sin(angle) * radius;
                
                const itemId = item.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
                this.vizNodes.push({
                    id: itemId,
                    name: item.name,
                    x: x,
                    y: y,
                    type: item.type,
                    radius: item.type === 'degree' ? 10 : 12,
                    isMainDegree: item.type === 'degree'
                });
                
                // Create link with type information
                this.vizLinks.push({
                    source: department.id,
                    target: itemId,
                    type: item.type,
                    opacity: 0
                });
                
                // Add sub-tracks for this degree if they exist
                if (item.type === 'degree' && processedDegrees.tracks[item.name]) {
                    const tracks = processedDegrees.tracks[item.name];
                    const subRadius = 60; // Distance from main degree node
                    const subAngleStep = (Math.PI * 2) / tracks.length;
                    
                    tracks.forEach((track, trackIndex) => {
                        const subAngle = angle + (trackIndex * subAngleStep);
                        const subX = x + Math.cos(subAngle) * subRadius;
                        const subY = y + Math.sin(subAngle) * subRadius;
                        
                        const trackId = track.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
                        this.vizNodes.push({
                            id: trackId,
                            name: track,
                            x: subX,
                            y: subY,
                            type: 'degree-track',
                            radius: 6,
                            parentId: itemId
                        });
                        
                        // Create link from main degree to track
                        this.vizLinks.push({
                            source: itemId,
                            target: trackId,
                            type: 'degree-track',
                            opacity: 0
                        });
                    });
                }
            });
        }
        
        // Animate links
        setTimeout(() => {
            this.animateVizLinks();
        }, 500);
    }
    
    processDegreeHierarchy(degrees) {
        const mainPrograms = [];
        const tracks = {};
        const processedPrograms = new Set();
        
        degrees.forEach(degree => {
            // Look for pattern: "Program Type: Track Name"
            const colonIndex = degree.indexOf(':');
            
            if (colonIndex > 0) {
                // This is a degree with a track
                const mainProgram = degree.substring(0, colonIndex).trim();
                const trackName = degree.substring(colonIndex + 1).trim();
                
                // Add main program if not already added
                if (!processedPrograms.has(mainProgram)) {
                    mainPrograms.push({ name: mainProgram, type: 'degree' });
                    processedPrograms.add(mainProgram);
                    tracks[mainProgram] = [];
                }
                
                // Add track to the main program
                tracks[mainProgram].push(trackName);
            } else {
                // This is a standalone degree (no tracks)
                if (!processedPrograms.has(degree)) {
                    mainPrograms.push({ name: degree, type: 'degree' });
                    processedPrograms.add(degree);
                }
            }
        });
        
        return { mainPrograms, tracks };
    }
    
    animateVizLinks() {
        let progress = 0;
        const animate = () => {
            progress += 0.02;
            this.vizLinks.forEach(link => {
                link.opacity = Math.min(1, progress);
            });
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        animate();
    }
    
    generateCardContent(department) {
        let html = `<h2 class="card-title">${department.name}</h2>`;
        
        // Featured Project (first highlight with iframe)
        if (department.highlights.length > 0) {
            const featuredProject = department.highlights[0];
            html += `
                <div class="featured-project">
                    <h3 class="featured-title">Featured: ${featuredProject.title}</h3>
                    <iframe 
                        src="${featuredProject.url}" 
                        class="featured-iframe"
                        title="${featuredProject.title}"
                        loading="lazy"
                        sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
                        onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
                    </iframe>
                    <div class="iframe-fallback" style="display: none;">
                        <p>Unable to load preview. <a href="${featuredProject.url}" target="_blank">Visit ${featuredProject.title} directly →</a></p>
                    </div>
                </div>
            `;
        }
        
        // Internal Partners
        if (department.internalPartners.length > 0) {
            html += `
                <div class="card-section">
                    <h3 class="section-title">Internal Partners</h3>
                    <div class="section-content">
                        <ul class="section-list">
                            ${department.internalPartners.map(partner => 
                                `<li>${partner}</li>`
                            ).join('')}
                        </ul>
                    </div>
                </div>
            `;
        }
        
        // External Partners
        if (department.externalPartners.length > 0) {
            html += `
                <div class="card-section">
                    <h3 class="section-title">External Partners</h3>
                    <div class="section-content">
                        <ul class="section-list">
                            ${department.externalPartners.map(partner => 
                                `<li>${partner}</li>`
                            ).join('')}
                        </ul>
                    </div>
                </div>
            `;
        }
        
        // Additional Highlights/Projects (excluding the first one which is featured)
        if (department.highlights.length > 1) {
            html += `
                <div class="card-section">
                    <h3 class="section-title">Additional Projects</h3>
                    <div class="section-content">
                        <ul class="section-list">
                            ${department.highlights.slice(1).map(highlight => 
                                `<li><a href="${highlight.url}" target="_blank" class="highlight-link">${highlight.title}</a></li>`
                            ).join('')}
                        </ul>
                    </div>
                </div>
            `;
        }
        
        // Tech Courses
        if (department.techCourses.length > 0) {
            html += `
                <div class="card-section">
                    <h3 class="section-title">Technology-Focused Courses</h3>
                    <div class="section-content">
                        ${department.techCourses.map(course => 
                            `<span class="tech-course">${course}</span>`
                        ).join('')}
                    </div>
                </div>
            `;
        }
        
        return html;
    }
    
    animate() {
        this.animationTime += 0.05; // Increment time for animations
        
        // Main canvas animation
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw and update lines
        this.lines.forEach(line => {
            if (line.progress < 1) {
                line.progress += 0.04;  // Increased from 0.02 for faster animation
            }
            this.drawLine(line);
            
            // Draw branches if they exist and parent line has progressed enough
            if (line.branches) {
                line.branches.forEach(branch => {
                    if (line.progress >= branch.parentProgress) {
                        if (branch.progress < 1) {
                            branch.progress += 0.04;
                        }
                        this.drawLine(branch);
                        
                        // Draw endpoint circle for completed branches
                        if (branch.progress >= 1) {
                            this.drawEndpointCircle(branch);
                        }
                    }
                });
            }
            
            // Draw endpoint circle for completed main lines
            if (line.progress >= 1) {
                this.drawEndpointCircle(line);
            }
        });
        
        // Draw and update intersections
        this.intersections = this.intersections.filter(intersection => {
            intersection.currentRadius += 0.5;
            intersection.intensity *= 0.98;
            
            if (intersection.intensity > 0.01) {
                this.drawIntersection(intersection);
                // Draw intersection circle
                if (intersection.isIntersection) {
                    this.drawIntersectionCircle(intersection);
                }
                return true;
            }
            return false;
        });
        
        // Draw and update pulses
        this.pulses = this.pulses.filter(pulse => {
            pulse.radius += 1;
            pulse.intensity *= 0.95;
            
            if (pulse.intensity > 0.01 && pulse.radius < pulse.maxRadius) {
                this.drawPulse(pulse);
                return true;
            }
            return false;
        });
        
        // Visualization canvas animation
        if (this.isDetailView && this.vizNodes.length > 0) {
            this.animateVisualization();
        }
        
        requestAnimationFrame(() => this.animate());
    }
    
    animateVisualization() {
        // Clear viz canvas with black background
        this.vizCtx.fillStyle = 'rgba(0, 0, 0, 1)';
        this.vizCtx.fillRect(0, 0, this.vizCanvas.width, this.vizCanvas.height);
        
        // Draw links
        this.vizLinks.forEach(link => {
            const sourceNode = this.vizNodes.find(n => n.id === link.source);
            const targetNode = this.vizNodes.find(n => n.id === link.target);
            
            if (sourceNode && targetNode && link.opacity > 0) {
                this.drawVizLink(sourceNode, targetNode, link.type, link.opacity);
            }
        });
        
        // Draw nodes
        this.vizNodes.forEach(node => {
            this.drawVizNode(node);
        });
        
        // Draw labels
        this.vizNodes.forEach(node => {
            this.drawVizLabel(node);
        });
    }
    
    drawVizLink(source, target, linkType, opacity) {
        this.vizCtx.save();
        this.vizCtx.globalAlpha = opacity;
        
        // Add pulsing effect to line width and glow
        const pulseWidth = 2 + Math.sin(this.animationTime * 3) * 0.5;
        const pulseGlow = 10 + Math.sin(this.animationTime * 2) * 5;
        
        // Set color based on link type
        if (linkType === 'internal') {
            this.vizCtx.strokeStyle = '#ffff00'; // Yellow for internal
            this.vizCtx.shadowColor = '#ffff00';
        } else if (linkType === 'external') {
            this.vizCtx.strokeStyle = '#ff00ff'; // Pink/Magenta for external
            this.vizCtx.shadowColor = '#ff00ff';
        } else if (linkType === 'degree') {
            this.vizCtx.strokeStyle = '#00ff00'; // Green for degrees
            this.vizCtx.shadowColor = '#00ff00';
        } else if (linkType === 'degree-track') {
            this.vizCtx.strokeStyle = '#90ff90'; // Light green for degree tracks
            this.vizCtx.shadowColor = '#90ff90';
        } else {
            this.vizCtx.strokeStyle = '#00ffff'; // Default cyan
            this.vizCtx.shadowColor = '#00ffff';
        }
        
        this.vizCtx.lineWidth = pulseWidth;
        this.vizCtx.shadowBlur = pulseGlow;
        
        this.vizCtx.beginPath();
        this.vizCtx.moveTo(source.x, source.y);
        this.vizCtx.lineTo(target.x, target.y);
        this.vizCtx.stroke();
        
        this.vizCtx.restore();
    }
    
    drawVizNode(node) {
        this.vizCtx.save();
        
        // Add pulsing effect based on animation time
        const pulseIntensity = 0.8 + 0.2 * Math.sin(this.animationTime * 2);
        let shadowBlur = 10;
        
        if (node.type === 'central') {
            this.vizCtx.fillStyle = '#ff6600';
            this.vizCtx.shadowColor = '#ff6600';
            shadowBlur = 20 + 10 * Math.sin(this.animationTime * 1.5);
        } else if (node.type === 'internal') {
            this.vizCtx.fillStyle = '#ffff00'; // Yellow for internal partners
            this.vizCtx.shadowColor = '#ffff00';
            shadowBlur = 10 + 5 * Math.sin(this.animationTime * 2);
        } else if (node.type === 'external') {
            this.vizCtx.fillStyle = '#ff00ff'; // Pink/Magenta for external partners
            this.vizCtx.shadowColor = '#ff00ff';
            shadowBlur = 10 + 5 * Math.sin(this.animationTime * 2);
        } else if (node.type === 'degree') {
            this.vizCtx.fillStyle = '#00ff00'; // Green for degrees
            this.vizCtx.shadowColor = '#00ff00';
            shadowBlur = 8 + 4 * Math.sin(this.animationTime * 2.5);
        } else if (node.type === 'degree-track') {
            this.vizCtx.fillStyle = '#90ff90'; // Light green for degree tracks
            this.vizCtx.shadowColor = '#90ff90';
            shadowBlur = 6 + 3 * Math.sin(this.animationTime * 3);
        } else {
            this.vizCtx.fillStyle = '#00ffff';
            this.vizCtx.shadowColor = '#00ffff';
            shadowBlur = 10;
        }
        
        this.vizCtx.shadowBlur = shadowBlur * pulseIntensity;
        this.vizCtx.strokeStyle = '#ffffff';
        this.vizCtx.lineWidth = node.type === 'central' ? 3 : 2;
        
        // Add slight size pulsing for central node
        const radius = node.type === 'central' ? 
            node.radius + 3 * Math.sin(this.animationTime) : 
            node.radius;
        
        this.vizCtx.beginPath();
        this.vizCtx.arc(node.x, node.y, radius, 0, Math.PI * 2);
        this.vizCtx.fill();
        this.vizCtx.stroke();
        
        this.vizCtx.restore();
    }
    
    drawVizLabel(node) {
        this.vizCtx.save();
        
        // Set label color based on node type
        if (node.type === 'central') {
            // Central department name with blue outline (TRON style)
            this.vizCtx.font = 'bold 20px Orbitron';
            this.vizCtx.textAlign = 'center';
            this.vizCtx.textBaseline = 'middle';
            
            // Draw blue outline
            this.vizCtx.strokeStyle = '#00ffff';
            this.vizCtx.lineWidth = 2;
            this.vizCtx.shadowColor = '#00ffff';
            this.vizCtx.shadowBlur = 10;
            this.vizCtx.strokeText(node.name, node.x, node.y);
            
            // Draw white fill
            this.vizCtx.fillStyle = '#ffffff';
            this.vizCtx.shadowBlur = 0;
            this.vizCtx.fillText(node.name, node.x, node.y);
        } else if (node.type === 'degree') {
            // Degree nodes with green tint and smaller font
            this.vizCtx.fillStyle = '#90ff90';  // Light green for better readability
            this.vizCtx.font = 'bold 14px Orbitron';  // Slightly smaller than partners
            this.vizCtx.shadowColor = '#000000';
            this.vizCtx.shadowBlur = 3;
            this.vizCtx.textAlign = 'center';
            this.vizCtx.textBaseline = 'middle';
            
            // Wrap long text
            const maxWidth = 120;  
            const words = node.name.split(' ');
            let line = '';
            let lines = [];
            
            for (let i = 0; i < words.length; i++) {
                const testLine = line + words[i] + ' ';
                const metrics = this.vizCtx.measureText(testLine);
                const testWidth = metrics.width;
                
                if (testWidth > maxWidth && i > 0) {
                    lines.push(line);
                    line = words[i] + ' ';
                } else {
                    line = testLine;
                }
            }
            lines.push(line);
            
            const lineHeight = 16;
            const startY = node.y + node.radius + 20 - (lines.length - 1) * lineHeight / 2;
            
            lines.forEach((line, index) => {
                this.vizCtx.fillText(line.trim(), node.x, startY + index * lineHeight);
            });
        } else if (node.type === 'degree-track') {
            // Degree track nodes with smaller light green font
            this.vizCtx.fillStyle = '#b0ffb0';  // Very light green for better readability
            this.vizCtx.font = '12px Orbitron';  // Smaller than main degrees
            this.vizCtx.shadowColor = '#000000';
            this.vizCtx.shadowBlur = 2;
            this.vizCtx.textAlign = 'center';
            this.vizCtx.textBaseline = 'middle';
            
            // Wrap long text
            const maxWidth = 100;  
            const words = node.name.split(' ');
            let line = '';
            let lines = [];
            
            for (let i = 0; i < words.length; i++) {
                const testLine = line + words[i] + ' ';
                const metrics = this.vizCtx.measureText(testLine);
                const testWidth = metrics.width;
                
                if (testWidth > maxWidth && i > 0) {
                    lines.push(line);
                    line = words[i] + ' ';
                } else {
                    line = testLine;
                }
            }
            lines.push(line);
            
            const lineHeight = 14;
            const startY = node.y + node.radius + 15 - (lines.length - 1) * lineHeight / 2;
            
            lines.forEach((line, index) => {
                this.vizCtx.fillText(line.trim(), node.x, startY + index * lineHeight);
            });
        } else {
            // Partner nodes with larger white font
            this.vizCtx.fillStyle = '#ffffff';
            this.vizCtx.font = 'bold 16px Orbitron';  // Increased from 12px
            this.vizCtx.shadowColor = '#000000';
            this.vizCtx.shadowBlur = 3;
            this.vizCtx.textAlign = 'center';
            this.vizCtx.textBaseline = 'middle';
            
            // Wrap long text
            const maxWidth = 140;  // Increased to accommodate larger font
            const words = node.name.split(' ');
            let line = '';
            let lines = [];
            
            for (let i = 0; i < words.length; i++) {
                const testLine = line + words[i] + ' ';
                const metrics = this.vizCtx.measureText(testLine);
                const testWidth = metrics.width;
                
                if (testWidth > maxWidth && i > 0) {
                    lines.push(line);
                    line = words[i] + ' ';
                } else {
                    line = testLine;
                }
            }
            lines.push(line);
            
            const lineHeight = 18;  // Increased line height for better readability
            const startY = node.y + node.radius + 25 - (lines.length - 1) * lineHeight / 2;
            
            lines.forEach((line, index) => {
                this.vizCtx.fillText(line.trim(), node.x, startY + index * lineHeight);
            });
        }
        
        this.vizCtx.restore();
    }
    
    drawLine(line) {
        if (line.isCurved) {
            this.drawCurvedLine(line);
        } else {
            // Original straight line drawing for branches
            const currentEnd = {
                x: line.start.x + (line.end.x - line.start.x) * line.progress,
                y: line.start.y + (line.end.y - line.start.y) * line.progress
            };
            
            // Draw glow
            this.ctx.shadowColor = line.color;
            this.ctx.shadowBlur = 10 * line.glowIntensity;
            this.ctx.strokeStyle = line.color;
            this.ctx.lineWidth = line.width;
            this.ctx.globalAlpha = 0.8;
            
            this.ctx.beginPath();
            this.ctx.moveTo(line.start.x, line.start.y);
            this.ctx.lineTo(currentEnd.x, currentEnd.y);
            this.ctx.stroke();
            
            // Draw core line
            this.ctx.shadowBlur = 0;
            this.ctx.globalAlpha = 1;
            this.ctx.lineWidth = line.width * 0.5;
            this.ctx.strokeStyle = '#ffffff';
            
            this.ctx.beginPath();
            this.ctx.moveTo(line.start.x, line.start.y);
            this.ctx.lineTo(currentEnd.x, currentEnd.y);
            this.ctx.stroke();
        }
    }
    
    drawCurvedLine(line) {
        // Calculate total path length for progress mapping
        const straightDistance = Math.sqrt(
            Math.pow(line.straightEnd.x - line.start.x, 2) + 
            Math.pow(line.straightEnd.y - line.start.y, 2)
        );
        const curveDistance = Math.sqrt(
            Math.pow(line.end.x - line.straightEnd.x, 2) + 
            Math.pow(line.end.y - line.straightEnd.y, 2)
        );
        const totalDistance = straightDistance + curveDistance;
        
        // Determine current position based on progress
        const straightProgress = straightDistance / totalDistance;
        let currentEnd;
        
        if (line.progress <= straightProgress) {
            // Still in straight segment
            const segmentProgress = line.progress / straightProgress;
            currentEnd = {
                x: line.start.x + (line.straightEnd.x - line.start.x) * segmentProgress,
                y: line.start.y + (line.straightEnd.y - line.start.y) * segmentProgress
            };
        } else {
            // In curved segment
            const curveProgress = (line.progress - straightProgress) / (1 - straightProgress);
            currentEnd = {
                x: line.straightEnd.x + (line.end.x - line.straightEnd.x) * curveProgress,
                y: line.straightEnd.y + (line.end.y - line.straightEnd.y) * curveProgress
            };
        }
        
        // Draw glow
        this.ctx.shadowColor = line.color;
        this.ctx.shadowBlur = 10 * line.glowIntensity;
        this.ctx.strokeStyle = line.color;
        this.ctx.lineWidth = line.width;
        this.ctx.globalAlpha = 0.8;
        
        this.ctx.beginPath();
        this.ctx.moveTo(line.start.x, line.start.y);
        
        if (line.progress <= straightProgress) {
            // Draw straight segment only
            this.ctx.lineTo(currentEnd.x, currentEnd.y);
        } else {
            // Draw straight segment, then curve
            this.ctx.lineTo(line.straightEnd.x, line.straightEnd.y);
            this.ctx.lineTo(currentEnd.x, currentEnd.y);
        }
        
        this.ctx.stroke();
        
        // Draw core line
        this.ctx.shadowBlur = 0;
        this.ctx.globalAlpha = 1;
        this.ctx.lineWidth = line.width * 0.5;
        this.ctx.strokeStyle = '#ffffff';
        
        this.ctx.beginPath();
        this.ctx.moveTo(line.start.x, line.start.y);
        
        if (line.progress <= straightProgress) {
            // Draw straight segment only
            this.ctx.lineTo(currentEnd.x, currentEnd.y);
        } else {
            // Draw straight segment, then curve
            this.ctx.lineTo(line.straightEnd.x, line.straightEnd.y);
            this.ctx.lineTo(currentEnd.x, currentEnd.y);
        }
        
        this.ctx.stroke();
    }
    
    drawEndpointCircle(line) {
        // Draw open circle at the end of completed lines
        this.ctx.save();
        
        // Set styles
        this.ctx.strokeStyle = line.color;
        this.ctx.lineWidth = line.width * 0.8;
        this.ctx.shadowColor = line.color;
        this.ctx.shadowBlur = 8 * line.glowIntensity;
        this.ctx.globalAlpha = 0.9;
        
        // Draw outer glow circle
        this.ctx.beginPath();
        this.ctx.arc(line.end.x, line.end.y, 4, 0, Math.PI * 2);
        this.ctx.stroke();
        
        // Draw inner bright circle
        this.ctx.shadowBlur = 0;
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.lineWidth = line.width * 0.4;
        this.ctx.globalAlpha = 1;
        
        this.ctx.beginPath();
        this.ctx.arc(line.end.x, line.end.y, 3, 0, Math.PI * 2);
        this.ctx.stroke();
        
        this.ctx.restore();
    }
    
    drawIntersectionCircle(intersection) {
        // Draw permanent circle at intersection point
        this.ctx.save();
        
        // Set styles based on intersection color
        this.ctx.strokeStyle = intersection.color;
        this.ctx.lineWidth = 2;
        this.ctx.shadowColor = intersection.color;
        this.ctx.shadowBlur = 10;
        this.ctx.globalAlpha = Math.min(1, intersection.intensity * 2); // Fade in/out with intersection
        
        // Draw outer glow circle
        this.ctx.beginPath();
        this.ctx.arc(intersection.x, intersection.y, 5, 0, Math.PI * 2);
        this.ctx.stroke();
        
        // Draw inner bright circle
        this.ctx.shadowBlur = 0;
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.lineWidth = 1;
        this.ctx.globalAlpha = Math.min(1, intersection.intensity * 3);
        
        this.ctx.beginPath();
        this.ctx.arc(intersection.x, intersection.y, 3, 0, Math.PI * 2);
        this.ctx.stroke();
        
        this.ctx.restore();
    }
    
    drawIntersection(intersection) {
        const gradient = this.ctx.createRadialGradient(
            intersection.x, intersection.y, 0,
            intersection.x, intersection.y, intersection.maxRadius
        );
        gradient.addColorStop(0, intersection.color + 'ff');
        gradient.addColorStop(0.3, intersection.color + '80');
        gradient.addColorStop(1, intersection.color + '00');
        
        this.ctx.fillStyle = gradient;
        this.ctx.globalAlpha = intersection.intensity;
        
        this.ctx.beginPath();
        this.ctx.arc(intersection.x, intersection.y, intersection.currentRadius, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.globalAlpha = 1;
    }
    
    drawPulse(pulse) {
        this.ctx.strokeStyle = pulse.color;
        this.ctx.lineWidth = 2;
        this.ctx.globalAlpha = pulse.intensity;
        
        this.ctx.beginPath();
        this.ctx.arc(pulse.x, pulse.y, pulse.radius, 0, Math.PI * 2);
        this.ctx.stroke();
        
        this.ctx.globalAlpha = 1;
    }
}

// Initialize the animation when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new TronCircuitboard();
});
