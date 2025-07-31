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
                        // If nodes are already generated, enter detail view for the college
                        const collegeTextElement = document.getElementById('digitalText');
                        if (collegeTextElement) {
                            this.enterDetailView(collegeTextElement, 'college-of-arts-and-humanities');
                        }
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
            // ESC key to close popup
            if (e.key === 'Escape') {
                this.closePopup();
            }
        });
        
        // Setup popup functionality
        this.setupPopup();
    }
    
    setupPopup() {
        // Setup close button
        const closeButton = document.getElementById('popupClose');
        closeButton.addEventListener('click', () => {
            this.closePopup();
        });
        
        // Setup overlay click to close
        const overlay = document.getElementById('popupOverlay');
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                this.closePopup();
            }
        });
    }
    
    openPopup(title, url) {
        const overlay = document.getElementById('popupOverlay');
        const titleElement = document.getElementById('popupTitle');
        const iframe = document.getElementById('popupIframe');
        const fallback = document.getElementById('popupFallback');
        const directLink = document.getElementById('popupDirectLink');
        
        // Set title and URL
        titleElement.textContent = title;
        iframe.src = url;
        iframe.title = title;
        directLink.href = url;
        
        // Reset fallback state
        fallback.style.display = 'none';
        iframe.style.display = 'block';
        
        // Setup iframe error handling
        iframe.onerror = () => {
            iframe.style.display = 'none';
            fallback.style.display = 'block';
        };
        
        // Show popup
        overlay.classList.add('show');
        
        // Prevent body scrolling
        document.body.style.overflow = 'hidden';
    }
    
    closePopup() {
        const overlay = document.getElementById('popupOverlay');
        const iframe = document.getElementById('popupIframe');
        
        // Hide popup
        overlay.classList.remove('show');
        
        // Clear iframe to stop loading
        setTimeout(() => {
            iframe.src = '';
        }, 300);
        
        // Restore body scrolling
        document.body.style.overflow = 'hidden'; // Keep as hidden since main page doesn't scroll
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
        
        // Setup popup link event handlers
        cardContent.addEventListener('click', (e) => {
            const target = e.target.closest('.highlight-link, .featured-preview');
            if (target) {
                e.preventDefault();
                const title = target.getAttribute('data-popup-title');
                const url = target.getAttribute('data-popup-url');
                if (title && url) {
                    this.openPopup(title, url);
                }
            }
        });
        
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
        
        // Define smaller margins to maximize usable space
        const margin = 50; // Reduced from 80 to use more space
        const usableWidth = canvasWidth - (margin * 2);
        const usableHeight = canvasHeight - (margin * 2);
        
        // Create central node
        this.vizNodes.push({
            id: department.id,
            name: department.name,
            x: centerX,
            y: centerY,
            type: 'central',
            radius: 25
        });
        
        // Use much more of the available space - maximize radii with percentages
        const maxRadius = Math.min(usableWidth, usableHeight) / 2;
        const degreeRadius = maxRadius * 0.3; // Start closer for degrees
        const internalRadius = maxRadius * 0.65; // Significantly spread out
        const externalRadius = maxRadius * 0.9; // Use almost full canvas
        
        // Process degrees to group by main program
        const processedDegrees = this.processDegreeHierarchy(department.degrees || []);
        
        // Separate different types for individual placement
        const degreeNodes = processedDegrees.mainPrograms;
        const internalNodes = department.internalPartners.map(p => ({ name: p, type: 'internal' }));
        const externalNodes = department.externalPartners.map(p => ({ name: p, type: 'external' }));
        
        // Place degree nodes with advanced collision detection and optimal positioning
        if (degreeNodes.length > 0) {
            // Track all placed degree positions
            const placedDegreeNodes = [];
            
            degreeNodes.forEach((degree, index) => {
                let attempts = 0;
                let bestPosition = null;
                let bestScore = -1;
                
                // Try many positions to find the optimal one
                while (attempts < 150) {
                    // Try different angular positions with wide spacing
                    const baseAngle = (index * (Math.PI * 2) / degreeNodes.length);
                    const randomOffset = (Math.random() - 0.5) * Math.PI; // Large random variation
                    let angle = baseAngle + randomOffset;
                    
                    // Add some distance variation too
                    const radiusVariation = (Math.random() - 0.5) * (degreeRadius * 0.3);
                    const testRadius = degreeRadius + radiusVariation;
                    
                    angle = this.adjustAngleToAvoidTextLine(angle);
                    
                    const x = centerX + Math.cos(angle) * testRadius;
                    const y = centerY + Math.sin(angle) * testRadius;
                    
                    // Calculate position score (higher is better)
                    let positionScore = 0;
                    let hasCollision = false;
                    
                    const degreeTextWidth = this.estimateTextWidth(degree.name);
                    
                    // Check for text collisions with all existing degree nodes
                    for (const existing of placedDegreeNodes) {
                        const dx = Math.abs(x - existing.x);
                        const dy = Math.abs(y - existing.y);
                        
                        // Much larger separation for degree text (they tend to be long)
                        const requiredSeparationX = (degreeTextWidth + existing.textWidth) / 2 + 80; // Large buffer
                        const requiredSeparationY = 120;  // Very tall vertical separation
                        
                        if (dx < requiredSeparationX && dy < requiredSeparationY) {
                            hasCollision = true;
                            break;
                        } else {
                            // Reward positions that are far from other nodes
                            const totalDistance = Math.sqrt(dx * dx + dy * dy);
                            positionScore += totalDistance;
                        }
                    }
                    
                    // Check angular separation from other degrees
                    const minAngleSeparation = (Math.PI * 2) / Math.max(degreeNodes.length * 2, 6);
                    for (const existing of placedDegreeNodes) {
                        const existingAngle = existing.angle;
                        const angleDiff = Math.abs(angle - existingAngle);
                        const normalizedDiff = Math.min(angleDiff, (Math.PI * 2) - angleDiff);
                        if (normalizedDiff < minAngleSeparation) {
                            hasCollision = true;
                            break;
                        } else {
                            // Reward good angular separation
                            positionScore += normalizedDiff * 100;
                        }
                    }
                    
                    // Check canvas bounds with generous margins
                    const boundaryMargin = Math.max(degreeTextWidth / 2 + 40, 100);
                    if (x < boundaryMargin || x > canvasWidth - boundaryMargin ||
                        y < 100 || y > canvasHeight - 100) {
                        hasCollision = true;
                    }
                    
                    // If no collision and better score, save this position
                    if (!hasCollision && positionScore > bestScore) {
                        bestScore = positionScore;
                        bestPosition = { x: x, y: y, angle: angle, textWidth: degreeTextWidth };
                    }
                    
                    attempts++;
                }
                
                // Use best position found, or fallback
                let finalX, finalY, finalAngle;
                if (bestPosition) {
                    finalX = bestPosition.x;
                    finalY = bestPosition.y;
                    finalAngle = bestPosition.angle;
                } else {
                    // Fallback: force maximum angular separation
                    finalAngle = index * (Math.PI * 2) / degreeNodes.length;
                    finalAngle = this.adjustAngleToAvoidTextLine(finalAngle);
                    finalX = centerX + Math.cos(finalAngle) * degreeRadius;
                    finalY = centerY + Math.sin(finalAngle) * degreeRadius;
                }
                
                // Record this position for future collision checks
                placedDegreeNodes.push({ 
                    x: finalX, 
                    y: finalY, 
                    angle: finalAngle,
                    textWidth: this.estimateTextWidth(degree.name)
                });
                
                const itemId = degree.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
                this.vizNodes.push({
                    id: itemId,
                    name: degree.name,
                    x: finalX,
                    y: finalY,
                    type: 'degree',
                    radius: 12,
                    isMainDegree: true
                });
                
                this.vizLinks.push({
                    source: department.id,
                    target: itemId,
                    type: 'degree',
                    opacity: 0
                });
                
                // Place sub-tracks with intelligent positioning
                if (processedDegrees.tracks[degree.name]) {
                    const tracks = processedDegrees.tracks[degree.name];
                    this.placeTracksAroundDegree(finalX, finalY, finalAngle, tracks, itemId, centerX, centerY, margin);
                }
            });
        }
        
        // Place internal partners with advanced collision detection
        if (internalNodes.length > 0) {
            const placedInternalNodes = [];
            
            internalNodes.forEach((partner, index) => {
                let attempts = 0;
                let bestPosition = null;
                let bestScore = -1;
                
                while (attempts < 100) {
                    let angle = this.getDistributedAngle(index, internalNodes.length, Math.PI / 6);
                    const randomOffset = (Math.random() - 0.5) * (Math.PI / 2);
                    angle += randomOffset;
                    angle = this.adjustAngleToAvoidTextLine(angle);
                    
                    // Add some radius variation
                    const radiusVariation = (Math.random() - 0.5) * (internalRadius * 0.2);
                    const testRadius = internalRadius + radiusVariation;
                    
                    const x = centerX + Math.cos(angle) * testRadius;
                    const y = centerY + Math.sin(angle) * testRadius;
                    
                    // Calculate position score
                    let positionScore = 0;
                    let hasCollision = false;
                    
                    const partnerTextWidth = this.estimateTextWidth(partner.name);
                    
                    // Check for collisions with existing nodes (including degrees and other partners)
                    const allExistingNodes = [...this.vizNodes, ...placedInternalNodes];
                    for (const existing of allExistingNodes) {
                        const dx = Math.abs(x - existing.x);
                        const dy = Math.abs(y - existing.y);
                        
                        const existingTextWidth = existing.textWidth || this.estimateTextWidth(existing.name || '');
                        const requiredSeparationX = (partnerTextWidth + existingTextWidth) / 2 + 50;
                        const requiredSeparationY = 80;
                        
                        if (dx < requiredSeparationX && dy < requiredSeparationY) {
                            hasCollision = true;
                            break;
                        } else {
                            const distance = Math.sqrt(dx * dx + dy * dy);
                            positionScore += distance;
                        }
                    }
                    
                    // Check canvas bounds
                    const boundaryMargin = Math.max(partnerTextWidth / 2 + 30, 70);
                    if (x < boundaryMargin || x > canvasWidth - boundaryMargin ||
                        y < 70 || y > canvasHeight - 70) {
                        hasCollision = true;
                    }
                    
                    if (!hasCollision && positionScore > bestScore) {
                        bestScore = positionScore;
                        bestPosition = { x: x, y: y, textWidth: partnerTextWidth };
                    }
                    
                    attempts++;
                }
                
                let finalX, finalY;
                if (bestPosition) {
                    finalX = bestPosition.x;
                    finalY = bestPosition.y;
                } else {
                    // Fallback positioning
                    const angle = index * (Math.PI * 2) / internalNodes.length + Math.PI / 6;
                    const adjustedAngle = this.adjustAngleToAvoidTextLine(angle);
                    finalX = centerX + Math.cos(adjustedAngle) * internalRadius;
                    finalY = centerY + Math.sin(adjustedAngle) * internalRadius;
                }
                
                // Ensure within bounds
                const boundedPos = this.ensureWithinBounds(finalX, finalY, canvasWidth, canvasHeight, margin);
                placedInternalNodes.push({ 
                    x: boundedPos.x, 
                    y: boundedPos.y, 
                    name: partner.name,
                    textWidth: this.estimateTextWidth(partner.name)
                });
                
                const itemId = partner.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
                this.vizNodes.push({
                    id: itemId,
                    name: partner.name,
                    x: boundedPos.x,
                    y: boundedPos.y,
                    type: 'internal',
                    radius: 14
                });
                
                this.vizLinks.push({
                    source: department.id,
                    target: itemId,
                    type: 'internal',
                    opacity: 0
                });
            });
        }
        
        // Place external partners with advanced collision detection
        if (externalNodes.length > 0) {
            const placedExternalNodes = [];
            
            externalNodes.forEach((partner, index) => {
                let attempts = 0;
                let bestPosition = null;
                let bestScore = -1;
                
                while (attempts < 100) {
                    let angle = this.getDistributedAngle(index, externalNodes.length, Math.PI / 3);
                    const randomOffset = (Math.random() - 0.5) * (Math.PI / 2);
                    angle += randomOffset;
                    angle = this.adjustAngleToAvoidTextLine(angle);
                    
                    // Add radius variation
                    const radiusVariation = (Math.random() - 0.5) * (externalRadius * 0.15);
                    const testRadius = externalRadius + radiusVariation;
                    
                    const x = centerX + Math.cos(angle) * testRadius;
                    const y = centerY + Math.sin(angle) * testRadius;
                    
                    // Calculate position score
                    let positionScore = 0;
                    let hasCollision = false;
                    
                    const partnerTextWidth = this.estimateTextWidth(partner.name);
                    
                    // Check for collisions with ALL existing nodes
                    const allExistingNodes = [...this.vizNodes, ...placedExternalNodes];
                    for (const existing of allExistingNodes) {
                        const dx = Math.abs(x - existing.x);
                        const dy = Math.abs(y - existing.y);
                        
                        const existingTextWidth = existing.textWidth || this.estimateTextWidth(existing.name || '');
                        const requiredSeparationX = (partnerTextWidth + existingTextWidth) / 2 + 60; // Larger buffer for external
                        const requiredSeparationY = 90; // Larger vertical buffer
                        
                        if (dx < requiredSeparationX && dy < requiredSeparationY) {
                            hasCollision = true;
                            break;
                        } else {
                            const distance = Math.sqrt(dx * dx + dy * dy);
                            positionScore += distance;
                        }
                    }
                    
                    // Check canvas bounds
                    const boundaryMargin = Math.max(partnerTextWidth / 2 + 40, 80);
                    if (x < boundaryMargin || x > canvasWidth - boundaryMargin ||
                        y < 80 || y > canvasHeight - 80) {
                        hasCollision = true;
                    }
                    
                    if (!hasCollision && positionScore > bestScore) {
                        bestScore = positionScore;
                        bestPosition = { x: x, y: y, textWidth: partnerTextWidth };
                    }
                    
                    attempts++;
                }
                
                let finalX, finalY;
                if (bestPosition) {
                    finalX = bestPosition.x;
                    finalY = bestPosition.y;
                } else {
                    // Fallback positioning
                    const angle = index * (Math.PI * 2) / externalNodes.length + Math.PI / 3;
                    const adjustedAngle = this.adjustAngleToAvoidTextLine(angle);
                    finalX = centerX + Math.cos(adjustedAngle) * externalRadius;
                    finalY = centerY + Math.sin(adjustedAngle) * externalRadius;
                }
                
                // Ensure within bounds
                const boundedPos = this.ensureWithinBounds(finalX, finalY, canvasWidth, canvasHeight, margin);
                placedExternalNodes.push({ 
                    x: boundedPos.x, 
                    y: boundedPos.y, 
                    name: partner.name,
                    textWidth: this.estimateTextWidth(partner.name)
                });
                
                const itemId = partner.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
                this.vizNodes.push({
                    id: itemId,
                    name: partner.name,
                    x: boundedPos.x,
                    y: boundedPos.y,
                    type: 'external',
                    radius: 10
                });
                
                this.vizLinks.push({
                    source: department.id,
                    target: itemId,
                    type: 'external',
                    opacity: 0
                });
            });
        }
        
        // Animate links
        setTimeout(() => {
            this.animateVizLinks();
        }, 500);
    }
    
    adjustAngleToAvoidTextLine(angle) {
        // Normalize angle to 0-2π range
        while (angle < 0) angle += Math.PI * 2;
        while (angle >= Math.PI * 2) angle -= Math.PI * 2;
        
        // Define exclusion zone around horizontal line (±30 degrees from 0 and π)
        const exclusionAngle = Math.PI / 6; // 30 degrees
        
        // Check if angle is near 0 (right side) or π (left side)
        if (angle < exclusionAngle) {
            // Too close to 0, move to exclusionAngle
            angle = exclusionAngle;
        } else if (angle > (Math.PI * 2 - exclusionAngle)) {
            // Too close to 2π (same as 0), move to 2π - exclusionAngle
            angle = Math.PI * 2 - exclusionAngle;
        } else if (Math.abs(angle - Math.PI) < exclusionAngle) {
            // Too close to π (left side)
            if (angle < Math.PI) {
                angle = Math.PI - exclusionAngle;
            } else {
                angle = Math.PI + exclusionAngle;
            }
        }
        
        return angle;
    }
    
    getDistributedAngle(index, total, baseOffset = 0) {
        // Create much more even distribution with larger gaps to prevent overlap
        const baseAngle = (index / total) * Math.PI * 2 + baseOffset;
        
        // Add much more staggering to ensure no overlap
        const stagger = (index % 5) * (Math.PI / 12); // 0, 15, 30, 45, 60 degrees variation
        
        // Additional spacing factor to spread things out more
        const spacingFactor = 1.3; // Increase the effective angle spacing by 30%
        
        return (baseAngle * spacingFactor) + stagger;
    }
    
    estimateTextWidth(text) {
        // Estimate text width based on character count and font characteristics
        // Orbitron font is roughly 0.6 times character count in pixels at 14px font size
        const avgCharWidth = 9; // Approximate width per character in Orbitron
        const minWidth = 80; // Minimum text width
        const maxWidth = 300; // Maximum reasonable text width
        
        const estimatedWidth = Math.min(maxWidth, Math.max(minWidth, text.length * avgCharWidth));
        return estimatedWidth;
    }

    ensureWithinBounds(x, y, canvasWidth, canvasHeight, margin) {
        // Ensure nodes stay within the canvas bounds with proper margins
        const clampedX = Math.max(margin, Math.min(x, canvasWidth - margin));
        const clampedY = Math.max(margin, Math.min(y, canvasHeight - margin));
        
        return { x: clampedX, y: clampedY };
    }
    
    placeTracksAroundDegree(degreeX, degreeY, degreeAngle, tracks, parentId, centerX, centerY, margin) {
        const canvasWidth = this.vizCanvas.width;
        const canvasHeight = this.vizCanvas.height;
        const maxRadius = Math.min(canvasWidth, canvasHeight) / 2;
        
        // Much larger distances to prevent any overlap
        const minTrackDistance = maxRadius * 0.3; // 30% of max radius minimum
        const maxTrackDistance = maxRadius * 0.55; // 55% of max radius maximum
        
        // Track all existing node positions to avoid overlaps
        const existingPositions = this.vizNodes.map(node => ({
            x: node.x,
            y: node.y,
            textWidth: this.estimateTextWidth(node.name), // Dynamic text width estimation
            textHeight: 50  // Increased text height estimate
        }));
        
        tracks.forEach((track, trackIndex) => {
            let attempts = 0;
            let validPosition = false;
            let subX, subY;
            let bestPosition = null;
            let bestScore = -1;
            
            // Try many more positions to find the best one
            while (attempts < 200) {
                // Create much wider angular spacing with more variation
                const baseAngle = degreeAngle + (trackIndex * (Math.PI * 2) / Math.max(tracks.length, 2));
                const angleVariation = (Math.random() - 0.5) * Math.PI; // Full π variation
                const finalAngle = baseAngle + angleVariation;
                
                // Progressive distance from degree node with more spread
                const distanceVariation = Math.random() * (maxTrackDistance - minTrackDistance);
                const distance = minTrackDistance + distanceVariation;
                
                const testX = degreeX + Math.cos(finalAngle) * distance;
                const testY = degreeY + Math.sin(finalAngle) * distance;
                
                // Calculate a score for this position (higher is better)
                let positionScore = 0;
                let hasCollision = false;
                
                const trackTextWidth = this.estimateTextWidth(track);
                
                // Check if position conflicts with any existing text
                for (const existing of existingPositions) {
                    const dx = Math.abs(testX - existing.x);
                    const dy = Math.abs(testY - existing.y);
                    
                    // Much larger separation requirements
                    const requiredSeparationX = (existing.textWidth + trackTextWidth) / 2 + 60; // 60px buffer
                    const requiredSeparationY = 70; // 70px vertical buffer
                    
                    if (dx < requiredSeparationX && dy < requiredSeparationY) {
                        hasCollision = true;
                        break;
                    } else {
                        // Add to score based on distance from other nodes (farther is better)
                        const totalDistance = Math.sqrt(dx * dx + dy * dy);
                        positionScore += totalDistance;
                    }
                }
                
                // Check canvas bounds with generous margins
                const boundaryMargin = Math.max(trackTextWidth / 2 + 40, 80);
                if (testX < boundaryMargin || testX > canvasWidth - boundaryMargin ||
                    testY < 80 || testY > canvasHeight - 80) {
                    hasCollision = true;
                }
                
                // Check minimum distance from center
                const distanceFromCenter = Math.sqrt(Math.pow(testX - centerX, 2) + Math.pow(testY - centerY, 2));
                if (distanceFromCenter < minTrackDistance) {
                    hasCollision = true;
                }
                
                // If no collision and better score, save this position
                if (!hasCollision && positionScore > bestScore) {
                    bestScore = positionScore;
                    bestPosition = { x: testX, y: testY };
                    validPosition = true;
                }
                
                attempts++;
            }
            
            // Use best position found, or fallback
            if (bestPosition) {
                subX = bestPosition.x;
                subY = bestPosition.y;
            } else {
                // Fallback: place far from center with maximum angular separation
                const fallbackAngle = degreeAngle + (trackIndex * Math.PI * 2 / tracks.length);
                subX = degreeX + Math.cos(fallbackAngle) * maxTrackDistance;
                subY = degreeY + Math.sin(fallbackAngle) * maxTrackDistance;
            }
            
            // Final bounds check
            const bounded = this.ensureWithinBounds(subX, subY, canvasWidth, canvasHeight, margin);
            
            // Add this position to our tracking
            existingPositions.push({
                x: bounded.x,
                y: bounded.y,
                textWidth: this.estimateTextWidth(track),
                textHeight: 50
            });
            
            const trackId = track.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
            this.vizNodes.push({
                id: trackId,
                name: track,
                x: bounded.x,
                y: bounded.y,
                type: 'degree-track',
                radius: 8,
                parentId: parentId
            });
            
            this.vizLinks.push({
                source: parentId,
                target: trackId,
                type: 'degree-track',
                opacity: 0
            });
        });
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
        
        // Spotlight Section (replaces featured project)
        if (department.spotlight) {
            html += `
                <div class="featured-project">
                    <h3 class="featured-title">Spotlight: ${department.name}</h3>
                    <div class="featured-preview" data-popup-title="${department.name} Spotlight" data-popup-url="${department.spotlight}" ${department.image ? `style="background-image: url('${department.image}'); background-size: cover; background-position: center;"` : ''}>
                        <div class="preview-overlay">
                            ${!department.image ? '<div class="preview-icon">🔗</div>' : ''}
                            <p class="preview-text">Click to view Spotlight</p>
                        </div>
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
        
        // All Highlights/Projects 
        if (department.highlights.length > 0) {
            html += `
                <div class="card-section">
                    <h3 class="section-title">Projects & Highlights</h3>
                    <div class="section-content">
                        <ul class="section-list">
                            ${department.highlights.map(highlight => 
                                `<li><a href="#" class="highlight-link" data-popup-title="${highlight.title}" data-popup-url="${highlight.url}">${highlight.title}</a></li>`
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
        
        // Main canvas animation - use more transparent overlay to show grid
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.03)';
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
        
        // Set different line characteristics based on type
        let pulseWidth, pulseGlow, strokeColor, shadowColor;
        
        if (linkType === 'degree') {
            // Shortest, thinnest lines for degrees - mixed cool colors
            pulseWidth = 1.5 + Math.sin(this.animationTime * 4) * 0.3;
            pulseGlow = 6 + Math.sin(this.animationTime * 3) * 3;
            // Mix of cool colors for degrees
            const degreeColors = ['#00ffff', '#0080ff', '#8000ff', '#ff00c0'];
            const colorIndex = Math.abs(source.x + target.x) % degreeColors.length;
            strokeColor = degreeColors[Math.floor(colorIndex)];
            shadowColor = strokeColor;
        } else if (linkType === 'degree-track') {
            // Very thin lines for degree tracks - lighter versions
            pulseWidth = 1 + Math.sin(this.animationTime * 5) * 0.2;
            pulseGlow = 4 + Math.sin(this.animationTime * 4) * 2;
            strokeColor = '#80c0ff'; // Light blue for tracks
            shadowColor = strokeColor;
        } else if (linkType === 'internal') {
            // Medium thickness for internal - warm colors
            pulseWidth = 2.5 + Math.sin(this.animationTime * 3) * 0.5;
            pulseGlow = 12 + Math.sin(this.animationTime * 2) * 6;
            // Mix of warm colors for internal
            const internalColors = ['#ffff00', '#ff8000', '#ff0040', '#c0ff00'];
            const colorIndex = Math.abs(source.y + target.y) % internalColors.length;
            strokeColor = internalColors[Math.floor(colorIndex)];
            shadowColor = strokeColor;
        } else if (linkType === 'external') {
            // Thickest lines for external - vibrant mixed colors
            pulseWidth = 3 + Math.sin(this.animationTime * 2) * 0.8;
            pulseGlow = 18 + Math.sin(this.animationTime * 1.5) * 8;
            // Mix of vibrant colors for external
            const externalColors = ['#ff00ff', '#00ff40', '#ff4000', '#4000ff', '#ff8040'];
            const colorIndex = Math.abs(source.x * source.y + target.x * target.y) % externalColors.length;
            strokeColor = externalColors[Math.floor(colorIndex)];
            shadowColor = strokeColor;
        } else {
            // Default
            pulseWidth = 2;
            pulseGlow = 10;
            strokeColor = '#00ffff';
            shadowColor = strokeColor;
        }
        
        this.vizCtx.strokeStyle = strokeColor;
        this.vizCtx.shadowColor = shadowColor;
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
        let fillColor, shadowColor;
        
        if (node.type === 'central') {
            fillColor = '#ff6600';
            shadowColor = '#ff6600';
            shadowBlur = 25 + 12 * Math.sin(this.animationTime * 1.5);
        } else if (node.type === 'degree') {
            // Mixed cool colors for degrees - smaller nodes
            const degreeColors = ['#00ffff', '#0080ff', '#8000ff', '#ff00c0'];
            const colorIndex = Math.abs(node.x + node.y) % degreeColors.length;
            fillColor = degreeColors[Math.floor(colorIndex)];
            shadowColor = fillColor;
            shadowBlur = 8 + 4 * Math.sin(this.animationTime * 2.5);
        } else if (node.type === 'degree-track') {
            // Light blue for degree tracks - smallest nodes
            fillColor = '#80c0ff';
            shadowColor = '#80c0ff';
            shadowBlur = 6 + 3 * Math.sin(this.animationTime * 3);
        } else if (node.type === 'internal') {
            // Mixed warm colors for internal partners - medium nodes
            const internalColors = ['#ffff00', '#ff8000', '#ff0040', '#c0ff00'];
            const colorIndex = Math.abs(node.y * 2 + node.x) % internalColors.length;
            fillColor = internalColors[Math.floor(colorIndex)];
            shadowColor = fillColor;
            shadowBlur = 12 + 6 * Math.sin(this.animationTime * 2);
        } else if (node.type === 'external') {
            // Mixed vibrant colors for external partners - largest nodes
            const externalColors = ['#ff00ff', '#00ff40', '#ff4000', '#4000ff', '#ff8040'];
            const colorIndex = Math.abs(node.x * node.y) % externalColors.length;
            fillColor = externalColors[Math.floor(colorIndex)];
            shadowColor = fillColor;
            shadowBlur = 15 + 8 * Math.sin(this.animationTime * 1.8);
        } else {
            fillColor = '#00ffff';
            shadowColor = '#00ffff';
            shadowBlur = 10;
        }
        
        this.vizCtx.fillStyle = fillColor;
        this.vizCtx.shadowColor = shadowColor;
        this.vizCtx.shadowBlur = shadowBlur * pulseIntensity;
        this.vizCtx.strokeStyle = '#ffffff';
        this.vizCtx.lineWidth = node.type === 'central' ? 3 : 2;
        
        // Add slight size pulsing for central node
        const radius = node.type === 'central' ? 
            node.radius + 4 * Math.sin(this.animationTime) : 
            node.radius;
        
        this.vizCtx.beginPath();
        this.vizCtx.arc(node.x, node.y, radius, 0, Math.PI * 2);
        this.vizCtx.fill();
        this.vizCtx.stroke();
        
        this.vizCtx.restore();
    }
    
    drawVizLabel(node) {
        this.vizCtx.save();
        
        // Set label color and styling based on node type
        if (node.type === 'central') {
            // Central department name with blue outline (TRON style)
            this.vizCtx.font = 'bold 22px Orbitron';
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
            // Degree nodes with WHITE font for better readability
            this.vizCtx.fillStyle = '#ffffff';  // White font for degrees
            this.vizCtx.font = 'bold 13px Orbitron';  // Slightly smaller to fit better
            this.vizCtx.shadowColor = '#000000';
            this.vizCtx.shadowBlur = 4;
            this.vizCtx.textAlign = 'center';
            this.vizCtx.textBaseline = 'middle';
            
            // Wrap long text with better width management
            const maxWidth = 110;  
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
            
            const lineHeight = 15;
            // Edge-aware text positioning
            const canvasWidth = this.vizCanvas.width;
            const canvasHeight = this.vizCanvas.height;
            const margin = 60;
            
            let textX = node.x;
            let textY = node.y;
            
            // Adjust for canvas edges
            if (node.x < margin) {
                textX = node.x + node.radius + 60;
                this.vizCtx.textAlign = 'left';
            } else if (node.x > canvasWidth - margin) {
                textX = node.x - node.radius - 60;
                this.vizCtx.textAlign = 'right';
            }
            
            if (node.y < margin) {
                textY = node.y + node.radius + 30;
            } else if (node.y > canvasHeight - margin) {
                textY = node.y - node.radius - 20;
            } else {
                // Standard positioning with some variation
                const centerX = canvasWidth / 2;
                const centerY = canvasHeight / 2;
                const angle = Math.atan2(node.y - centerY, node.x - centerX);
                
                if (angle > Math.PI/3 && angle < 2*Math.PI/3) {
                    textY = node.y + node.radius + 35;
                } else if (angle < -Math.PI/3 && angle > -2*Math.PI/3) {
                    textY = node.y - node.radius - 25;
                } else {
                    textY = node.y + node.radius + 30;
                }
            }
            
            const startY = textY - (lines.length - 1) * lineHeight / 2;
            
            lines.forEach((line, index) => {
                this.vizCtx.fillText(line.trim(), textX, startY + index * lineHeight);
            });
        } else if (node.type === 'degree-track') {
            // Degree track nodes with white font (smaller)
            this.vizCtx.fillStyle = '#ffffff';  // White font for degree tracks too
            this.vizCtx.font = '9px Orbitron';  // Even smaller font to reduce overlap
            this.vizCtx.shadowColor = '#000000';
            this.vizCtx.shadowBlur = 3;
            this.vizCtx.textAlign = 'center';
            this.vizCtx.textBaseline = 'middle';
            
            // Wrap long text with smaller width to reduce overlap
            const maxWidth = 70;  // Further reduced
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
            
            const lineHeight = 11; // Reduced line height for track text
            // Smart text positioning to avoid canvas edges and overlap
            const canvasWidth = this.vizCanvas.width;
            const canvasHeight = this.vizCanvas.height;
            const margin = 40;
            
            // Calculate optimal text position
            let textX = node.x;
            let textY = node.y;
            
            // Check if near edges and adjust accordingly
            if (node.x < margin * 2) {
                // Near left edge - place text to the right
                textX = node.x + node.radius + 50;
                this.vizCtx.textAlign = 'left';
            } else if (node.x > canvasWidth - margin * 2) {
                // Near right edge - place text to the left
                textX = node.x - node.radius - 50;
                this.vizCtx.textAlign = 'right';
            }
            
            if (node.y < margin * 2) {
                // Near top edge - place text below
                textY = node.y + node.radius + 25;
            } else if (node.y > canvasHeight - margin * 2) {
                // Near bottom edge - place text above
                textY = node.y - node.radius - 15;
            } else {
                // Default positioning with staggering
                textY = node.y + node.radius + 20;
            }
            
            const startY = textY - (lines.length - 1) * lineHeight / 2;
            
            lines.forEach((line, index) => {
                this.vizCtx.fillText(line.trim(), textX, startY + index * lineHeight);
            });
        } else if (node.type === 'internal') {
            // Internal partner nodes with larger colorful font
            this.vizCtx.fillStyle = '#ffff80';  // Light yellow for internal
            this.vizCtx.font = 'bold 16px Orbitron';
            this.vizCtx.shadowColor = '#000000';
            this.vizCtx.shadowBlur = 4;
            this.vizCtx.textAlign = 'center';
            this.vizCtx.textBaseline = 'middle';
            
            // Wrap long text
            const maxWidth = 150;
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
            
            const lineHeight = 18;
            const startY = node.y + node.radius + 28 - (lines.length - 1) * lineHeight / 2;
            
            lines.forEach((line, index) => {
                this.vizCtx.fillText(line.trim(), node.x, startY + index * lineHeight);
            });
        } else if (node.type === 'external') {
            // External partner nodes with largest colorful font
            this.vizCtx.fillStyle = '#ff80ff';  // Light magenta for external
            this.vizCtx.font = 'bold 17px Orbitron';
            this.vizCtx.shadowColor = '#000000';
            this.vizCtx.shadowBlur = 4;
            this.vizCtx.textAlign = 'center';
            this.vizCtx.textBaseline = 'middle';
            
            // Wrap long text
            const maxWidth = 160;
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
            
            const lineHeight = 19;
            const startY = node.y + node.radius + 30 - (lines.length - 1) * lineHeight / 2;
            
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
