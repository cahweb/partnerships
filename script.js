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
        
        // Hover state management
        this.hoveredNode = null;
        this.mouseX = 0;
        this.mouseY = 0;
        
        // Filtering system
        this.activeFilter = null; // 'central', 'degree', 'track', 'internal', 'external', or null for all
        
        // Performance optimizations
        this.layoutCache = new Map(); // Cache for computed layouts
        this.lastVizFrame = 0; // For frame rate limiting
        this.vizAnimationId = null; // Track animation frame ID
        
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
        this.setupLegendFilters(); // Add legend filtering
        this.animate();
        
        // Setup click-through functionality
        this.setupClickThrough();
        
        // Setup hover functionality for visualization
        this.setupHoverHandling();
        
        // Start line generation immediately since it now handles text timing internally
        this.generateLines();
        
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
        
        // Setup department info button
        const deptInfoButton = document.getElementById('deptInfoButton');
        deptInfoButton.addEventListener('click', () => {
            if (this.currentDepartmentId) {
                this.showDataCard(this.currentDepartmentId);
            }
        });
        
        // Setup data card close button
        const dataCardClose = document.getElementById('dataCardClose');
        dataCardClose.addEventListener('click', () => {
            this.hideDataCard();
        });
        
        // Click outside data card to close
        const dataCard = document.getElementById('dataCard');
        dataCard.addEventListener('click', (e) => {
            if (e.target === dataCard) {
                this.hideDataCard();
            }
        });
        
        // ESC key to exit detail view or close data card
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const dataCard = document.getElementById('dataCard');
                if (dataCard.classList.contains('show')) {
                    this.hideDataCard();
                } else if (this.isDetailView) {
                    this.exitDetailView();
                } else {
                    this.closePopup();
                }
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
        // Close the datacard to avoid conflicts with the popup
        this.hideDataCard();
        
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
        
        let resizeTimeout;
        window.addEventListener('resize', () => {
            // Debounce resize events to avoid excessive redraws
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                this.resizeCanvas();
                this.generateGrid(); // Regenerate grid for new dimensions
                
                // If we're in detail view, recreate the visualization
                if (this.isDetailView && this.currentNode) {
                    const departmentId = this.getDepartmentId(this.currentNode.textContent);
                    this.createPartnershipVisualization(departmentId);
                } else if (this.nodesGenerated) {
                    // Reposition existing nodes for new canvas size with responsive logic
                    this.repositionNodesForResize();
                }
                
                // Force a redraw if in detail view
                if (this.isDetailView && this.vizAnimationId) {
                    cancelAnimationFrame(this.vizAnimationId);
                    this.animateVisualization();
                }
            }, 150);
        });
    }
    
    setupLegendFilters() {
        // Add event listeners to legend items for filtering
        const legendItems = document.querySelectorAll('.legend-item[data-filter]');
        
        legendItems.forEach(item => {
            item.addEventListener('mouseenter', (e) => {
                const filterType = e.currentTarget.getAttribute('data-filter');
                this.setFilter(filterType);
            });
            
            item.addEventListener('mouseleave', () => {
                this.setFilter(null); // Clear filter on mouse leave
            });
        });
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
        // Show text first, then generate lines that target it
        this.showText();
        
        // Wait for text to be rendered, then generate lines
        setTimeout(() => {
            let edgeCounter = 0; // To ensure even distribution
            const interval = setInterval(() => {
                if (this.lines.length >= this.maxLines) {
                    clearInterval(interval);
                    return;
                }
                
                this.createRandomLine(edgeCounter % 4); // Pass the edge to use
                edgeCounter++;
            }, 200);
        }, 2000); // Wait 2 seconds for text animation to complete
    }
    
    getTextBoundaries(addPadding = false) {
        const collegeText = document.getElementById('collegeText');
        
        // Default fallback boundaries (more conservative)
        let textBounds = {
            left: this.canvas.width * 0.15,
            right: this.canvas.width * 0.85,
            top: this.canvas.height * 0.4,
            bottom: this.canvas.height * 0.6
        };
        
        // If the element exists and is visible, get its actual bounds
        if (collegeText && collegeText.offsetWidth > 0) {
            const rect = collegeText.getBoundingClientRect();
            const canvasRect = this.canvas.getBoundingClientRect();
            
            if (addPadding) {
                // Add padding to prevent lines from overlapping the box (for node positioning)
                const padding = 15;
                textBounds = {
                    left: rect.left - canvasRect.left - padding,
                    right: rect.right - canvasRect.left + padding,
                    top: rect.top - canvasRect.top - padding,
                    bottom: rect.bottom - canvasRect.top + padding
                };
            } else {
                // Connect directly to border edges (for line animation)
                textBounds = {
                    left: rect.left - canvasRect.left,
                    right: rect.right - canvasRect.left,
                    top: rect.top - canvasRect.top,
                    bottom: rect.bottom - canvasRect.top
                };
            }
            
            // Ensure bounds are within canvas
            textBounds.left = Math.max(0, textBounds.left);
            textBounds.right = Math.min(this.canvas.width, textBounds.right);
            textBounds.top = Math.max(0, textBounds.top);
            textBounds.bottom = Math.min(this.canvas.height, textBounds.bottom);
        }
        
        return textBounds;
    }

    createRandomLine(forcedEdge = null) {
        // Get accurate text boundaries
        const textBounds = this.getTextBoundaries();
        
        // Choose edge - use forced edge for even distribution, or random
        const edge = forcedEdge !== null ? forcedEdge : Math.floor(Math.random() * 4);
        let startPoint, straightEndPoint, curveEndPoint;
        
        // Create straight segment length (20-40% of the way across screen)
        const straightLength = (0.2 + Math.random() * 0.2) * Math.min(this.canvas.width, this.canvas.height);
        
        switch(edge) {
            case 0: // Top edge - start horizontal, then curve down toward text box
                startPoint = {
                    x: Math.random() * this.canvas.width,
                    y: -this.grid * 2 // Start offscreen
                };
                // Straight segment goes down, but stops well before the text box
                straightEndPoint = {
                    x: startPoint.x,
                    y: Math.min(startPoint.y + straightLength, textBounds.top - this.grid * 4)
                };
                // Curve toward text box top edge, stopping at the boundary
                curveEndPoint = {
                    x: textBounds.left + Math.random() * (textBounds.right - textBounds.left),
                    y: textBounds.top
                };
                break;
            case 1: // Right edge - start vertical, then curve left toward text box
                startPoint = {
                    x: this.canvas.width + this.grid * 2, // Start offscreen
                    y: Math.random() * this.canvas.height
                };
                // Straight segment goes left, but stops well before the text box
                straightEndPoint = {
                    x: Math.max(startPoint.x - straightLength, textBounds.right + this.grid * 4),
                    y: startPoint.y
                };
                // Curve toward text box right edge, stopping at the boundary
                curveEndPoint = {
                    x: textBounds.right,
                    y: textBounds.top + Math.random() * (textBounds.bottom - textBounds.top)
                };
                break;
            case 2: // Bottom edge - start horizontal, then curve up toward text box
                startPoint = {
                    x: Math.random() * this.canvas.width,
                    y: this.canvas.height + this.grid * 2 // Start offscreen
                };
                // Straight segment goes up, but stops well before the text box
                straightEndPoint = {
                    x: startPoint.x,
                    y: Math.max(startPoint.y - straightLength, textBounds.bottom + this.grid * 4)
                };
                // Curve toward text box bottom edge, stopping at the boundary
                curveEndPoint = {
                    x: textBounds.left + Math.random() * (textBounds.right - textBounds.left),
                    y: textBounds.bottom
                };
                break;
            case 3: // Left edge - start vertical, then curve right toward text box
                startPoint = {
                    x: -this.grid * 2, // Start offscreen
                    y: Math.random() * this.canvas.height
                };
                // Straight segment goes right, but stops well before the text box
                straightEndPoint = {
                    x: Math.min(startPoint.x + straightLength, textBounds.left - this.grid * 4),
                    y: startPoint.y
                };
                // Curve toward text box left edge, stopping at the boundary
                curveEndPoint = {
                    x: textBounds.left,
                    y: textBounds.top + Math.random() * (textBounds.bottom - textBounds.top)
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
        // Get accurate text boundaries
        const textBounds = this.getTextBoundaries();
        
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
        const branchLength = this.grid * (2 + Math.floor(Math.random() * 3)); // Shorter branches
        
        let branchEnd = {
            x: branchStart.x + Math.cos(branchAngle) * branchLength,
            y: branchStart.y + Math.sin(branchAngle) * branchLength
        };
        
        // Ensure branch doesn't penetrate the text box area
        if (branchEnd.x > textBounds.left && branchEnd.x < textBounds.right &&
            branchEnd.y > textBounds.top && branchEnd.y < textBounds.bottom) {
            // Redirect branch to nearest text box edge
            const distToLeft = Math.abs(branchEnd.x - textBounds.left);
            const distToRight = Math.abs(branchEnd.x - textBounds.right);
            const distToTop = Math.abs(branchEnd.y - textBounds.top);
            const distToBottom = Math.abs(branchEnd.y - textBounds.bottom);
            
            const minDist = Math.min(distToLeft, distToRight, distToTop, distToBottom);
            
            if (minDist === distToLeft) branchEnd.x = textBounds.left;
            else if (minDist === distToRight) branchEnd.x = textBounds.right;
            else if (minDist === distToTop) branchEnd.y = textBounds.top;
            else branchEnd.y = textBounds.bottom;
        }
        
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
        
        // Get text container bounds for better positioning relative to it
        const textArea = {
            left: textRect.left,
            right: textRect.right,
            top: textRect.top,
            bottom: textRect.bottom,
            centerX: textRect.left + textRect.width / 2,
            centerY: textRect.top + textRect.height / 2,
            width: textRect.width,
            height: textRect.height
        };
        
        // Define responsive exclusion padding and margins based on screen size
        const isMobile = window.innerWidth <= 768;
        const isSmallMobile = window.innerWidth <= 480;
        const isMediumMobile = window.innerWidth <= 600; // Add medium mobile breakpoint
        
        // Adjust exclusion padding for screen size (further reduced for small screens)
        let exclusionPadding = 120; // Desktop stays the same
        if (isSmallMobile) {
            exclusionPadding = 25; // Much smaller for small mobile to fit all nodes
        } else if (isMediumMobile) {
            exclusionPadding = 35; // More aggressive for medium mobile
        } else if (isMobile) {
            exclusionPadding = 45; // More aggressive for regular mobile
        }
        
        const textExclusionArea = {
            left: textArea.left - exclusionPadding,
            right: textArea.right + exclusionPadding,
            top: textArea.top - exclusionPadding,
            bottom: textArea.bottom + exclusionPadding
        };
        
        // Calculate minimum safe distance from text center (responsive)
        const minSafeDistance = Math.max(
            (textArea.width / 2) + exclusionPadding,
            (textArea.height / 2) + exclusionPadding
        );
        
        // Position nodes in a circular pattern around the title with guaranteed safe distance
        const totalNodes = this.departmentNames.length;
        
        // Adjust base radius and variation for screen size
        let baseRadius = minSafeDistance + 50;
        let radiusVariation = 60;
        
        if (isSmallMobile) {
            // For small mobile, use much smaller radius and pack very tight
            baseRadius = Math.min(minSafeDistance + 15, this.canvas.width * 0.2);
            radiusVariation = 15;
        } else if (isMediumMobile) {
            // For medium mobile, use smaller radius
            baseRadius = Math.min(minSafeDistance + 20, this.canvas.width * 0.22);
            radiusVariation = 20;
        } else if (isMobile) {
            // For mobile, moderate adjustment
            baseRadius = Math.min(minSafeDistance + 25, this.canvas.width * 0.25);
            radiusVariation = 25;
        }
        
        // Calculate angle for this node with better distribution (precompute constants)
        const angleOffset = Math.PI / totalNodes; // Precompute offset
        const angle = (index / totalNodes) * 2 * Math.PI + angleOffset; // Offset to avoid straight axes
        const radius = baseRadius + (Math.sin(index * 0.7) * radiusVariation); // Use sine for smoother variation
        
        // Precompute trigonometric values
        const cosAngle = Math.cos(angle);
        const sinAngle = Math.sin(angle);
        
        // Calculate position relative to text center
        let x = textArea.centerX + cosAngle * radius - nodeWidth/2;
        let y = textArea.centerY + sinAngle * radius - nodeHeight/2;
        
        // Ensure nodes stay within reasonable bounds (responsive margins)
        let margin = 60;
        if (isSmallMobile) {
            margin = 10; // Very small margin for small screens to maximize space
        } else if (isMediumMobile) {
            margin = 15; // Small margin for medium mobile
        } else if (isMobile) {
            margin = 18; // Reduced margin for mobile
        }
        
        const minX = margin;
        const maxX = this.canvas.width - margin - nodeWidth;  
        const minY = margin;
        const maxY = this.canvas.height - margin - nodeHeight;
        
        x = Math.max(minX, Math.min(x, maxX));
        y = Math.max(minY, Math.min(y, maxY));
        
        // If overlapping with text exclusion area, push node away with minimum distance
        if (this.overlapsWithText(x, y, nodeWidth, nodeHeight, textExclusionArea)) {
            // Calculate push direction from text center
            const pushAngle = Math.atan2(y + nodeHeight/2 - textArea.centerY, x + nodeWidth/2 - textArea.centerX);
            const minDistanceFromText = baseRadius + exclusionPadding/2;
            
            x = textArea.centerX + Math.cos(pushAngle) * minDistanceFromText - nodeWidth/2;
            y = textArea.centerY + Math.sin(pushAngle) * minDistanceFromText - nodeHeight/2;
            
            // Re-apply bounds
            x = Math.max(minX, Math.min(x, maxX));
            y = Math.max(minY, Math.min(y, maxY));
        }
        
        // Check for overlap with existing nodes and adjust if needed (responsive buffer)
        let nodeBuffer = 50; // Default buffer
        if (isSmallMobile) {
            nodeBuffer = 15; // Much smaller buffer for small screens to fit more nodes
        } else if (isMediumMobile) {
            nodeBuffer = 20; // Smaller buffer for medium mobile
        } else if (isMobile) {
            nodeBuffer = 22; // Reduced buffer for mobile
        }
        
        let attempts = 0;
        const maxAttempts = (isSmallMobile || isMediumMobile) ? 100 : 50; // More attempts for small and medium mobile
        
        while (attempts < maxAttempts && this.overlapsWithExistingNodes(x, y, nodeWidth, nodeHeight, nodeBuffer)) {
            attempts++;
            
            if ((isSmallMobile || isMediumMobile) && attempts > 20) {
                // Use grid-based fallback for small and medium mobile screens after initial attempts
                const gridCols = 4;
                const gridRows = Math.ceil(totalNodes / gridCols);
                const gridIndex = index + attempts;
                const col = gridIndex % gridCols;
                const row = Math.floor(gridIndex / gridCols);
                
                const gridWidth = this.canvas.width - (margin * 2);
                const gridHeight = this.canvas.height - (margin * 2);
                const cellWidth = gridWidth / gridCols;
                const cellHeight = gridHeight / gridRows;
                
                x = margin + (col * cellWidth) + (cellWidth - nodeWidth) / 2;
                y = margin + (row * cellHeight) + (cellHeight - nodeHeight) / 2;
                
                // Skip if this overlaps with text
                if (this.overlapsWithText(x, y, nodeWidth, nodeHeight, textExclusionArea)) {
                    continue;
                }
            } else {
                // Try a new position with better spacing logic
                const newAngle = (index / totalNodes) * 2 * Math.PI + (attempts * 0.2); // Systematic angle adjustment
                const newRadius = baseRadius + 30 + (attempts * 15); // Gradually increase radius
                
                x = textArea.centerX + Math.cos(newAngle) * newRadius - nodeWidth/2;
                y = textArea.centerY + Math.sin(newAngle) * newRadius - nodeHeight/2;
                
                // Keep within bounds
                x = Math.max(minX, Math.min(x, maxX));
                y = Math.max(minY, Math.min(y, maxY));
                
                // Ensure it still doesn't overlap with text
                if (this.overlapsWithText(x, y, nodeWidth, nodeHeight, textExclusionArea)) {
                    const pushAngle = Math.atan2(y + nodeHeight/2 - textArea.centerY, x + nodeWidth/2 - textArea.centerX);
                    const pushDistance = baseRadius + exclusionPadding/2 + (attempts * 10);
                    
                    x = textArea.centerX + Math.cos(pushAngle) * pushDistance - nodeWidth/2;
                    y = textArea.centerY + Math.sin(pushAngle) * pushDistance - nodeHeight/2;
                    
                    // Re-apply bounds
                    x = Math.max(minX, Math.min(x, maxX));
                    y = Math.max(minY, Math.min(y, maxY));
                }
            }
        }
        
        // Final bounds check with adequate margins
        x = Math.max(30, Math.min(x, this.canvas.width - nodeWidth - 30));
        y = Math.max(30, Math.min(y, this.canvas.height - nodeHeight - 30));
        
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
    
    overlapsWithExistingNodes(x, y, width, height, buffer = 50) {
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

    repositionNodesForResize() {
        // Reposition all existing nodes using responsive logic for new screen size
        if (!this.nodes || this.nodes.length === 0) return;
        
        // Get the text container bounds for the new screen size
        const textContainer = document.getElementById('textContainer');
        const textRect = textContainer.getBoundingClientRect();
        
        const textArea = {
            left: textRect.left,
            right: textRect.right,
            top: textRect.top,
            bottom: textRect.bottom,
            centerX: textRect.left + textRect.width / 2,
            centerY: textRect.top + textRect.height / 2,
            width: textRect.width,
            height: textRect.height
        };
        
        // Define responsive settings for new screen size
        const isMobile = window.innerWidth <= 768;
        const isSmallMobile = window.innerWidth <= 480;
        const isMediumMobile = window.innerWidth <= 600;
        
        let exclusionPadding = 120;
        if (isSmallMobile) {
            exclusionPadding = 25;
        } else if (isMediumMobile) {
            exclusionPadding = 35;
        } else if (isMobile) {
            exclusionPadding = 45;
        }
        
        const textExclusionArea = {
            left: textArea.left - exclusionPadding,
            right: textArea.right + exclusionPadding,
            top: textArea.top - exclusionPadding,
            bottom: textArea.bottom + exclusionPadding
        };
        
        const minSafeDistance = Math.max(
            (textArea.width / 2) + exclusionPadding,
            (textArea.height / 2) + exclusionPadding
        );
        
        let baseRadius = minSafeDistance + 50;
        if (isSmallMobile) {
            baseRadius = Math.min(minSafeDistance + 15, this.canvas.width * 0.2);
        } else if (isMediumMobile) {
            baseRadius = Math.min(minSafeDistance + 20, this.canvas.width * 0.22);
        } else if (isMobile) {
            baseRadius = Math.min(minSafeDistance + 25, this.canvas.width * 0.25);
        }
        
        let margin = 60;
        if (isSmallMobile) {
            margin = 10;
        } else if (isMediumMobile) {
            margin = 15;
        } else if (isMobile) {
            margin = 18;
        }
        
        let nodeBuffer = 50;
        if (isSmallMobile) {
            nodeBuffer = 15;
        } else if (isMediumMobile) {
            nodeBuffer = 20;
        } else if (isMobile) {
            nodeBuffer = 22;
        }
        
        // Reposition each existing node
        this.nodes.forEach((node, index) => {
            const nodeWidth = node.offsetWidth || 160;
            const nodeHeight = node.offsetHeight || 40;
            
            // Calculate new position using same logic as createNode
            const totalNodes = this.nodes.length;
            const angle = (index / totalNodes) * 2 * Math.PI + (Math.PI / totalNodes);
            const radiusVariation = isSmallMobile ? 15 : (isMediumMobile ? 20 : (isMobile ? 25 : 60));
            const radius = baseRadius + (Math.sin(index * 0.7) * radiusVariation);
            
            let x = textArea.centerX + Math.cos(angle) * radius - nodeWidth/2;
            let y = textArea.centerY + Math.sin(angle) * radius - nodeHeight/2;
            
            // Apply bounds
            const minX = margin;
            const maxX = this.canvas.width - margin - nodeWidth;
            const minY = margin;
            const maxY = this.canvas.height - margin - nodeHeight;
            
            x = Math.max(minX, Math.min(x, maxX));
            y = Math.max(minY, Math.min(y, maxY));
            
            // Handle text overlap
            if (this.overlapsWithText(x, y, nodeWidth, nodeHeight, textExclusionArea)) {
                const pushAngle = Math.atan2(y + nodeHeight/2 - textArea.centerY, x + nodeWidth/2 - textArea.centerX);
                const minDistanceFromText = baseRadius + exclusionPadding/2;
                
                x = textArea.centerX + Math.cos(pushAngle) * minDistanceFromText - nodeWidth/2;
                y = textArea.centerY + Math.sin(pushAngle) * minDistanceFromText - nodeHeight/2;
                
                x = Math.max(minX, Math.min(x, maxX));
                y = Math.max(minY, Math.min(y, maxY));
            }
            
            // Check for overlaps with other repositioned nodes and adjust if needed
            let attempts = 0;
            const maxAttempts = (isSmallMobile || isMediumMobile) ? 50 : 25;
            
            while (attempts < maxAttempts && this.overlapsWithRepositionedNodes(x, y, nodeWidth, nodeHeight, nodeBuffer, index)) {
                attempts++;
                
                if ((isSmallMobile || isMediumMobile) && attempts > 10) {
                    // Use grid fallback for mobile screens
                    const gridCols = 4;
                    const gridIndex = index + attempts;
                    const col = gridIndex % gridCols;
                    const row = Math.floor(gridIndex / gridCols);
                    
                    const gridWidth = this.canvas.width - (margin * 2);
                    const gridHeight = this.canvas.height - (margin * 2);
                    const cellWidth = gridWidth / gridCols;
                    const cellHeight = gridHeight / Math.ceil(totalNodes / gridCols);
                    
                    x = margin + (col * cellWidth) + (cellWidth - nodeWidth) / 2;
                    y = margin + (row * cellHeight) + (cellHeight - nodeHeight) / 2;
                    
                    if (!this.overlapsWithText(x, y, nodeWidth, nodeHeight, textExclusionArea)) {
                        break;
                    }
                } else {
                    // Adjust position systematically
                    const newAngle = angle + (attempts * 0.3);
                    const newRadius = baseRadius + 20 + (attempts * 15);
                    
                    x = textArea.centerX + Math.cos(newAngle) * newRadius - nodeWidth/2;
                    y = textArea.centerY + Math.sin(newAngle) * newRadius - nodeHeight/2;
                    
                    x = Math.max(minX, Math.min(x, maxX));
                    y = Math.max(minY, Math.min(y, maxY));
                }
            }
            
            // Apply the new position with smooth transition
            node.style.transition = 'all 0.3s ease-out';
            node.style.left = x + 'px';
            node.style.top = y + 'px';
        });
        
        // Remove transition after animation completes
        setTimeout(() => {
            this.nodes.forEach(node => {
                node.style.transition = '';
            });
        }, 300);
    }
    
    overlapsWithRepositionedNodes(x, y, width, height, buffer, currentIndex) {
        // Check overlap with nodes that have already been repositioned
        for (let i = 0; i < currentIndex; i++) {
            const existingNode = this.nodes[i];
            const existingX = parseInt(existingNode.style.left);
            const existingY = parseInt(existingNode.style.top);
            const existingWidth = existingNode.offsetWidth || 160;
            const existingHeight = existingNode.offsetHeight || 40;
            
            if (!(x + width + buffer < existingX || 
                  x > existingX + existingWidth + buffer || 
                  y + height + buffer < existingY || 
                  y > existingY + existingHeight + buffer)) {
                return true;
            }
        }
        return false;
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
        
        // Show viz area and department button
        setTimeout(() => {
            this.showVizArea();
            this.showDepartmentButton(departmentId);
            this.createPartnershipVisualization(departmentId);
        }, 400);
    }
    
    exitDetailView() {
        if (!this.isDetailView) return;
        this.isDetailView = false;
        
        // Hide data card, department button and viz area
        this.hideDataCard();
        this.hideDepartmentButton();
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
    
    showDepartmentButton(departmentId) {
        if (!this.departmentData) {
            console.warn('Department data not loaded yet');
            return;
        }
        
        const department = this.departmentData.departments.find(d => d.id === departmentId);
        if (!department) {
            console.warn('Department not found:', departmentId);
            return;
        }
        
        const container = document.getElementById('deptInfoContainer');
        const button = document.getElementById('deptInfoButton');
        const text = document.getElementById('deptInfoText');
        
        text.textContent = department.name;
        container.style.display = 'block';
        
        // Store current department for the overlay
        this.currentDepartmentId = departmentId;
    }
    
    hideDepartmentButton() {
        const container = document.getElementById('deptInfoContainer');
        container.style.display = 'none';
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
    
    setupHoverHandling() {
        // Add mouse event listeners to visualization canvas
        this.vizCanvas.addEventListener('mousemove', (e) => {
            const rect = this.vizCanvas.getBoundingClientRect();
            this.mouseX = e.clientX - rect.left;
            this.mouseY = e.clientY - rect.top;
            
            // Check if hovering over any degree node
            this.updateHoveredNode();
        });
        
        this.vizCanvas.addEventListener('mouseleave', () => {
            this.hoveredNode = null;
        });
    }
    
    updateHoveredNode() {
        let newHoveredNode = null;
        
        // Only check degree nodes for hover
        for (const node of this.vizNodes) {
            if (node.type === 'degree') {
                const distance = Math.sqrt(
                    Math.pow(this.mouseX - node.x, 2) + 
                    Math.pow(this.mouseY - node.y, 2)
                );
                
                // Check if mouse is within hover radius (larger than visual radius)
                if (distance <= node.radius + 30) { // 30px hover padding
                    newHoveredNode = node;
                    break;
                }
            }
        }
        
        // Update cursor style
        if (newHoveredNode && newHoveredNode.tracks && newHoveredNode.tracks.length > 0) {
            this.vizCanvas.style.cursor = 'pointer';
        } else {
            this.vizCanvas.style.cursor = 'default';
        }
        
        this.hoveredNode = newHoveredNode;
    }

    hideVizArea() {
        const vizArea = document.getElementById('vizArea');
        vizArea.classList.remove('show');
    }
    
    createPartnershipVisualization(departmentId) {
        if (!this.departmentData) return;
        
        const department = this.departmentData.departments.find(d => d.id === departmentId);
        if (!department) {
            console.error('Department not found:', departmentId);
            console.log('Available departments:', this.departmentData.departments.map(d => d.id));
            return;
        }
        
        console.log('Creating visualization for:', department.name, 'with ID:', departmentId);
        
        // Check cache first
        const cacheKey = `${departmentId}_${this.vizCanvas.width}_${this.vizCanvas.height}`;
        if (this.layoutCache.has(cacheKey)) {
            const cachedLayout = this.layoutCache.get(cacheKey);
            this.vizNodes = [...cachedLayout.nodes];
            this.vizLinks = [...cachedLayout.links];
            console.log('Using cached layout for', departmentId);
            
            // Animate links
            setTimeout(() => {
                this.animateVizLinks();
            }, 100);
            return;
        }
        
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
            radius: 25
        });
        
        // Process degrees
        const processedDegrees = this.processDegreeHierarchy(department.degrees || []);
        
        // Collect all nodes to place
        const nodesToPlace = [];
        
        // Add degree nodes
        processedDegrees.mainPrograms.forEach(degree => {
            const itemId = degree.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
            nodesToPlace.push({
                id: itemId,
                name: degree.name,
                type: 'degree',
                radius: 12,
                tracks: processedDegrees.tracks[degree.name] || []
            });
        });
        
        // Add internal partners
        (department.internalPartners || []).forEach(partner => {
            const itemId = partner.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
            nodesToPlace.push({
                id: itemId,
                name: partner,
                type: 'internal',
                radius: 14
            });
        });
        
        // Add external partners
        (department.externalPartners || []).forEach(partner => {
            const itemId = partner.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
            nodesToPlace.push({
                id: itemId,
                name: partner,
                type: 'external',
                radius: 10
            });
        });
        
        // Use genetic algorithm approach to find best arrangement
        this.findOptimalLayout(nodesToPlace, canvasWidth, canvasHeight, centerX, centerY);
        
        // Create links
        this.vizNodes.forEach(node => {
            if (node.type !== 'central') {
                this.vizLinks.push({
                    source: department.id,
                    target: node.id,
                    type: node.type,
                    opacity: 0
                });
            }
        });
        
        // Cache the layout for future use
        const layoutCacheKey = `${departmentId}_${canvasWidth}_${canvasHeight}`;
        this.layoutCache.set(layoutCacheKey, {
            nodes: [...this.vizNodes],
            links: [...this.vizLinks]
        });
        
        // Animate links
        setTimeout(() => {
            this.animateVizLinks();
        }, 500);
    }

    findOptimalLayout(nodesToPlace, canvasWidth, canvasHeight, centerX, centerY) {
        // Get current department name for enhanced handling of complex departments
        const currentDept = this.vizNodes.find(n => n.type === 'central');
        const partnerCount = nodesToPlace.length;
        
        const isSmallDept = partnerCount <= 8;
        const isComplexDept = currentDept && (
            currentDept.name.includes('Visual Arts') || 
            currentDept.name.includes('Performing Arts') ||
            currentDept.name.includes('Modern Languages and Literatures')
        );
        
        // Detect very complex departments with 20+ partners
        const isVeryComplexDept = currentDept && (
            currentDept.name.includes('School of Performing Arts') || 
            currentDept.name.includes('School of Visual Arts and Design')
        );
        
        // Adjust attempts based on complexity - fewer attempts for small departments to find solutions faster
        const nodeCount = nodesToPlace.length;
        const baseAttempts = isSmallDept ? Math.min(400, nodeCount * 20) : isVeryComplexDept ? Math.min(600, nodeCount * 40) : Math.min(800, nodeCount * 60);
        const maxAttempts = isSmallDept ? Math.min(600, baseAttempts + (nodeCount * 30)) : isVeryComplexDept ? Math.min(1200, baseAttempts + (nodeCount * 60)) : Math.min(1500, baseAttempts + (nodeCount * 80));
        
        let bestScore = -Infinity;
        let bestLayout = null;
        
        // Adjusted target score for complex departments (much more lenient for small departments)
        const targetScore = isSmallDept ? nodeCount * 0.8 : isVeryComplexDept ? nodeCount * 1.4 : nodeCount * 1.8;
        
        console.log(`Optimizing layout for ${nodeCount} nodes (complex: ${isComplexDept}, very complex: ${isVeryComplexDept}) with ${maxAttempts} attempts...`);
        
        // Try grid-based approach first for better distribution
        const gridLayout = this.generateGridBasedLayout(nodesToPlace, canvasWidth, canvasHeight, centerX, centerY);
        const gridScore = this.scoreLayout(gridLayout, canvasWidth, canvasHeight, isComplexDept, isSmallDept);
        bestScore = gridScore;
        bestLayout = [...gridLayout];
        
        // Then improve with random attempts
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            const layout = this.generateRandomLayout(nodesToPlace, canvasWidth, canvasHeight, centerX, centerY);
            const score = this.scoreLayout(layout, canvasWidth, canvasHeight, isComplexDept, isSmallDept);
            
            if (score > bestScore) {
                bestScore = score;
                bestLayout = [...layout];
                
                // Early termination for good solutions
                if (score >= targetScore) {
                    console.log(`Good solution found (score: ${score.toFixed(2)}) at attempt ${attempt}`);
                    break;
                }
            }
            
            // Less frequent progress updates for performance
            if (attempt % 500 === 0 && attempt > 0) {
                console.log(`Layout attempt ${attempt}, best score: ${bestScore.toFixed(2)}`);
            }
        }
        
        console.log(`Final best score: ${bestScore.toFixed(2)} for ${nodeCount} nodes`);
        
        // Apply best layout
        if (bestLayout) {
            bestLayout.forEach(node => {
                this.vizNodes.push(node);
            });
        } else {
            console.warn('No valid layout found! Using fallback.');
            this.createFallbackLayout(nodesToPlace, canvasWidth, canvasHeight, centerX, centerY);
        }
    }

    generateGridBasedLayout(nodesToPlace, canvasWidth, canvasHeight, centerX, centerY) {
        const layout = [];
        
        // Get current department for complexity detection
        const currentDept = this.vizNodes.find(n => n.type === 'central');
        const partnerCount = nodesToPlace.length;
        
        const isSmallDept = partnerCount <= 8;
        const isComplexDept = currentDept && (
            currentDept.name.includes('Visual Arts') || 
            currentDept.name.includes('Performing Arts') ||
            currentDept.name.includes('Modern Languages and Literatures')
        );
        const isVeryComplexDept = currentDept && (
            currentDept.name.includes('School of Performing Arts') || 
            currentDept.name.includes('School of Visual Arts and Design')
        );
        
        // Adaptive margin based on complexity - smaller margins for small departments
        const margin = isVeryComplexDept ? 30 : isComplexDept ? 35 : isSmallDept ? 25 : 40;
        
        // Center exclusion zone - same as random layout
        const centerRadius = 160;
        
        // Group nodes by type for systematic placement
        const nodesByType = {
            'degree': nodesToPlace.filter(n => n.type === 'degree'),
            'internal': nodesToPlace.filter(n => n.type === 'internal'),
            'external': nodesToPlace.filter(n => n.type === 'external')
        };
        
        // Enhanced canvas usage for complex departments
        const usableWidth = canvasWidth - (margin * 2);
        const usableHeight = canvasHeight - (margin * 2);
        
        // Simple legend avoidance - just the bottom right corner
        const legendWidth = 200;
        const legendHeight = 180;
        
        // Enhanced grid sectors for complex departments with better space distribution
        const baseSectors = [
            // Top row - spread out to avoid clustering
            { x: 0.2, y: 0.08, weight: 1.0, type: 'degree' },
            { x: 0.8, y: 0.08, weight: 1.0, type: 'degree' },
            
            // Upper sides - good for internal partners
            { x: 0.05, y: 0.2, weight: 1.1, type: 'internal' },
            { x: 0.95, y: 0.2, weight: 1.1, type: 'internal' },
            
            // Mid-upper sides
            { x: 0.03, y: 0.35, weight: 1.2, type: 'external' },
            { x: 0.97, y: 0.35, weight: 1.2, type: 'external' },
            
            // Middle sides - prioritize external
            { x: 0.02, y: 0.5, weight: 1.2, type: 'external' },
            { x: 0.98, y: 0.5, weight: 1.2, type: 'external' },
            
            // Lower sides - great for external partners
            { x: 0.05, y: 0.65, weight: 1.1, type: 'external' },
            { x: 0.95, y: 0.65, weight: 1.1, type: 'external' },
            
            // Bottom area - utilize empty space, avoid legend
            { x: 0.15, y: 0.8, weight: 0.9, type: 'external' },
            { x: 0.35, y: 0.85, weight: 0.8, type: 'external' },
            { x: 0.55, y: 0.88, weight: 0.7, type: 'external' },
            
            // Additional positions for degrees (mid-range)
            { x: 0.25, y: 0.25, weight: 1.0, type: 'degree' },
            { x: 0.75, y: 0.25, weight: 1.0, type: 'degree' },
            
            // Additional internal positions
            { x: 0.15, y: 0.45, weight: 1.1, type: 'internal' },
            { x: 0.85, y: 0.45, weight: 1.1, type: 'internal' },
        ];
        
        // Add extra sectors for very complex departments focused on filling empty areas
        const extraSectors = isVeryComplexDept ? [
            // Lower area utilization
            { x: 0.25, y: 0.75, weight: 0.8, type: 'external' },
            { x: 0.45, y: 0.8, weight: 0.8, type: 'external' },
            { x: 0.65, y: 0.78, weight: 0.7, type: 'external' },
            
            // Far edges
            { x: 0.01, y: 0.15, weight: 1.0, type: 'external' },
            { x: 0.99, y: 0.15, weight: 1.0, type: 'external' },
            { x: 0.01, y: 0.75, weight: 0.9, type: 'external' },
            { x: 0.99, y: 0.75, weight: 0.9, type: 'external' },
        ] : isSmallDept ? [
            // Force small departments to use all quadrants
            { x: 0.1, y: 0.1, weight: 1.2, type: 'degree' },
            { x: 0.9, y: 0.1, weight: 1.2, type: 'internal' },
            { x: 0.1, y: 0.9, weight: 0.9, type: 'external' },
            { x: 0.9, y: 0.9, weight: 0.9, type: 'external' },
            { x: 0.5, y: 0.05, weight: 1.1, type: 'degree' },
            { x: 0.05, y: 0.5, weight: 1.1, type: 'internal' },
            { x: 0.95, y: 0.5, weight: 1.1, type: 'internal' },
            { x: 0.5, y: 0.85, weight: 0.8, type: 'external' },
        ] : [];
        
        const sectors = [...baseSectors, ...extraSectors];
        
        // Separate sectors by preferred type for better distribution
        const sectorsByType = {
            'degree': sectors.filter(s => s.type === 'degree' || !s.type),
            'internal': sectors.filter(s => s.type === 'internal' || !s.type),
            'external': sectors.filter(s => s.type === 'external' || !s.type)
        };
        
        
        // Place each type with intelligent sector assignment and proper spacing
        Object.keys(nodesByType).forEach(nodeType => {
            const nodes = nodesByType[nodeType];
            const typeSectors = sectorsByType[nodeType] || sectors;
            
            // Enhanced type spread for complex departments - reasonable spacing for small departments
            let typeSpread = 1.0;
            if (isVeryComplexDept) {
                typeSpread = nodeType === 'external' ? 1.8 : nodeType === 'internal' ? 1.4 : 1.0;
            } else if (isComplexDept) {
                typeSpread = nodeType === 'external' ? 1.5 : nodeType === 'internal' ? 1.2 : 0.9;
            } else if (isSmallDept) {
                typeSpread = nodeType === 'external' ? 1.6 : nodeType === 'internal' ? 1.4 : 1.2;
            } else {
                typeSpread = nodeType === 'external' ? 1.2 : nodeType === 'internal' ? 1.0 : 0.8;
            }
            
            nodes.forEach((nodeTemplate, index) => {
                // Force quadrant distribution for small departments to prevent clustering
                let sectorIndex, sector;
                if (isSmallDept && nodes.length > 2) {
                    // Systematically distribute across quadrants for better balance
                    const quadrant = index % 4;
                    const sectorsPerQuadrant = Math.floor(typeSectors.length / 4);
                    const quadrantStart = quadrant * sectorsPerQuadrant;
                    const availableInQuadrant = typeSectors.slice(quadrantStart, quadrantStart + sectorsPerQuadrant);
                    if (availableInQuadrant.length > 0) {
                        sectorIndex = Math.floor(Math.random() * availableInQuadrant.length);
                        sector = availableInQuadrant[sectorIndex];
                    } else {
                        sectorIndex = index % typeSectors.length;
                        sector = typeSectors[sectorIndex];
                    }
                } else {
                    // Use type-specific sectors but add variation to prevent exact overlap
                    sectorIndex = index % typeSectors.length;
                    sector = typeSectors[sectorIndex];
                }
                
                // Add progressive offset based on index to spread similar types
                const progressiveOffset = {
                    x: (index * 0.05) % 0.2 - 0.1, // ±10% offset
                    y: ((index * 0.07) % 0.16) - 0.08 // ±8% offset
                };
                
                // Calculate position with enhanced canvas usage and variation
                const baseX = margin + (usableWidth * Math.max(0, Math.min(1, sector.x + progressiveOffset.x)));
                const baseY = margin + (usableHeight * Math.max(0, Math.min(1, sector.y + progressiveOffset.y)));
                
                // Enhanced variation to prevent overlap
                const baseVariation = isVeryComplexDept ? 70 : isComplexDept ? 60 : 50;
                const variation = baseVariation * typeSpread;
                const offsetX = (Math.random() - 0.5) * variation;
                const offsetY = (Math.random() - 0.5) * variation;
                
                let x = baseX + offsetX;
                let y = baseY + offsetY;
                
                // Add spacing check to prevent direct overlap
                let attempts = 0;
                while (attempts < 5) {
                    let tooClose = false;
                    for (let i = 0; i < layout.length; i++) {
                        const existing = layout[i];
                        const distance = Math.sqrt((x - existing.x) ** 2 + (y - existing.y) ** 2);
                        const minDistance = 60; // Minimum distance between nodes
                        
                        if (distance < minDistance) {
                            tooClose = true;
                            break;
                        }
                    }
                    
                    if (!tooClose) break;
                    
                    // Adjust position if too close
                    const adjustAngle = Math.random() * Math.PI * 2;
                    const adjustDistance = 80 + Math.random() * 40;
                    x = baseX + Math.cos(adjustAngle) * adjustDistance;
                    y = baseY + Math.sin(adjustAngle) * adjustDistance;
                    attempts++;
                }
                
                // Special handling for degrees with tracks - keep them closer to center (reduced distance)
                if (nodeTemplate.type === 'degree' && nodeTemplate.tracks && nodeTemplate.tracks.length > 0) {
                    const distanceFromCenter = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
                    const maxDistanceForTracks = Math.min(canvasWidth, canvasHeight) * 0.24; // Reduced from 25% to 24%
                    
                    if (distanceFromCenter > maxDistanceForTracks) {
                        const angle = Math.atan2(y - centerY, x - centerX);
                        x = centerX + Math.cos(angle) * maxDistanceForTracks;
                        y = centerY + Math.sin(angle) * maxDistanceForTracks;
                    }
                }
                
                // Final bounds check and center exclusion enforcement
                const effectiveMargin = isVeryComplexDept ? margin * 0.7 : margin;
                x = Math.max(effectiveMargin, Math.min(x, canvasWidth - effectiveMargin));
                y = Math.max(effectiveMargin, Math.min(y, canvasHeight - effectiveMargin));
                
                // CRITICAL: Final center exclusion check after all adjustments
                const finalDistanceFromCenter = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
                const finalCenterRadius = isComplexDept ? centerRadius + 40 : centerRadius + 20;
                if (finalDistanceFromCenter < finalCenterRadius) {
                    // Force position outside center exclusion zone
                    const currentAngle = Math.atan2(y - centerY, x - centerX);
                    x = centerX + Math.cos(currentAngle) * finalCenterRadius;
                    y = centerY + Math.sin(currentAngle) * finalCenterRadius;
                    console.log(`FORCED repositioning of ${nodeTemplate.name} outside center exclusion`);
                }
                
                // Only avoid legend if directly overlapping
                if (x > canvasWidth - legendWidth - 30 && y > canvasHeight - legendHeight - 30) {
                    // Simple repositioning - move left or up
                    if (canvasWidth - legendWidth - 50 > effectiveMargin) {
                        x = canvasWidth - legendWidth - 50;
                    } else {
                        y = canvasHeight - legendHeight - 50;
                    }
                }
                
                layout.push({
                    ...nodeTemplate,
                    x: x,
                    y: y
                });
            });
        });
        
        // FINAL PASS: Aggressively move any nodes still too close to center (same as random layout)
        const finalCenterRadius = isComplexDept ? centerRadius + 80 : centerRadius + 50;
        for (let i = 0; i < layout.length; i++) {
            const node = layout[i];
            const distanceFromCenter = Math.sqrt(
                Math.pow(node.x - centerX, 2) + Math.pow(node.y - centerY, 2)
            );
            
            if (distanceFromCenter < finalCenterRadius) {
                console.log(`GRID FINAL PASS: Moving ${node.name} away from center (distance: ${distanceFromCenter.toFixed(1)})`);
                
                // Calculate angle and push out to safe distance
                const angle = Math.atan2(node.y - centerY, node.x - centerX);
                const safeDistance = finalCenterRadius + 20;
                
                node.x = centerX + Math.cos(angle) * safeDistance;
                node.y = centerY + Math.sin(angle) * safeDistance;
                
                // Ensure still within bounds
                node.x = Math.max(margin, Math.min(node.x, canvasWidth - margin));
                node.y = Math.max(margin, Math.min(node.y, canvasHeight - margin));
            }
        }
        
        return layout;
    }

    generateRandomLayout(nodesToPlace, canvasWidth, canvasHeight, centerX, centerY) {
        const layout = [];
        
        // Get current department for complexity detection
        const currentDept = this.vizNodes.find(n => n.type === 'central');
        const partnerCount = nodesToPlace.length;
        
        const isSmallDept = partnerCount <= 8;
        const isComplexDept = currentDept && (
            currentDept.name.includes('Visual Arts') || 
            currentDept.name.includes('Performing Arts') ||
            currentDept.name.includes('Modern Languages and Literatures')
        );
        const isVeryComplexDept = currentDept && (
            currentDept.name.includes('School of Performing Arts') || 
            currentDept.name.includes('School of Visual Arts and Design')
        );
        
        // Adaptive margin with extra space for text buffer
        const margin = isVeryComplexDept ? 40 : isComplexDept ? 60 : isSmallDept ? 40 : 50;
        
        // Calculate exclusion zones
        const centerRadius = 160; // Much larger exclusion around department title
        const legendExclusionZone = {
            left: canvasWidth - 280,
            right: canvasWidth,
            top: canvasHeight - 220,
            bottom: canvasHeight
        };
        
        // Legacy legend dimensions for compatibility
        const legendWidth = 200;
        const legendHeight = 180;
        const legendMargin = 30;        const usableWidth = canvasWidth - (margin * 2);
        const usableHeight = canvasHeight - (margin * 2);
        const maxRadius = Math.min(usableWidth, usableHeight) / 2;
        
        // Enhanced spread for complex departments - balanced spacing for small departments
        const verticalSpreadMultiplier = isVeryComplexDept ? 0.8 : isComplexDept ? 0.75 : isSmallDept ? 0.95 : 0.85;
        const horizontalSpreadMultiplier = isVeryComplexDept ? 0.8 : isComplexDept ? 0.75 : isSmallDept ? 0.95 : 0.85;
        const verticalSpread = canvasHeight * verticalSpreadMultiplier;
        const horizontalSpread = canvasWidth * horizontalSpreadMultiplier;
        
        // Enhanced sector count for complex departments - force more sectors for small departments to spread around
        const totalNodes = nodesToPlace.length;
        const baseSectors = isVeryComplexDept ? 24 : isComplexDept ? 20 : isSmallDept ? 20 : 16;
        const sectors = Math.max(baseSectors, Math.ceil(totalNodes / 0.8)); // More aggressive sector creation
        const angleStep = (Math.PI * 2) / sectors;
        
        // Group nodes by type for better organization
        const nodesByType = {
            'degree': nodesToPlace.filter(n => n.type === 'degree'),
            'internal': nodesToPlace.filter(n => n.type === 'internal'),
            'external': nodesToPlace.filter(n => n.type === 'external')
        };
        
        // Enhanced radius ranges for complex departments (balanced radius for small departments)
        const radiusMultiplier = isVeryComplexDept ? 1.15 : isComplexDept ? 1.05 : isSmallDept ? 1.2 : 1.0;
        const radiusRanges = {
            'degree': { 
                min: Math.max(maxRadius * 0.3 * radiusMultiplier, (isComplexDept ? centerRadius + 60 : centerRadius + 40)), 
                max: maxRadius * 0.6 * radiusMultiplier,
                verticalTier: -verticalSpread * 0.15,
                tierVariation: verticalSpread * (isComplexDept ? 0.12 : 0.1)
            },
            'internal': { 
                min: Math.max(maxRadius * 0.5 * radiusMultiplier, (isComplexDept ? centerRadius + 60 : centerRadius + 40)), 
                max: maxRadius * 0.8 * radiusMultiplier,
                verticalTier: 0,
                tierVariation: verticalSpread * (isComplexDept ? 0.1 : 0.08)
            },
            'external': { 
                min: Math.max(maxRadius * 0.7 * radiusMultiplier, (isComplexDept ? centerRadius + 60 : centerRadius + 40)),
                max: maxRadius * 1.05 * radiusMultiplier,
                verticalTier: verticalSpread * 0.15,
                tierVariation: verticalSpread * (isComplexDept ? 0.12 : 0.1)
            }
        };
        
        let sectorIndex = 0;
        
        // Place nodes with intelligent distribution to avoid overlap and use space efficiently
        Object.keys(nodesByType).forEach(nodeType => {
            nodesByType[nodeType].forEach((nodeTemplate, typeIndex) => {
                const range = radiusRanges[nodeType];
                
                // Enhanced radius tier variation for complex departments
                const tierCount = isComplexDept ? 6 : 4;
                const radiusTier = (typeIndex % tierCount) * (isComplexDept ? 0.12 : 0.15);
                const baseRadius = range.min + (range.max - range.min) * (0.1 + radiusTier);
                const randomnessMultiplier = isComplexDept ? 0.15 : 0.12; // Increased randomness to prevent overlap
                const radius = baseRadius + (Math.random() - 0.5) * maxRadius * randomnessMultiplier;
                
                // More dynamic angular distribution with better spacing - force balanced quadrant usage for small departments
                let baseSector, baseAngle;
                if (isSmallDept && nodesByType[nodeType].length > 2) {
                    // Force systematic quadrant distribution to prevent clustering
                    const quadrant = typeIndex % 4;
                    const sectorsPerQuadrant = Math.floor(sectors / 4);
                    const quadrantStart = quadrant * sectorsPerQuadrant;
                    const quadrantEnd = quadrantStart + sectorsPerQuadrant;
                    baseSector = quadrantStart + Math.floor(Math.random() * sectorsPerQuadrant);
                    baseAngle = baseSector * angleStep;
                } else if (isSmallDept) {
                    baseSector = Math.floor(Math.random() * sectors); // Random sector for small departments
                    baseAngle = baseSector * angleStep;
                } else {
                    baseSector = (sectorIndex % sectors); // Sequential for others
                    baseAngle = baseSector * angleStep;
                }
                
                // Add progressive offset for same-type nodes to prevent overlap
                const typeOffset = (typeIndex * Math.PI * 2) / Math.max(nodesByType[nodeType].length, 8);
                const angleVariationMultiplier = isSmallDept ? 1.2 : isComplexDept ? 0.8 : 0.7; // More variation for small departments
                const angleVariation = (Math.random() - 0.5) * angleStep * angleVariationMultiplier;
                let angle = baseAngle + typeOffset + angleVariation;
                
                // Calculate initial base position
                let baseX = centerX + Math.cos(angle) * radius;
                let baseY = centerY + Math.sin(angle) * radius;
                
                // Enhanced collision detection and repositioning for ALL departments
                let repositionAttempts = 0;
                const maxRepositionAttempts = isComplexDept ? 25 : isSmallDept ? 15 : 10;
                
                while (repositionAttempts < maxRepositionAttempts) {
                    let hasCollision = false;
                    
                    // Check for center overlap FIRST - much larger exclusion for complex departments
                    const distanceFromCenter = Math.sqrt(
                        Math.pow(baseX - centerX, 2) + Math.pow(baseY - centerY, 2)
                    );
                    const effectiveCenterRadius = isComplexDept ? centerRadius + 60 : centerRadius + 30;
                    if (distanceFromCenter < effectiveCenterRadius) {
                        hasCollision = true;
                        console.log(`Center collision detected for ${nodeTemplate.name}: distance=${distanceFromCenter.toFixed(1)}, threshold=${effectiveCenterRadius}`);
                    }
                    
                    // Check for legend overlap
                    if (!hasCollision && baseX >= legendExclusionZone.left && baseX <= legendExclusionZone.right &&
                        baseY >= legendExclusionZone.top && baseY <= legendExclusionZone.bottom) {
                        hasCollision = true;
                    }
                    
                    // Check for screen boundaries with text buffer
                    if (!hasCollision) {
                        const textWidth = this.estimateTextWidth(nodeTemplate.name, nodeTemplate.type) || 100;
                        if (baseX - textWidth/2 < margin || baseX + textWidth/2 > canvasWidth - margin ||
                            baseY < margin + 20 || baseY > canvasHeight - margin - 20) {
                            hasCollision = true;
                        }
                    }
                    
                    // Check for collisions with already placed nodes (for ALL departments now)
                    if (!hasCollision) {
                        for (let existing of layout) {
                            const distance = Math.sqrt(
                                Math.pow(baseX - existing.x, 2) + Math.pow(baseY - existing.y, 2)
                            );
                            
                            // MUCH more aggressive minimum distances for degree programs
                            let requiredDistance;
                            if (nodeTemplate.type === 'degree' && existing.type === 'degree') {
                                requiredDistance = isComplexDept ? 180 : 150; // Force degree programs MUCH further apart
                            } else if (nodeTemplate.type === 'degree' || existing.type === 'degree') {
                                requiredDistance = isComplexDept ? 140 : 120; // Degree to non-degree spacing
                            } else {
                                // For non-degree nodes, calculate based on text size
                                const textWidthA = this.estimateTextWidth(nodeTemplate.name, nodeTemplate.type) || 100;
                                const textWidthB = this.estimateTextWidth(existing.name, existing.type) || 100;
                                requiredDistance = (textWidthA + textWidthB) / 2 + (isComplexDept ? 100 : 80);
                            }
                            
                            if (distance < requiredDistance) {
                                hasCollision = true;
                                console.log(`Collision: ${nodeTemplate.name} too close to ${existing.name}, distance=${distance.toFixed(1)}, required=${requiredDistance}`);
                                break;
                            }
                        }
                    }
                    
                    if (!hasCollision) break;
                    
                    // Reposition: try a new random angle and radius
                    const newQuadrant = Math.floor(Math.random() * 4);
                    const sectorsPerQuadrant = Math.floor(sectors / 4);
                    const quadrantStart = newQuadrant * sectorsPerQuadrant;
                    const newBaseSector = quadrantStart + Math.floor(Math.random() * sectorsPerQuadrant);
                    const newBaseAngle = newBaseSector * angleStep;
                    
                    const newTypeOffset = (Math.random() * Math.PI * 2) / Math.max(nodesByType[nodeType].length, 8);
                    const newAngleVariation = (Math.random() - 0.5) * angleStep * 1.2;
                    angle = newBaseAngle + newTypeOffset + newAngleVariation;
                    
                    // Try different radius within range, but ENSURE it's outside center exclusion
                    const minRadiusFromCenter = (isComplexDept ? centerRadius + 80 : centerRadius + 50); // Even larger buffer for complex departments
                    const adjustedMinRadius = Math.max(range.min, minRadiusFromCenter);
                    
                    // For degree programs, try to use MORE of the available space
                    let radiusMultiplier = 1.0;
                    if (nodeTemplate.type === 'degree') {
                        radiusMultiplier = isComplexDept ? 1.4 : 1.2; // Push degree programs further out
                    }
                    
                    const newRadius = adjustedMinRadius + (Math.random() * Math.max(0, range.max - adjustedMinRadius)) * radiusMultiplier;
                    
                    baseX = centerX + Math.cos(angle) * newRadius;
                    baseY = centerY + Math.sin(angle) * newRadius;
                    
                    repositionAttempts++;
                }
                
                // Enhanced tier positioning with better separation
                const tierVariationMultiplier = isComplexDept ? 4 : 3;
                const tierOffset = range.verticalTier + (typeIndex % tierVariationMultiplier - Math.floor(tierVariationMultiplier/2)) * range.tierVariation;
                const horizontalJitterMultiplier = isComplexDept ? 0.12 : 0.1; // Increased jitter
                const horizontalJitter = (typeIndex % (isComplexDept ? 7 : 5) - Math.floor((isComplexDept ? 7 : 5)/2)) * (horizontalSpread * horizontalJitterMultiplier);
                
                let x = baseX + horizontalJitter;
                let y = baseY + tierOffset;
                
                // Add spacing check to prevent direct overlap
                let attempts = 0;
                while (attempts < 5) {
                    let tooClose = false;
                    for (let i = 0; i < layout.length; i++) {
                        const existing = layout[i];
                        const distance = Math.sqrt((x - existing.x) ** 2 + (y - existing.y) ** 2);
                        const minDistance = 60; // Minimum distance between nodes
                        
                        if (distance < minDistance) {
                            tooClose = true;
                            break;
                        }
                    }
                    
                    if (!tooClose) break;
                    
                    // Adjust position if too close
                    const adjustAngle = Math.random() * Math.PI * 2;
                    const adjustDistance = 80 + Math.random() * 40;
                    x = baseX + Math.cos(adjustAngle) * adjustDistance;
                    y = baseY + Math.sin(adjustAngle) * adjustDistance;
                    attempts++;
                }
                
                // Special handling for degrees with tracks - keep them closer to center for track visibility (reduced distance)
                if (nodeTemplate.type === 'degree' && nodeTemplate.tracks && nodeTemplate.tracks.length > 0) {
                    const distanceFromCenter = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
                    const maxDistanceForTracks = Math.min(canvasWidth, canvasHeight) * 0.26; // Reduced from 28% to 26%
                    
                    if (distanceFromCenter > maxDistanceForTracks) {
                        const currentAngle = Math.atan2(y - centerY, x - centerX);
                        x = centerX + Math.cos(currentAngle) * maxDistanceForTracks;
                        y = centerY + Math.sin(currentAngle) * maxDistanceForTracks;
                    }
                }
                
                // Enhanced bounds checking for complex departments
                const effectiveMargin = isVeryComplexDept ? margin * 0.8 : margin;
                x = Math.max(effectiveMargin, Math.min(x, canvasWidth - effectiveMargin));
                y = Math.max(effectiveMargin, Math.min(y, canvasHeight - effectiveMargin));
                
                // Only avoid legend if directly overlapping
                if (x > legendExclusionZone.left && y > legendExclusionZone.top) {
                    // Simple repositioning - move left or up
                    if (legendExclusionZone.left - effectiveMargin > effectiveMargin) {
                        x = legendExclusionZone.left - 20;
                    } else {
                        y = legendExclusionZone.top - 20;
                    }
                }
                
                layout.push({
                    ...nodeTemplate,
                    x: x,
                    y: y
                });
                
                sectorIndex++;
            });
        });
        
        // FINAL PASS: Aggressively move any nodes still too close to center
        const finalCenterRadius = isComplexDept ? centerRadius + 80 : centerRadius + 50;
        for (let i = 0; i < layout.length; i++) {
            const node = layout[i];
            const distanceFromCenter = Math.sqrt(
                Math.pow(node.x - centerX, 2) + Math.pow(node.y - centerY, 2)
            );
            
            if (distanceFromCenter < finalCenterRadius) {
                console.log(`FINAL PASS: Moving ${node.name} away from center (distance: ${distanceFromCenter.toFixed(1)})`);
                
                // Calculate angle and push out to safe distance
                const angle = Math.atan2(node.y - centerY, node.x - centerX);
                const safeDistance = finalCenterRadius + 20;
                
                node.x = centerX + Math.cos(angle) * safeDistance;
                node.y = centerY + Math.sin(angle) * safeDistance;
                
                // Ensure still within bounds
                node.x = Math.max(margin, Math.min(node.x, canvasWidth - margin));
                node.y = Math.max(margin, Math.min(node.y, canvasHeight - margin));
            }
        }
        
        return layout;
    }

    createFallbackLayout(nodesToPlace, canvasWidth, canvasHeight, centerX, centerY) {
        console.log('Creating fallback layout for', nodesToPlace.length, 'nodes');
        const margin = 80;
        const maxRadius = Math.min(canvasWidth - margin * 2, canvasHeight - margin * 2) / 2;
        
        // Check if this is a complex department for smaller text
        const currentDept = this.vizNodes.find(n => n.type === 'central');
        const isComplexDept = currentDept && (
            currentDept.name.includes('Visual Arts') || 
            currentDept.name.includes('Performing Arts')
        );
        
        // Simple circular layout as fallback
        nodesToPlace.forEach((nodeTemplate, index) => {
            const angle = (index / nodesToPlace.length) * Math.PI * 2;
            const radius = maxRadius * 0.7 + (index % 3) * (maxRadius * 0.1); // Three radius tiers
            
            const x = centerX + Math.cos(angle) * radius;
            const y = centerY + Math.sin(angle) * radius;
            
            // Ensure within bounds
            const boundedPos = this.ensureWithinBounds(x, y, canvasWidth, canvasHeight, margin);
            
            this.vizNodes.push({
                ...nodeTemplate,
                x: boundedPos.x,
                y: boundedPos.y,
                textWidth: this.estimateTextWidth(nodeTemplate.name, nodeTemplate.type, isComplexDept),
                textHeight: this.estimateTextHeight(nodeTemplate.name, nodeTemplate.type, isComplexDept)
            });
        });
    }

    scoreLayout(layout, canvasWidth, canvasHeight, isComplexDept = false, isSmallDept = false) {
        let score = 3000; // Higher base score for better layouts
        
        // Center coordinates for line intersection checks
        const centerX = canvasWidth / 2;
        const centerY = canvasHeight / 2;
        
        // Create central node for overlap checking
        const centralNode = {
            x: centerX,
            y: centerY,
            type: 'central',
            radius: 25,
            textWidth: 200,
            textHeight: 30
        };
        
        // Enhanced overlap detection with text bounds
        for (let i = 0; i < layout.length; i++) {
            const nodeA = layout[i];
            
            // Estimate text bounds more accurately
            const textWidthA = this.estimateTextWidth(nodeA.name, nodeA.type);
            const textHeightA = 20; // Standard text height
            
            // Check text overlap with central node
            const centralOverlap = this.checkTextOverlap(
                nodeA.x, nodeA.y, textWidthA, textHeightA,
                centerX, centerY, 200, 30
            );
            if (centralOverlap) {
                score -= 500; // Heavy penalty for central overlap
            }
            
            // Check against other nodes
            for (let j = i + 1; j < layout.length; j++) {
                const nodeB = layout[j];
                const textWidthB = this.estimateTextWidth(nodeB.name, nodeB.type);
                const textHeightB = 20;
                
                // Check text overlap between nodes
                const textOverlap = this.checkTextOverlap(
                    nodeA.x, nodeA.y, textWidthA, textHeightA,
                    nodeB.x, nodeB.y, textWidthB, textHeightB
                );
                
                if (textOverlap) {
                    score -= 300; // Heavy penalty for text overlap
                }
                
                // Distance-based scoring for better distribution - good spacing for small departments
                const distance = Math.sqrt((nodeA.x - nodeB.x) ** 2 + (nodeA.y - nodeB.y) ** 2);
                const minDistance = Math.max(textWidthA, textWidthB) / 2 + (isSmallDept ? 100 : 40); // Good minimum safe distance for small departments
                
                if (distance < minDistance) {
                    score -= (minDistance - distance) * 2; // Penalty increases with proximity
                } else if (distance > minDistance && distance < minDistance * 2) {
                    score += 10; // Reward good spacing
                }
            }
            
            // Bonus for using peripheral areas (better space utilization)
            const distanceFromCenter = Math.sqrt((nodeA.x - centerX) ** 2 + (nodeA.y - centerY) ** 2);
            const maxDistance = Math.min(canvasWidth, canvasHeight) / 2;
            if (distanceFromCenter > maxDistance * 0.6) {
                score += 50; // Bonus for spreading out
            }
            
            // Penalty for being too close to edges (text cutoff risk)
            const margin = 80;
            if (nodeA.x < margin || nodeA.x > canvasWidth - margin ||
                nodeA.y < margin || nodeA.y > canvasHeight - margin) {
                score -= 200; // Penalty for edge proximity
            }
        }
        
        return score;
    }
    
    checkTextOverlap(x1, y1, w1, h1, x2, y2, w2, h2) {
        // Check if two text rectangles overlap
        const left1 = x1 - w1/2;
        const right1 = x1 + w1/2;
        const top1 = y1 - h1/2;
        const bottom1 = y1 + h1/2;
        
        const left2 = x2 - w2/2;
        const right2 = x2 + w2/2;
        const top2 = y2 - h2/2;
        const bottom2 = y2 + h2/2;
        
        return !(right1 < left2 || left1 > right2 || bottom1 < top2 || top1 > bottom2);
    }
    
    estimateTextWidth(text, nodeType) {
        // More accurate text width estimation
        const baseFontSize = nodeType === 'central' ? 16 : 12;
        const charWidth = baseFontSize * 0.6; // Approximate character width
        return Math.min(text.length * charWidth, 200); // Cap at 200px
    }

    getFontSize(nodeType, isComplexDept = false) {
        if (nodeType === 'central') {
            return isComplexDept ? '20px' : '22px';
        }
        return isComplexDept ? '15px' : '17px';
    }
    
    // Helper function to check if current department is complex
    isComplexDepartment() {
        const currentDept = this.vizNodes.find(n => n.type === 'central');
        return currentDept && (
            currentDept.name.includes('Visual Arts') || 
            currentDept.name.includes('Performing Arts')
        );
    }
    
    isPositionInLegendZone(x, y, width = 0, height = 0) {
        const canvasWidth = this.vizCanvas.width;
        const canvasHeight = this.vizCanvas.height;
        const legendZone = {
            x: canvasWidth - 240, // 200px width + 40px margin
            y: canvasHeight - 220, // 180px height + 40px margin
            width: 240,
            height: 220
        };
        
        // Check if the position (with optional width/height) intersects legend zone
        return (x < legendZone.x + legendZone.width && 
                x + width > legendZone.x && 
                y < legendZone.y + legendZone.height && 
                y + height > legendZone.y);
    }
    
    calculateTextOverlapPenalty(nodeA, nodeB, isComplexDept = false, isSmallDept = false) {
        const boundsA = this.getTextBounds(nodeA, isComplexDept);
        const boundsB = this.getTextBounds(nodeB, isComplexDept);
        
        // Add larger buffer around text to ensure readability - more for complex departments
        const textBuffer = isComplexDept ? 60 : 50; // Increased buffer for complex departments
        
        const expandedBoundsA = {
            left: boundsA.left - textBuffer,
            right: boundsA.right + textBuffer,
            top: boundsA.top - textBuffer,
            bottom: boundsA.bottom + textBuffer
        };
        const expandedBoundsB = {
            left: boundsB.left - textBuffer,
            right: boundsB.right + textBuffer,
            top: boundsB.top - textBuffer,
            bottom: boundsB.bottom + textBuffer
        };
        
        // Calculate overlap area with expanded bounds
        const overlapLeft = Math.max(expandedBoundsA.left, expandedBoundsB.left);
        const overlapRight = Math.min(expandedBoundsA.right, expandedBoundsB.right);
        const overlapTop = Math.max(expandedBoundsA.top, expandedBoundsB.top);
        const overlapBottom = Math.min(expandedBoundsA.bottom, expandedBoundsB.bottom);
        
        if (overlapLeft < overlapRight && overlapTop < overlapBottom) {
            const overlapArea = (overlapRight - overlapLeft) * (overlapBottom - overlapTop);
            // Much heavier penalty for complex departments
            return overlapArea * (isComplexDept ? 20 : 15); 
        }
        
        // Check if node circles are too close (node visual overlap)
        const nodeDistance = Math.sqrt(
            Math.pow(nodeA.x - nodeB.x, 2) + Math.pow(nodeA.y - nodeB.y, 2)
        );
        
        const nodeRadiusA = nodeA.radius || 10;
        const nodeRadiusB = nodeB.radius || 10;
        const minNodeDistance = nodeRadiusA + nodeRadiusB + (isSmallDept ? 90 : isComplexDept ? 50 : 40); // Good spacing for small departments
        
        if (nodeDistance < minNodeDistance) {
            return (minNodeDistance - nodeDistance) * (isSmallDept ? 60 : isComplexDept ? 35 : 25); // Higher penalty for small departments
        }
        
        // Additional penalty for text being too close (even without overlap) - enhanced for complex departments
        const centerDistance = Math.sqrt(
            Math.pow(nodeA.x - nodeB.x, 2) + Math.pow(nodeA.y - nodeB.y, 2)
        );
        
        const minSafeDistance = (nodeA.textWidth + nodeB.textWidth) / 2 + (isSmallDept ? 140 : isComplexDept ? 100 : 80); // Good safe distance for small departments
        if (centerDistance < minSafeDistance) {
            return (minSafeDistance - centerDistance) * (isComplexDept ? 15 : 12); // Higher penalty for complex departments
        }
        
        return 0;
    }

    calculateLineIntersectionPenalty(currentNode, allNodes, centerX, centerY) {
        let penalty = 0;
        
        // Check if the line intersects with the legend exclusion zone
        const canvasWidth = this.vizCanvas.width;
        const canvasHeight = this.vizCanvas.height;
        const legendZone = {
            x: canvasWidth - 240, // 200px width + 40px margin
            y: canvasHeight - 220, // 180px height + 40px margin
            width: 240,
            height: 220
        };
        
        // Check if line from center to current node intersects legend zone
        if (this.lineIntersectsRectangle(
            centerX, centerY, currentNode.x, currentNode.y,
            legendZone.x, legendZone.y,
            legendZone.x + legendZone.width, legendZone.y + legendZone.height
        )) {
            penalty += 2000; // Very heavy penalty for legend intersection
        }
        
        // Check if the line from center to current node intersects with other nodes
        for (const otherNode of allNodes) {
            if (otherNode === currentNode) continue;
            
            // Check if line segment intersects with the circular node
            const nodeRadius = otherNode.radius || 10;
            const clearanceBuffer = 25; // Increased clearance buffer
            
            // Calculate if line segment intersects with circle (node + buffer)
            const intersects = this.lineIntersectsCircle(
                centerX, centerY,           // Line start
                currentNode.x, currentNode.y,  // Line end
                otherNode.x, otherNode.y,   // Circle center
                nodeRadius + clearanceBuffer  // Circle radius with buffer
            );
            
            if (intersects) {
                // Extremely heavy penalty for line intersecting node
                penalty += 1000; // Doubled penalty to strongly discourage this
                
                // Additional penalty based on how close the intersection is
                const distanceToNode = this.distanceFromPointToLine(
                    otherNode.x, otherNode.y,
                    centerX, centerY,
                    currentNode.x, currentNode.y
                );
                
                if (distanceToNode < nodeRadius + 10) {
                    penalty += 500; // Extra penalty for very close intersection
                }
            }
            
            // Check if line passes very close to node (early warning system)
            const minLineDistance = this.distanceFromPointToLine(
                otherNode.x, otherNode.y,
                centerX, centerY,
                currentNode.x, currentNode.y
            );
            
            const warningDistance = nodeRadius + 35;
            if (minLineDistance < warningDistance) {
                // Graduated penalty for lines coming too close
                const proximityPenalty = (warningDistance - minLineDistance) * 20;
                penalty += proximityPenalty;
            }
            
            // Also check text bounds intersection with a lighter penalty
            const textBounds = this.getTextBounds(otherNode);
            const textBuffer = 15; // Increased text buffer
            
            if (this.lineIntersectsRectangle(
                centerX, centerY, currentNode.x, currentNode.y,
                textBounds.left - textBuffer, textBounds.top - textBuffer,
                textBounds.right + textBuffer, textBounds.bottom + textBuffer
            )) {
                penalty += 200; // Increased penalty for text intersection
            }
        }
        
        return penalty;
    }

    lineIntersectsCircle(x1, y1, x2, y2, cx, cy, radius) {
        // Check if line segment (x1,y1)-(x2,y2) intersects circle at (cx,cy) with given radius
        
        // Vector from line start to circle center
        const dx = cx - x1;
        const dy = cy - y1;
        
        // Vector from line start to line end
        const lx = x2 - x1;
        const ly = y2 - y1;
        
        // Length squared of line segment
        const lengthSq = lx * lx + ly * ly;
        
        // Handle degenerate case (zero length line)
        if (lengthSq === 0) {
            const dist = Math.sqrt(dx * dx + dy * dy);
            return dist <= radius;
        }
        
        // Project circle center onto line segment
        let t = (dx * lx + dy * ly) / lengthSq;
        
        // Clamp t to line segment bounds
        t = Math.max(0, Math.min(1, t));
        
        // Find closest point on line segment to circle center
        const closestX = x1 + t * lx;
        const closestY = y1 + t * ly;
        
        // Calculate distance from circle center to closest point
        const distX = cx - closestX;
        const distY = cy - closestY;
        const distance = Math.sqrt(distX * distX + distY * distY);
        
        // Return true if distance is less than or equal to radius
        return distance <= radius;
    }

    distanceFromPointToLine(px, py, x1, y1, x2, y2) {
        // Calculate the distance from point (px, py) to line segment (x1,y1)-(x2,y2)
        const A = px - x1;
        const B = py - y1;
        const C = x2 - x1;
        const D = y2 - y1;
        
        const dot = A * C + B * D;
        const lenSq = C * C + D * D;
        
        if (lenSq === 0) {
            // Line segment is actually a point
            return Math.sqrt(A * A + B * B);
        }
        
        let param = dot / lenSq;
        
        let xx, yy;
        if (param < 0) {
            xx = x1;
            yy = y1;
        } else if (param > 1) {
            xx = x2;
            yy = y2;
        } else {
            xx = x1 + param * C;
            yy = y1 + param * D;
        }
        
        const dx = px - xx;
        const dy = py - yy;
        return Math.sqrt(dx * dx + dy * dy);
    }

    lineIntersectsRectangle(x1, y1, x2, y2, rectLeft, rectTop, rectRight, rectBottom) {
        // Check if line segment (x1,y1)-(x2,y2) intersects with rectangle
        // Using Liang-Barsky line clipping algorithm
        
        const dx = x2 - x1;
        const dy = y2 - y1;
        
        const p = [-dx, dx, -dy, dy];
        const q = [x1 - rectLeft, rectRight - x1, y1 - rectTop, rectBottom - y1];
        
        let u1 = 0;
        let u2 = 1;
        
        for (let i = 0; i < 4; i++) {
            if (p[i] === 0) {
                if (q[i] < 0) return false;
            } else {
                const t = q[i] / p[i];
                if (p[i] < 0) {
                    if (t > u2) return false;
                    if (t > u1) u1 = t;
                } else {
                    if (t < u1) return false;
                    if (t < u2) u2 = t;
                }
            }
        }
        
        return u1 <= u2;
    }

    getTextBounds(node, isComplexDept = false) {
        const textWidth = node.textWidth || this.estimateTextWidth(node.name, node.type, isComplexDept);
        const textHeight = node.textHeight || this.estimateTextHeight(node.name, node.type, isComplexDept);
        
        // Handle central node differently - it's centered at the node position
        if (node.type === 'central') {
            return {
                left: node.x - textWidth / 2,
                right: node.x + textWidth / 2,
                top: node.y - textHeight / 2,
                bottom: node.y + textHeight / 2
            };
        }
        
        // Match the actual text positioning logic from the render method
        const canvasWidth = this.vizCanvas.width;
        const canvasHeight = this.vizCanvas.height;
        const margin = 60;
        
        let textX = node.x;
        let textY = node.y;
        
        // Apply the same edge-aware positioning logic as in rendering
        if (node.x < margin) {
            textX = node.x + node.radius + 60;
        } else if (node.x > canvasWidth - margin) {
            textX = node.x - node.radius - 60;
        }
        
        if (node.y < margin) {
            textY = node.y + node.radius + 30;
        } else if (node.y > canvasHeight - margin) {
            textY = node.y - node.radius - 20;
        } else {
            // Standard positioning with angle-based variation
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
        
        // Account for multi-line text centering
        const lines = this.getWrappedLines(node.name, node.type);
        const lineHeight = 15;
        const totalTextHeight = lines.length * lineHeight;
        const startY = textY - (lines.length - 1) * lineHeight / 2;
        
        return {
            left: textX - textWidth / 2,
            right: textX + textWidth / 2,
            top: startY - lineHeight / 2,
            bottom: startY + totalTextHeight - lineHeight / 2
        };
    }
    
    getWrappedLines(text, nodeType, isComplexDept = false) {
        // Central nodes don't wrap - they're single line
        if (nodeType === 'central') {
            return [text];
        }
        
        // Match the wrapping logic from rendering - smaller widths for complex departments
        const maxWidth = nodeType === 'degree' ? 
            (isComplexDept ? 95 : 110) : 
            (isComplexDept ? 60 : 70);
        const words = text.split(' ');
        let line = '';
        let lines = [];
        
        for (let i = 0; i < words.length; i++) {
            const testLine = line + words[i] + ' ';
            // Estimate text width - smaller for complex departments
            const avgCharWidth = isComplexDept ? 8.5 : 10; // Smaller for 15px vs 17px
            const testWidth = testLine.length * avgCharWidth;
            
            if (testWidth > maxWidth && i > 0) {
                lines.push(line);
                line = words[i] + ' ';
            } else {
                line = testLine;
            }
        }
        lines.push(line);
        
        return lines;
    }

    estimateTextHeight(text, nodeType = 'degree', isComplexDept = false) {
        // Central nodes use single line font - smaller for complex departments
        if (nodeType === 'central') {
            return isComplexDept ? 20 : 22; // Smaller for complex departments
        }
        
        // Use the same wrapping logic as rendering to get accurate line count
        const lines = this.getWrappedLines(text, nodeType, isComplexDept);
        const lineHeight = isComplexDept ? 13 : 15; // Smaller line height for complex departments
        return lines.length * lineHeight;
    }

    getIdealDistance(nodeType, maxRadius) {
        switch (nodeType) {
            case 'degree': return maxRadius * 0.4;
            case 'internal': return maxRadius * 0.65;
            case 'external': return maxRadius * 0.85;
            default: return maxRadius * 0.5;
        }
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
    
    estimateTextWidth(text, nodeType = 'degree', isComplexDept = false) {
        // Central nodes use 22px Orbitron bold and don't wrap
        if (nodeType === 'central') {
            const avgCharWidth = isComplexDept ? 12 : 14; // Smaller for complex departments
            return text.length * avgCharWidth;
        }
        
        // Match the actual wrapping widths used in rendering - smaller for complex departments
        const maxWidth = nodeType === 'degree' ? 
            (isComplexDept ? 95 : 110) : 
            (isComplexDept ? 60 : 70);
        
        // For multi-line text, use the max width constraint
        const lines = this.getWrappedLines(text, nodeType, isComplexDept);
        let maxLineWidth = 0;
        
        // Estimate each line's width - smaller text for complex departments
        const avgCharWidth = isComplexDept ? 8.5 : 10; // Smaller for complex departments (15px vs 17px)
        for (const line of lines) {
            const lineWidth = line.trim().length * avgCharWidth;
            maxLineWidth = Math.max(maxLineWidth, lineWidth);
        }
        
        // Don't exceed the wrapping constraint
        return Math.min(maxLineWidth, maxWidth);
    }

    ensureWithinBounds(x, y, canvasWidth, canvasHeight, margin = 50) {
        // Enhanced bounds with much larger margins to prevent offscreen positioning
        const textBuffer = 80; // Buffer for text width
        const minX = margin + textBuffer;
        const maxX = canvasWidth - margin - textBuffer;
        const minY = margin + 30; // Extra buffer for text height
        const maxY = canvasHeight - (margin + 80); // Large bottom margin for text
        
        // Clamp to bounds with aggressive margins
        const boundedX = Math.max(minX, Math.min(x, maxX));
        const boundedY = Math.max(minY, Math.min(y, maxY));
        
        return {
            x: boundedX,
            y: boundedY
        };
    }
    
    placeTracksAroundDegree(degreeX, degreeY, degreeAngle, tracks, parentId, centerX, centerY, margin) {
        const canvasWidth = this.vizCanvas.width;
        const canvasHeight = this.vizCanvas.height;
        const maxRadius = Math.min(canvasWidth, canvasHeight) / 2;
        
        // Much larger distances to prevent any overlap with varied lengths
        const minTrackDistance = maxRadius * 0.35; // 35% of max radius minimum
        const maxTrackDistance = maxRadius * 0.65; // 65% of max radius maximum
        
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
                
                // Use random distance within range for varied line lengths
                const distanceRange = maxTrackDistance - minTrackDistance;
                const distance = minTrackDistance + (Math.random() * distanceRange);
                
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
                    
                    // Much larger separation requirements for bigger fonts
                    const requiredSeparationX = (existing.textWidth + trackTextWidth) / 2 + 120; // Much larger buffer
                    const requiredSeparationY = 120; // Much larger vertical buffer
                    
                    if (dx < requiredSeparationX && dy < requiredSeparationY) {
                        hasCollision = true;
                        break;
                    } else {
                        // Add to score based on distance from other nodes (farther is better)
                        const totalDistance = Math.sqrt(dx * dx + dy * dy);
                        positionScore += totalDistance;
                    }
                }
                
                // Check canvas bounds with very generous margins for larger fonts
                const boundaryMargin = Math.max(trackTextWidth / 2 + 70, 130); // Much larger margin
                if (testX < boundaryMargin || testX > canvasWidth - boundaryMargin ||
                    testY < 130 || testY > canvasHeight - 130) { // Much larger vertical margins
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
                // Fallback: place with varied distance from center
                const fallbackAngle = degreeAngle + (trackIndex * Math.PI * 2 / tracks.length);
                const fallbackDistance = minTrackDistance + (Math.random() * (maxTrackDistance - minTrackDistance));
                subX = degreeX + Math.cos(fallbackAngle) * fallbackDistance;
                subY = degreeY + Math.sin(fallbackAngle) * fallbackDistance;
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
        if (department.internalPartners && department.internalPartners.length > 0) {
            html += `
                <div class="card-section">
                    <h3 class="section-title">Intra-College Partners</h3>
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
        if (department.externalPartners && department.externalPartners.length > 0) {
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
        if (department.highlights && department.highlights.length > 0) {
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
        if (department.techCourses && department.techCourses.length > 0) {
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
        
        // Clear canvas but don't fill with overlay to preserve grid background
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
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
        // Limit frame rate for better performance (30fps instead of 60fps)
        if (!this.lastVizFrame || Date.now() - this.lastVizFrame > 33) {
            this.lastVizFrame = Date.now();
            
            // Fill with semi-transparent black to hide main view but show grid
            this.vizCtx.fillStyle = 'rgba(0, 0, 0, 0.9)';
            this.vizCtx.fillRect(0, 0, this.vizCanvas.width, this.vizCanvas.height);
            
            // Update animation time
            this.animationTime += 0.033; // 30fps instead of 60fps
            
            // Draw links with batched operations
            this.drawVizLinks();
            
            // Draw nodes with batched operations  
            this.drawVizNodes();
        }
        
        if (this.isDetailView) {
            this.vizAnimationId = requestAnimationFrame(() => this.animateVisualization());
        }
    }
    
    drawVizLinks() {
        // Batch link drawing operations
        this.vizCtx.save();
        this.vizLinks.forEach(link => {
            const sourceNode = this.vizNodes.find(n => n.id === link.source);
            const targetNode = this.vizNodes.find(n => n.id === link.target);
            
            if (sourceNode && targetNode && link.opacity > 0 && this.shouldShowLink(sourceNode, targetNode, link.type)) {
                this.drawVizLink(sourceNode, targetNode, link.type, link.opacity);
            }
        });
        this.vizCtx.restore();
    }
    
    drawVizNodes() {
        // Batch node drawing operations
        this.vizCtx.save();
        
        // Draw hover tracks if a degree node is hovered and should be shown
        if (this.hoveredNode && this.hoveredNode.tracks && this.shouldShowNode(this.hoveredNode)) {
            this.drawHoverTracks(this.hoveredNode);
        }
        
        // Draw nodes
        this.vizNodes.forEach(node => {
            if (this.shouldShowNode(node)) {
                this.drawVizNode(node);
            }
        });
        
        // Draw labels
        this.vizNodes.forEach(node => {
            if (this.shouldShowNode(node)) {
                this.drawVizLabel(node);
            }
        });
        
        this.vizCtx.restore();
    }

    drawHoverTracks(degreeNode) {
        const tracks = degreeNode.tracks;
        const centerX = this.vizCanvas.width / 2;
        const centerY = this.vizCanvas.height / 2;
        const maxRadius = Math.min(this.vizCanvas.width, this.vizCanvas.height) / 2;
        
        // Tracks should be placed further out to avoid overlap
        const minTrackDistance = maxRadius * 0.25; // Increased from 0.15
        const maxTrackDistance = maxRadius * 0.4;  // Increased from 0.25
        
        tracks.forEach((track, trackIndex) => {
            // Create wider angular spread around the parent degree
            const baseAngleFromCenter = Math.atan2(degreeNode.y - centerY, degreeNode.x - centerX);
            const clusterSpread = Math.PI / 1.5; // 120 degree spread (increased from 60)
            
            // Distribute tracks more evenly with better spacing
            const trackAngle = baseAngleFromCenter - (clusterSpread / 2) + 
                             (trackIndex * clusterSpread / Math.max(tracks.length - 1, 1));
            
            // Use varied distance based on index for better visual distribution
            const distanceVariation = (trackIndex % 2) * 0.1; // Alternate between closer/farther
            const distanceFromParent = minTrackDistance + distanceVariation * (maxTrackDistance - minTrackDistance);
            
            const trackX = degreeNode.x + Math.cos(trackAngle) * distanceFromParent;
            const trackY = degreeNode.y + Math.sin(trackAngle) * distanceFromParent;
            
            // Draw track node
            this.vizCtx.save();
            
            // Light blue for degree tracks with pulsing
            const pulseIntensity = 0.7 + 0.3 * Math.sin(this.animationTime * 4);
            this.vizCtx.fillStyle = '#80c0ff';
            this.vizCtx.shadowColor = '#80c0ff';
            this.vizCtx.shadowBlur = (6 + 3 * Math.sin(this.animationTime * 3)) * pulseIntensity;
            this.vizCtx.strokeStyle = '#ffffff';
            this.vizCtx.lineWidth = 1;
            
            this.vizCtx.beginPath();
            this.vizCtx.arc(trackX, trackY, 8, 0, Math.PI * 2);
            this.vizCtx.fill();
            this.vizCtx.stroke();
            
            // Draw link from degree to track
            this.vizCtx.globalAlpha = 0.8;
            this.vizCtx.strokeStyle = '#80c0ff';
            this.vizCtx.lineWidth = 1;
            this.vizCtx.shadowBlur = 5;
            this.vizCtx.beginPath();
            this.vizCtx.moveTo(degreeNode.x, degreeNode.y);
            this.vizCtx.lineTo(trackX, trackY);
            this.vizCtx.stroke();
            
            // Draw track label with better positioning to avoid overlaps
            this.vizCtx.globalAlpha = 1;
            this.vizCtx.font = 'normal 13px "Orbitron", monospace'; // Slightly smaller font
            this.vizCtx.fillStyle = '#ffffff';  // White text for consistency
            this.vizCtx.strokeStyle = '#000000';
            this.vizCtx.lineWidth = 2;
            this.vizCtx.textAlign = 'center';
            this.vizCtx.textBaseline = 'middle';
            this.vizCtx.shadowColor = '#80c0ff';
            this.vizCtx.shadowBlur = 6;
            
            // Position text further from the node to avoid overlaps
            const textOffset = 25; // Increased from 20
            const textX = trackX + Math.cos(trackAngle) * textOffset;
            const textY = trackY + Math.sin(trackAngle) * textOffset;
            
            this.vizCtx.strokeText(track, textX, textY);
            this.vizCtx.fillText(track, textX, textY);
            
            this.vizCtx.restore();
        });
    }

    // Filtering system methods
    setFilter(filterType) {
        this.activeFilter = this.activeFilter === filterType ? null : filterType;
    }

    shouldShowNode(node) {
        if (!this.activeFilter) return true;
        
        // Always show central department node
        if (node.type === 'central') return true;
        
        // Special handling for degree tracks - show with degree filter
        if (this.activeFilter === 'degree' && (node.type === 'degree' || node.type === 'degree-track')) {
            return true;
        }
        
        return node.type === this.activeFilter;
    }

    shouldShowLink(source, target, linkType) {
        if (!this.activeFilter) return true;
        
        // Always show links to/from central department
        if (source.type === 'central' || target.type === 'central') {
            // Show if the other node should be shown
            const otherNode = source.type === 'central' ? target : source;
            return this.shouldShowNode(otherNode);
        }
        
        // Show link if both nodes should be shown
        const showSource = this.shouldShowNode(source);
        const showTarget = this.shouldShowNode(target);
        
        return showSource && showTarget;
    }

    drawVizLink(source, target, linkType, opacity) {
        this.vizCtx.save();
        this.vizCtx.globalAlpha = opacity;
        
        // Set consistent line colors based on type to match legend
        let pulseWidth, pulseGlow, strokeColor, shadowColor;
        
        if (linkType === 'degree') {
            // Consistent cyan for degrees - matches legend
            pulseWidth = 1.5 + Math.sin(this.animationTime * 4) * 0.3;
            pulseGlow = 6 + Math.sin(this.animationTime * 3) * 3;
            strokeColor = '#00ffff'; // Consistent cyan
            shadowColor = strokeColor;
        } else if (linkType === 'degree-track') {
            // Light blue for degree tracks - matches legend
            pulseWidth = 1 + Math.sin(this.animationTime * 5) * 0.2;
            pulseGlow = 4 + Math.sin(this.animationTime * 4) * 2;
            strokeColor = '#80c0ff'; // Light blue for tracks
            shadowColor = strokeColor;
        } else if (linkType === 'internal') {
            // Consistent yellow for internal - matches legend
            pulseWidth = 2.5 + Math.sin(this.animationTime * 3) * 0.5;
            pulseGlow = 12 + Math.sin(this.animationTime * 2) * 6;
            strokeColor = '#ffff00'; // Consistent yellow
            shadowColor = strokeColor;
        } else if (linkType === 'external') {
            // Consistent magenta for external - matches legend
            pulseWidth = 3 + Math.sin(this.animationTime * 2) * 0.8;
            pulseGlow = 18 + Math.sin(this.animationTime * 1.5) * 8;
            strokeColor = '#ff00ff'; // Consistent magenta
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
        
        // Add pulsing effect based on animation time (except for central)
        const pulseIntensity = 0.8 + 0.2 * Math.sin(this.animationTime * 2);
        let shadowBlur = 10;
        let fillColor, shadowColor;
        
        if (node.type === 'central') {
            fillColor = '#ff6600';
            shadowColor = '#ff6600';
            shadowBlur = 25; // Fixed glow, no pulsing
        } else if (node.type === 'degree') {
            // Consistent cyan for degrees - matches legend
            fillColor = '#00ffff';
            shadowColor = '#00ffff';
            shadowBlur = 8 + 4 * Math.sin(this.animationTime * 2.5);
        } else if (node.type === 'degree-track') {
            // Light blue for degree tracks - matches legend
            fillColor = '#80c0ff';
            shadowColor = '#80c0ff';
            shadowBlur = 6 + 3 * Math.sin(this.animationTime * 3);
        } else if (node.type === 'internal') {
            // Consistent yellow for internal partners - matches legend
            fillColor = '#ffff00';
            shadowColor = '#ffff00';
            shadowBlur = 12 + 6 * Math.sin(this.animationTime * 2);
        } else if (node.type === 'external') {
            // Consistent magenta for external partners - matches legend
            fillColor = '#ff00ff';
            shadowColor = '#ff00ff';
            shadowBlur = 15 + 8 * Math.sin(this.animationTime * 1.8);
        } else {
            fillColor = '#00ffff';
            shadowColor = '#00ffff';
            shadowBlur = 10;
        }
        
        this.vizCtx.fillStyle = fillColor;
        this.vizCtx.shadowColor = shadowColor;
        // Apply pulse intensity only to non-central nodes
        this.vizCtx.shadowBlur = node.type === 'central' ? shadowBlur : shadowBlur * pulseIntensity;
        this.vizCtx.strokeStyle = '#ffffff';
        this.vizCtx.lineWidth = node.type === 'central' ? 3 : 2;
        
        // Remove size pulsing for central node - use fixed radius
        const radius = node.radius;
        
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
            // Central department name with blue outline (TRON style) - smaller for complex departments
            const isComplexDept = this.isComplexDepartment();
            this.vizCtx.font = `bold ${this.getFontSize('central', isComplexDept)} Orbitron`;
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
            // Degree nodes with WHITE font for better readability - smaller for complex departments
            const isComplexDept = this.isComplexDepartment();
            this.vizCtx.fillStyle = '#ffffff';  // White font for degrees
            this.vizCtx.font = `bold ${this.getFontSize('degree', isComplexDept)} Orbitron`;
            this.vizCtx.shadowColor = '#000000';
            this.vizCtx.shadowBlur = 4;
            this.vizCtx.textAlign = 'center';
            this.vizCtx.textBaseline = 'middle';
            
            // Wrap long text with better width management - smaller for complex departments
            const maxWidth = isComplexDept ? 95 : 110;  
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
            
            // Check if text would be in legend zone and adjust
            const textWidth = Math.max(...lines.map(line => this.vizCtx.measureText(line.trim()).width));
            const textHeight = lines.length * lineHeight;
            
            if (this.isPositionInLegendZone(textX - textWidth/2, textY - textHeight/2, textWidth, textHeight)) {
                // Try to move text up first
                const newTextY = textY - 80;
                if (newTextY > margin && !this.isPositionInLegendZone(textX - textWidth/2, newTextY - textHeight/2, textWidth, textHeight)) {
                    textY = newTextY;
                } else {
                    // Try to move left
                    const newTextX = textX - 120;
                    if (newTextX > margin && !this.isPositionInLegendZone(newTextX - textWidth/2, textY - textHeight/2, textWidth, textHeight)) {
                        textX = newTextX;
                        this.vizCtx.textAlign = 'center';
                    }
                }
            }
            
            const startY = textY - (lines.length - 1) * lineHeight / 2;
            
            lines.forEach((line, index) => {
                this.vizCtx.fillText(line.trim(), textX, startY + index * lineHeight);
            });
        } else if (node.type === 'degree-track') {
            // Degree track nodes with white font - smaller for complex departments
            const isComplexDept = this.isComplexDepartment();
            this.vizCtx.fillStyle = '#ffffff';  // White font for degree tracks too
            this.vizCtx.font = `${this.getFontSize('degree-track', isComplexDept)} Orbitron`;
            this.vizCtx.shadowColor = '#000000';
            this.vizCtx.shadowBlur = 3;
            this.vizCtx.textAlign = 'center';
            this.vizCtx.textBaseline = 'middle';
            
            // Wrap long text with smaller width to reduce overlap - even smaller for complex departments
            const maxWidth = isComplexDept ? 60 : 70;
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
            
            // Check if text would be in legend zone and adjust
            const textWidth = Math.max(...lines.map(line => this.vizCtx.measureText(line.trim()).width));
            const textHeight = lines.length * lineHeight;
            
            if (this.isPositionInLegendZone(textX - textWidth/2, textY - textHeight/2, textWidth, textHeight)) {
                // Try to move text up first
                const newTextY = textY - 60;
                if (newTextY > margin && !this.isPositionInLegendZone(textX - textWidth/2, newTextY - textHeight/2, textWidth, textHeight)) {
                    textY = newTextY;
                } else {
                    // Try to move left
                    const newTextX = textX - 100;
                    if (newTextX > margin && !this.isPositionInLegendZone(newTextX - textWidth/2, textY - textHeight/2, textWidth, textHeight)) {
                        textX = newTextX;
                        this.vizCtx.textAlign = 'center';
                    }
                }
            }
            
            const startY = textY - (lines.length - 1) * lineHeight / 2;
            
            lines.forEach((line, index) => {
                this.vizCtx.fillText(line.trim(), textX, startY + index * lineHeight);
            });
        } else if (node.type === 'internal') {
            // Internal partner nodes with white font for consistency - smaller for complex departments
            const isComplexDept = this.isComplexDepartment();
            this.vizCtx.fillStyle = '#ffffff';  // White font for consistency
            this.vizCtx.font = `bold ${this.getFontSize('internal', isComplexDept)} Orbitron`;
            this.vizCtx.shadowColor = '#000000';
            this.vizCtx.shadowBlur = 4;
            this.vizCtx.textAlign = 'center';
            this.vizCtx.textBaseline = 'middle';
            
            // Wrap long text - smaller width for complex departments
            const maxWidth = isComplexDept ? 120 : 150;
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
            // External partner nodes with white font for consistency - smaller for complex departments
            const isComplexDept = this.isComplexDepartment();
            this.vizCtx.fillStyle = '#ffffff';  // White font for consistency
            this.vizCtx.font = `bold ${this.getFontSize('external', isComplexDept)} Orbitron`;
            this.vizCtx.shadowColor = '#000000';
            this.vizCtx.shadowBlur = 4;
            this.vizCtx.textAlign = 'center';
            this.vizCtx.textBaseline = 'middle';
            
            // Wrap long text - smaller width for complex departments
            const maxWidth = isComplexDept ? 130 : 160;
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
            
            // Draw multiple glow layers for more dramatic effect
            // Outer glow
            this.ctx.shadowColor = line.color;
            this.ctx.shadowBlur = 25 * line.glowIntensity;
            this.ctx.strokeStyle = line.color;
            this.ctx.lineWidth = line.width * 1.5;
            this.ctx.globalAlpha = 0.3;
            
            this.ctx.beginPath();
            this.ctx.moveTo(line.start.x, line.start.y);
            this.ctx.lineTo(currentEnd.x, currentEnd.y);
            this.ctx.stroke();
            
            // Middle glow
            this.ctx.shadowBlur = 15 * line.glowIntensity;
            this.ctx.lineWidth = line.width * 1.2;
            this.ctx.globalAlpha = 0.6;
            
            this.ctx.beginPath();
            this.ctx.moveTo(line.start.x, line.start.y);
            this.ctx.lineTo(currentEnd.x, currentEnd.y);
            this.ctx.stroke();
            
            // Inner glow
            this.ctx.shadowBlur = 8 * line.glowIntensity;
            this.ctx.lineWidth = line.width;
            this.ctx.globalAlpha = 0.9;
            
            this.ctx.beginPath();
            this.ctx.moveTo(line.start.x, line.start.y);
            this.ctx.lineTo(currentEnd.x, currentEnd.y);
            this.ctx.stroke();
            
            // Draw bright core line
            this.ctx.shadowBlur = 0;
            this.ctx.globalAlpha = 1;
            this.ctx.lineWidth = line.width * 0.7; // Slightly thicker core
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
        
        // Draw multiple glow layers for more dramatic effect
        // Outer glow
        this.ctx.shadowColor = line.color;
        this.ctx.shadowBlur = 25 * line.glowIntensity;
        this.ctx.strokeStyle = line.color;
        this.ctx.lineWidth = line.width * 1.5;
        this.ctx.globalAlpha = 0.3;
        
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
        
        // Middle glow
        this.ctx.shadowBlur = 15 * line.glowIntensity;
        this.ctx.lineWidth = line.width * 1.2;
        this.ctx.globalAlpha = 0.6;
        
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
        
        // Inner glow
        this.ctx.shadowBlur = 8 * line.glowIntensity;
        this.ctx.lineWidth = line.width;
        this.ctx.globalAlpha = 0.9;
        
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
        
        // Draw bright core line
        this.ctx.shadowBlur = 0;
        this.ctx.globalAlpha = 1;
        this.ctx.lineWidth = line.width * 0.7; // Slightly thicker core
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
