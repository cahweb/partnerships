export class PartnershipGraph {
    constructor(canvas, departmentData, eventBus) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.departmentData = departmentData;
        this.eventBus = eventBus;
        
        this.vizNodes = [];
        this.vizLinks = [];
        this.simulation = null;
        this.animationTime = 0;
        this.animationFrame = null;
        
        // Filter states
        this.hoveredFilter = null;  // Currently hovered legend item
        this.enabledCategories = new Set(['central']);  // Start with only central visible
        this.categoryRevealOrder = ['degree', 'internal', 'external'];  // Categories to reveal sequentially
        this.currentRevealIndex = 0;
        
        // Session storage for tracking visited departments (not persistent)
        this.visitedDepartments = new Set();
        
        // Hover state
        this.hoveredNode = null;
        this.previousHoveredNode = null;
        this.mouseX = 0;
        this.mouseY = 0;
        
        // Track nodes for hover effect
        this.trackNodes = [];
        this.trackLinks = [];
        
        // Zoom functionality
        this.zoomLevel = 1.0;
        this.minZoom = 0.5;
        this.maxZoom = 2.5;
        this.zoomStep = 0.2;
        
        // Cache for performance
        this.layoutCache = new Map();
        this.lastVizFrame = 0;
        
        this.setupCanvas();
        this.setupInteractions();
    }
    
    setupCanvas() {
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
    }
    
    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        
        // Update simulation center if it exists
        if (this.simulation) {
            this.simulation.force('center')
                .x(this.canvas.width / 2)
                .y(this.canvas.height / 2);
            this.simulation.alpha(0.3).restart();
        }
    }
    
    setupInteractions() {
        this.canvas.addEventListener('mousemove', (e) => {
            this.mouseX = e.clientX;
            this.mouseY = e.clientY;
            this.updateHoverState();
        });
        
        this.canvas.addEventListener('mouseleave', () => {
            this.hoveredNode = null;
        });
        
        // Setup zoom button event listeners
        this.setupZoomControls();
    }
    
    setupZoomControls() {
        const zoomInBtn = document.getElementById('zoomIn');
        const zoomOutBtn = document.getElementById('zoomOut');
        
        if (zoomInBtn) {
            zoomInBtn.addEventListener('click', () => this.zoomIn());
        }
        
        if (zoomOutBtn) {
            zoomOutBtn.addEventListener('click', () => this.zoomOut());
        }
    }
    
    zoomIn() {
        if (this.zoomLevel < this.maxZoom) {
            this.zoomLevel = Math.min(this.maxZoom, this.zoomLevel + this.zoomStep);
            this.applyZoom();
        }
    }
    
    zoomOut() {
        if (this.zoomLevel > this.minZoom) {
            this.zoomLevel = Math.max(this.minZoom, this.zoomLevel - this.zoomStep);
            this.applyZoom();
        }
    }
    
    applyZoom() {
        // Update node radii
        this.vizNodes.forEach(node => {
            if (node.originalRadius === undefined) {
                // Store original radius on first zoom
                node.originalRadius = node.radius;
            }
            node.radius = node.originalRadius * this.zoomLevel;
            // Mark that zoom has been applied to this node
            node.zoomApplied = true;
        });
        
        // Update simulation forces to account for new node sizes
        if (this.simulation) {
            // Update collision force with new radii
            this.simulation.force('collide', d3.forceCollide()
                .radius(d => (d.radius + 60) * this.zoomLevel)
                .strength(0.9));
            
            // Update radial force distances
            const radialForce = d3.forceRadial()
                .radius(d => {
                    const baseMaxRadius = Math.min(this.canvas.width, this.canvas.height) * 0.45;
                    const maxRadius = baseMaxRadius * this.zoomLevel;
                    switch(d.type) {
                        case 'central': return 0;
                        case 'degree': return maxRadius * 0.50;
                        case 'internal': return maxRadius * 0.70;
                        case 'external': return maxRadius * 0.90;
                        default: return maxRadius * 0.75;
                    }
                })
                .x(this.canvas.width / 2)
                .y(this.canvas.height / 2)
                .strength(0.8);
            
            this.simulation.force('radial', radialForce);
            
            // Restart simulation with gentle alpha
            this.simulation.alpha(0.3).restart();
        }
    }
    
    createVisualization(departmentId) {
        console.log('[createVisualization] Starting for department:', departmentId);
        const dept = this.departmentData[departmentId];
        if (!dept) {
            console.error('[createVisualization] Department not found:', departmentId);
            return;
        }
        
        this.currentDepartment = dept;
        this.currentDepartmentId = departmentId;
        
        // Reset zoom level for new visualization
        this.zoomLevel = 1.0;
        
        // Reset debug frame counter
        this.debugFrameCount = 0;
        
        // Reset enabled categories to only central when starting new visualization
        this.enabledCategories.clear();
        this.enabledCategories.add('central');
        console.log('[createVisualization] Reset enabled categories to:', Array.from(this.enabledCategories));
        
        // Build nodes and links from department data
        this.buildGraphData(dept);
        console.log('[createVisualization] Built graph with', this.vizNodes.length, 'nodes');
        
        // Create D3 force simulation
        this.initializeSimulation();
        
        // Start animation loop
        this.startAnimation();
        
        // Start progressive reveal of categories with a small delay
        setTimeout(() => {
            this.startProgressiveReveal();
        }, 300);
        
        this.eventBus.emit('visualizationCreated', { departmentId });
    }
    
    buildGraphData(dept) {
        this.vizNodes = [];
        this.vizLinks = [];
        const nodeMap = new Map();
        
        // Central node - larger radius
        const centralNode = {
            id: 'central',
            name: dept.name,
            type: 'central',
            fx: this.canvas.width / 2, // Fixed position
            fy: this.canvas.height / 2,
            radius: 30,  // Increased from 20
            originalRadius: 30  // Store original radius for zoom
        };
        this.vizNodes.push(centralNode);
        nodeMap.set('central', centralNode);
        
        // Add degree nodes - group tracks under same degree
        let nodeId = 0;
        const degreeMap = new Map();
        
        // First pass: group degrees by base name
        dept.degrees?.forEach(degree => {
            let baseName = degree;
            let trackName = null;
            
            // Check if the degree has a track specified (e.g., "Theatre BFA: Acting Track")
            if (degree.includes(':')) {
                const parts = degree.split(':');
                baseName = parts[0].trim();
                trackName = parts[1].trim().replace(' Track', '').trim();
            }
            
            if (!degreeMap.has(baseName)) {
                degreeMap.set(baseName, []);
            }
            
            if (trackName) {
                degreeMap.get(baseName).push({ name: trackName });
            }
        });
        
        // Second pass: create nodes for unique degrees
        degreeMap.forEach((tracks, baseName) => {
            const degreeNode = {
                id: `degree-${nodeId++}`,
                name: baseName,
                type: 'degree',
                tracks: tracks,
                radius: 20,  // Increased from 15
                originalRadius: 20  // Store original radius for zoom
            };
            this.vizNodes.push(degreeNode);
            nodeMap.set(degreeNode.id, degreeNode);
            
            // Link to central
            this.vizLinks.push({
                source: centralNode,
                target: degreeNode,
                type: 'degree'
            });
        });
        
        // Add internal partners
        dept.internalPartners?.forEach(partner => {
            const partnerNode = {
                id: `internal-${nodeId++}`,
                name: partner,
                type: 'internal',
                radius: 18,  // Increased from 12
                originalRadius: 18  // Store original radius for zoom
            };
            this.vizNodes.push(partnerNode);
            nodeMap.set(partnerNode.id, partnerNode);
            
            // Link to central
            this.vizLinks.push({
                source: centralNode,
                target: partnerNode,
                type: 'internal'
            });
        });
        
        // Add external partners
        dept.externalPartners?.forEach(partner => {
            const partnerNode = {
                id: `external-${nodeId++}`,
                name: partner,
                type: 'external',
                radius: 16,  // Increased from 12
                originalRadius: 16  // Store original radius for zoom
            };
            this.vizNodes.push(partnerNode);
            nodeMap.set(partnerNode.id, partnerNode);
            
            // Link to central
            this.vizLinks.push({
                source: centralNode,
                target: partnerNode,
                type: 'external'
            });
        });
    }
    
    initializeSimulation() {
        console.log('[initializeSimulation] Starting simulation setup');
        // Stop existing simulation if any
        if (this.simulation) {
            this.simulation.stop();
            this.simulation = null;
        }
        
        const width = this.canvas.width;
        const height = this.canvas.height;
        const centerX = width / 2;
        const centerY = height / 2;
        
        // Position all nodes at center initially (they'll animate out when revealed)
        this.vizNodes.forEach(node => {
            if (node.type !== 'central') {
                node.x = centerX + (Math.random() - 0.5) * 10;
                node.y = centerY + (Math.random() - 0.5) * 10;
                node.vx = 0;
                node.vy = 0;
            }
        });
        
        // Create custom radial force based on node type - scale with viewport
        const radialForce = d3.forceRadial()
            .radius(d => {
                // Use larger percentage of viewport for better scaling and spacing
                const maxRadius = Math.min(width, height) * 0.45;  // Increased from 0.42
                switch(d.type) {
                    case 'central': return 0;
                    case 'degree': return maxRadius * 0.50;   // Increased spacing
                    case 'internal': return maxRadius * 0.70;  // Increased spacing
                    case 'external': return maxRadius * 0.90;  // Increased spacing
                    default: return maxRadius * 0.75;
                }
            })
            .x(centerX)
            .y(centerY)
            .strength(0.8);
        
        // Create force simulation - start with only central node
        const initialNodes = this.vizNodes.filter(n => n.type === 'central');
        const initialLinks = []; // Start with no links
        console.log('[initializeSimulation] Starting with', initialNodes.length, 'initial nodes (should be 1)');
        
        this.simulation = d3.forceSimulation(initialNodes)
            .force('radial', radialForce)
            .force('charge', d3.forceManyBody()
                .strength(d => d.type === 'central' ? -300 : -150)  // Stronger repulsion
                .distanceMax(250))  // Increased range
            .force('collide', d3.forceCollide()
                .radius(d => d.radius + 60)  // Further increased spacing to prevent label overlap
                .strength(0.9))  // Stronger collision avoidance
            .force('link', d3.forceLink(initialLinks)
                .id(d => d.id)
                .distance(100)
                .strength(0.3))
            .force('center', d3.forceCenter(centerX, centerY).strength(0.05))
            .force('legendAvoid', this.createLegendAvoidanceForce())
            .force('bounds', this.createBoundsForce())
            .alphaDecay(0.02)
            .velocityDecay(0.4);
        
        // Run simulation for a bit to settle
        this.simulation.tick(50);
    }
    
    createLegendAvoidanceForce() {
        return (alpha) => {
            const legendLeft = this.canvas.width - 280;
            const legendTop = this.canvas.height - 200;
            
            this.vizNodes.forEach(node => {
                if (node.x > legendLeft && node.y > legendTop) {
                    // Push away from legend
                    const dx = node.x - legendLeft;
                    const dy = node.y - legendTop;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < 100) {
                        const force = (100 - dist) / 100;
                        node.vx -= dx * force * alpha * 2;
                        node.vy -= dy * force * alpha * 2;
                    }
                }
            });
        };
    }
    
    createBoundsForce() {
        return (alpha) => {
            const padding = 100;
            this.vizNodes.forEach(node => {
                if (node.x < padding) {
                    node.vx += (padding - node.x) * alpha;
                } else if (node.x > this.canvas.width - padding) {
                    node.vx -= (node.x - (this.canvas.width - padding)) * alpha;
                }
                
                if (node.y < padding) {
                    node.vy += (padding - node.y) * alpha;
                } else if (node.y > this.canvas.height - padding) {
                    node.vy -= (node.y - (this.canvas.height - padding)) * alpha;
                }
            });
        };
    }
    
    startAnimation() {
        const animate = () => {
            // Update physics simulation
            if (this.simulation) {
                this.simulation.tick();
            }
            
            // Clear canvas
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            
            // Update animation time
            this.animationTime += 0.033;
            
            // Draw visualization
            this.render();
            
            this.animationFrame = requestAnimationFrame(animate);
        };
        
        animate();
    }
    
    render() {
        // Get nodes that are actually in the simulation
        const simulationNodes = this.simulation ? this.simulation.nodes() : [];
        
        // Filter nodes based on being in simulation AND visible
        const visibleNodes = simulationNodes.filter(node => this.isNodeVisible(node));
        const visibleLinks = this.vizLinks.filter(link => {
            // Only show links where both nodes are in the simulation
            const sourceInSim = simulationNodes.includes(link.source);
            const targetInSim = simulationNodes.includes(link.target);
            return sourceInSim && targetInSim && this.isLinkVisible(link);
        });
        
        // Draw links
        visibleLinks.forEach(link => {
            const opacity = this.getElementOpacity(link.source.type, link.target.type);
            this.drawVizLink(link.source, link.target, link.type, opacity);
        });
        
        // Draw nodes
        visibleNodes.forEach(node => {
            const opacity = this.getElementOpacity(node.type);
            this.drawVizNode(node, opacity);
        });
        
        // Draw labels
        visibleNodes.forEach(node => {
            const opacity = this.getElementOpacity(node.type);
            this.drawVizLabel(node, opacity);
        });
    }
    
    isNodeVisible(node) {
        // Always show central node
        if (node.type === 'central') return true;
        
        // Show track nodes if their parent degree is enabled
        if (node.type === 'track') {
            return this.enabledCategories.has('degree');
        }
        
        // Check if node's category is enabled
        return this.enabledCategories.has(node.type);
    }
    
    isLinkVisible(link) {
        return this.isNodeVisible(link.source) && this.isNodeVisible(link.target);
    }
    
    getElementOpacity(type, type2 = null) {
        // First check if the type is even enabled (unless it's central)
        if (type !== 'central' && !this.enabledCategories.has(type)) {
            // Special case for tracks
            if (type === 'track' && this.enabledCategories.has('degree')) {
                // Track visibility is handled by degree category
            } else {
                // This type is not enabled, should not be visible at all
                return 0;
            }
        }
        
        // If hovering over a legend item, dim non-matching elements
        if (this.hoveredFilter) {
            // For links, check if either endpoint matches
            if (type2) {
                if (type === this.hoveredFilter || type2 === this.hoveredFilter || 
                    type === 'central' || type2 === 'central') {
                    return 1.0;
                }
                // Special case for tracks when hovering degree
                if (this.hoveredFilter === 'degree' && (type === 'track' || type2 === 'track')) {
                    return 1.0;
                }
                return 0.2;
            }
            // For nodes
            if (type === this.hoveredFilter || type === 'central') {
                return 1.0;
            }
            // Special case for tracks when hovering degree
            if (this.hoveredFilter === 'degree' && type === 'track') {
                return 1.0;
            }
            return 0.2;
        }
        
        // Normal visibility based on enabled categories
        if (!this.enabledCategories.has(type) && type !== 'central') {
            // Special case for tracks
            if (type === 'track' && this.enabledCategories.has('degree')) {
                return 1.0;
            }
            return 0;
        }
        
        return 1.0;
    }
    
    startProgressiveReveal() {
        // Check if we've already revealed for THIS specific department in this session
        const hasRevealed = this.visitedDepartments && this.visitedDepartments.has(this.currentDepartmentId);
        
        if (hasRevealed) {
            // Instantly show all categories if returning to this department
            this.categoryRevealOrder.forEach(category => {
                this.enabledCategories.add(category);
            });
            
            // Update all legend items at once
            setTimeout(() => {
                this.categoryRevealOrder.forEach(category => {
                    const item = document.querySelector(`.legend-item[data-filter="${category}"]`);
                    if (item) {
                        item.classList.add('enabled');
                        item.classList.remove('disabled');
                    }
                });
            }, 100);
            
            // Add all nodes to simulation at once
            this.addNodesToSimulation(this.categoryRevealOrder);
            return;
        }
        
        // First time visiting this department in this session - reveal categories one by one
        let revealIndex = 0; // Start at 0 for first category
        
        const revealNext = () => {
            if (revealIndex < this.categoryRevealOrder.length) {
                const category = this.categoryRevealOrder[revealIndex];
                this.enabledCategories.add(category);
                
                // Update legend to show this category is now visible
                this.eventBus.emit('categoryRevealed', { category });
                
                // Add nodes of this category to the simulation NOW
                this.addNodesToSimulation([category]);
                
                revealIndex++;
                // Schedule next reveal
                if (revealIndex < this.categoryRevealOrder.length) {
                    setTimeout(() => revealNext(), 2000); // 2 seconds between reveals
                } else {
                    // Mark as revealed for this specific department in this session
                    setTimeout(() => {
                        if (this.visitedDepartments) {
                            this.visitedDepartments.add(this.currentDepartmentId);
                        }
                    }, 500);
                }
            }
        };
        
        // Start revealing after initial setup
        setTimeout(() => revealNext(), 1000);
    }
    
    drawVizLink(source, target, type, opacity = 1.0) {
        const colors = {
            degree: '#00ffff',
            'degree-track': '#80c0ff',
            internal: '#ffff00',
            external: '#ff00ff'
        };
        
        const pulseConfig = {
            degree: { frequency: 1.5, amplitude: 0.5, baseWidth: 2, baseGlow: 12 },
            'degree-track': { frequency: 2, amplitude: 0.3, baseWidth: 1.5, baseGlow: 8 },
            internal: { frequency: 1.8, amplitude: 0.4, baseWidth: 2, baseGlow: 10 },
            external: { frequency: 1.5, amplitude: 0.6, baseWidth: 2.5, baseGlow: 15 }
        };
        
        const config = pulseConfig[type] || pulseConfig.degree;
        const pulse = Math.sin(this.animationTime * config.frequency) * config.amplitude;
        
        this.ctx.save();
        this.ctx.strokeStyle = colors[type] || colors.degree;
        this.ctx.lineWidth = (config.baseWidth + pulse) * this.zoomLevel;
        this.ctx.shadowBlur = (config.baseGlow + pulse) * this.zoomLevel;
        this.ctx.shadowColor = colors[type] || colors.degree;
        this.ctx.globalAlpha = 0.8 * opacity;
        
        this.ctx.beginPath();
        this.ctx.moveTo(source.x, source.y);
        this.ctx.lineTo(target.x, target.y);
        this.ctx.stroke();
        
        this.ctx.restore();
    }
    
    drawVizNode(node, opacity = 1.0) {
        const colors = {
            central: '#ff6600',
            degree: '#00ffff',
            internal: '#ffff00',
            external: '#ff00ff',
            track: '#80c0ff'
        };
        
        // Subtle pulsing effect for non-central nodes
        let radius = node.radius;
        let shadowBlur = 15;
        
        if (node.type === 'track') {
            // Very subtle pulse for track nodes
            const pulse = Math.sin(this.animationTime * 2) * 0.5;
            radius += pulse;
            shadowBlur = 8 + pulse;
        } else if (node.type !== 'central') {
            // Subtle pulse for other nodes
            const pulse = Math.sin(this.animationTime * 1.5) * 0.8;
            radius += pulse;
            shadowBlur = 12 + pulse;
        } else {
            // Central node has steady glow
            shadowBlur = 20;
        }
        
        this.ctx.save();
        this.ctx.globalAlpha = opacity;
        this.ctx.fillStyle = colors[node.type] || '#ffffff';
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.lineWidth = (node.type === 'track' ? 1.5 : 2) * this.zoomLevel;
        this.ctx.shadowBlur = shadowBlur * opacity * this.zoomLevel;
        this.ctx.shadowColor = colors[node.type] || '#ffffff';
        
        this.ctx.beginPath();
        this.ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.stroke();
        
        this.ctx.restore();
    }
    
    drawVizLabel(node, opacity = 1.0) {
        const dept = this.currentDepartment;
        const isComplexDepartment = 
            (dept.degrees?.length || 0) + 
            (dept.internalPartners?.length || 0) + 
            (dept.externalPartners?.length || 0) > 20;
        
        // Adaptive font sizing - adjust based on node count to prevent overlap
        const totalNodes = this.vizNodes.length;
        let fontSize = 22;  // Base font size
        
        // Scale down fonts if there are many nodes
        if (totalNodes > 30) {
            fontSize = 18;  // Reduce for very crowded graphs
        } else if (totalNodes > 20) {
            fontSize = 20;  // Slightly reduce for crowded graphs
        }
        
        if (node.type === 'central') {
            fontSize = totalNodes > 30 ? 28 : 32;  // Central node size
        } else if (node.type === 'track') {
            fontSize = 16;  // Smaller track node size
        } else if (isComplexDepartment) {
            fontSize = node.type === 'central' ? 28 : 18;  // Further adjusted for complex departments
        }
        
        // Apply zoom scaling to font size
        fontSize *= this.zoomLevel;
        
        this.ctx.save();
        this.ctx.globalAlpha = opacity;
        this.ctx.font = `bold ${fontSize}px Orbitron`;
        this.ctx.fillStyle = '#ffffff';
        this.ctx.shadowBlur = 3 * opacity * this.zoomLevel;
        this.ctx.shadowColor = '#000000';
        this.ctx.shadowOffsetX = 1 * this.zoomLevel;
        this.ctx.shadowOffsetY = 1 * this.zoomLevel;
        
        // Get wrapped text lines
        const maxWidth = this.getMaxWidthForNode(node, isComplexDepartment) * this.zoomLevel;
        const lines = this.getWrappedLines(node.name, maxWidth);
        const lineHeight = (fontSize + 4);
        
        // Calculate position - add more spacing below node (scaled with zoom)
        let textX = node.x;
        let textY = node.y + node.radius + (25 * this.zoomLevel);
        let textAlign = 'center';
        
        // Edge-aware positioning
        const padding = 10 * this.zoomLevel;
        const totalHeight = lines.length * lineHeight;
        
        // Check bounds and legend
        const bounds = this.getTextPositionWithBounds(
            node, textX, textY, maxWidth, totalHeight, padding
        );
        
        textX = bounds.x;
        textY = bounds.y;
        textAlign = bounds.align;
        
        this.ctx.textAlign = textAlign;
        this.ctx.textBaseline = 'top';
        
        // Draw each line
        lines.forEach((line, i) => {
            this.ctx.fillText(line, textX, textY + i * lineHeight);
        });
        
        this.ctx.restore();
    }
    
    getMaxWidthForNode(node, isComplexDepartment) {
        // Increased widths for better text display
        switch(node.type) {
            case 'central': return 280;  // Much wider for center
            case 'degree': return isComplexDepartment ? 120 : 150;
            case 'internal': return isComplexDepartment ? 140 : 180;
            case 'external': return isComplexDepartment ? 140 : 180;
            case 'track': return 90;
            default: return 150;
        }
    }
    
    getWrappedLines(text, maxWidth) {
        const words = text.split(' ');
        const lines = [];
        let currentLine = '';
        
        words.forEach(word => {
            const testLine = currentLine + (currentLine ? ' ' : '') + word;
            const metrics = this.ctx.measureText(testLine);
            
            if (metrics.width > maxWidth && currentLine) {
                lines.push(currentLine);
                currentLine = word;
            } else {
                currentLine = testLine;
            }
        });
        
        if (currentLine) {
            lines.push(currentLine);
        }
        
        return lines;
    }
    
    getTextPositionWithBounds(node, x, y, width, height, padding) {
        const canvasWidth = this.canvas.width;
        const canvasHeight = this.canvas.height;
        let align = 'center';
        
        // Legend bounds
        const legendLeft = canvasWidth - 280;
        const legendTop = canvasHeight - 200;
        
        // Check right edge
        if (x + width / 2 > canvasWidth - padding) {
            x = canvasWidth - padding - width / 2;
        }
        
        // Check left edge
        if (x - width / 2 < padding) {
            x = padding + width / 2;
        }
        
        // Check bottom edge
        if (y + height > canvasHeight - padding) {
            y = node.y - node.radius - height - 10;
        }
        
        // Check legend overlap
        if (x + width / 2 > legendLeft && y + height > legendTop) {
            // Try moving left
            if (node.x > canvasWidth / 2) {
                x = legendLeft - width / 2 - padding;
            } else {
                // Move above
                y = legendTop - height - padding;
            }
        }
        
        return { x, y, align };
    }
    
    drawHoverTracks() {
        // Track nodes are now drawn as part of the main render loop
        // This method is no longer needed for drawing, but kept for compatibility
    }
    
    updateHoverState() {
        const previousHovered = this.hoveredNode;
        this.hoveredNode = null;
        
        // Check hover over degree nodes only
        this.vizNodes.forEach(node => {
            if (node.type === 'degree' && node.tracks && node.tracks.length > 0) {
                const dist = Math.sqrt(
                    Math.pow(this.mouseX - node.x, 2) + 
                    Math.pow(this.mouseY - node.y, 2)
                );
                
                if (dist < node.radius + 30) {
                    this.hoveredNode = node;
                }
            }
        });
        
        // Handle hover state changes
        if (this.hoveredNode !== previousHovered) {
            if (this.hoveredNode) {
                // Node is being hovered - add track nodes to simulation
                this.addTrackNodes(this.hoveredNode);
            } else if (previousHovered) {
                // No longer hovering - remove track nodes from simulation
                this.removeTrackNodes();
            }
        }
    }
    
    addTrackNodes(degreeNode) {
        if (!degreeNode.tracks || degreeNode.tracks.length === 0) return;
        
        // Clear any existing track nodes
        this.removeTrackNodes();
        
        // Pin the hovered node
        degreeNode.fx = degreeNode.x;
        degreeNode.fy = degreeNode.y;
        
        const trackRadius = 70;
        const angleStep = Math.PI / (degreeNode.tracks.length + 1);
        const startAngle = -Math.PI / 2 - (angleStep * degreeNode.tracks.length) / 2;
        
        // Create track nodes
        degreeNode.tracks.forEach((track, index) => {
            const angle = startAngle + angleStep * (index + 1);
            const trackNode = {
                id: `track-${degreeNode.id}-${index}`,
                name: track.name,
                type: 'track',
                parent: degreeNode,
                radius: 10,
                originalRadius: 10,  // Store original radius for zoom
                x: degreeNode.x + Math.cos(angle) * trackRadius,
                y: degreeNode.y + Math.sin(angle) * trackRadius,
                vx: 0,
                vy: 0
            };
            
            // Apply current zoom level to track node
            trackNode.radius = trackNode.originalRadius * this.zoomLevel;
            
            this.trackNodes.push(trackNode);
            this.vizNodes.push(trackNode);
            
            // Create link to parent
            const trackLink = {
                source: degreeNode,
                target: trackNode,
                type: 'degree-track'
            };
            this.trackLinks.push(trackLink);
            this.vizLinks.push(trackLink);
        });
        
        // Restart simulation with new nodes
        if (this.simulation) {
            this.simulation.nodes(this.vizNodes);
            this.simulation.force('link').links(this.vizLinks);
            this.simulation.alpha(0.5).restart();
        }
    }
    
    removeTrackNodes() {
        if (this.trackNodes.length === 0) return;
        
        // Unpin the previously hovered node
        this.vizNodes.forEach(node => {
            if (node.fx !== undefined && node.type === 'degree') {
                delete node.fx;
                delete node.fy;
            }
        });
        
        // Remove track nodes from main arrays
        this.trackNodes.forEach(trackNode => {
            const nodeIndex = this.vizNodes.indexOf(trackNode);
            if (nodeIndex > -1) {
                this.vizNodes.splice(nodeIndex, 1);
            }
        });
        
        this.trackLinks.forEach(trackLink => {
            const linkIndex = this.vizLinks.indexOf(trackLink);
            if (linkIndex > -1) {
                this.vizLinks.splice(linkIndex, 1);
            }
        });
        
        // Clear track arrays
        this.trackNodes = [];
        this.trackLinks = [];
        
        // Restart simulation without track nodes
        if (this.simulation) {
            this.simulation.nodes(this.vizNodes);
            this.simulation.force('link').links(this.vizLinks);
            this.simulation.alpha(0.3).restart();
        }
    }
    
    setHoveredFilter(filterType) {
        this.hoveredFilter = filterType;
    }
    
    toggleCategory(category) {
        if (this.enabledCategories.has(category)) {
            this.enabledCategories.delete(category);
        } else {
            this.enabledCategories.add(category);
        }
        
        // Restart simulation to rearrange nodes
        if (this.simulation) {
            this.simulation.alpha(0.3).restart();
        }
        
        this.eventBus.emit('categoryToggled', { 
            category, 
            enabled: this.enabledCategories.has(category) 
        });
    }
    
    isCategoryEnabled(category) {
        return this.enabledCategories.has(category);
    }
    
    addNodesToSimulation(categories) {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        
        // Find nodes to add based on categories
        let nodesToAdd = [];
        if (Array.isArray(categories)) {
            categories.forEach(category => {
                const categoryNodes = this.vizNodes.filter(n => n.type === category);
                nodesToAdd.push(...categoryNodes);
            });
        }
        
        // Add these nodes to the simulation
        if (this.simulation && nodesToAdd.length > 0) {
            // Get current nodes in simulation
            const currentNodes = this.simulation.nodes();
            
            // Add new nodes to simulation
            nodesToAdd.forEach(node => {
                if (!currentNodes.includes(node)) {
                    // Ensure node starts from center
                    node.x = centerX + (Math.random() - 0.5) * 20;
                    node.y = centerY + (Math.random() - 0.5) * 20;
                    node.vx = 0;
                    node.vy = 0;
                    
                    // Apply current zoom level if not already applied
                    if (node.originalRadius && !node.zoomApplied) {
                        node.radius = node.originalRadius * this.zoomLevel;
                        node.zoomApplied = true;
                    }
                    
                    currentNodes.push(node);
                }
            });
            
            // Update simulation with new nodes
            this.simulation.nodes(currentNodes);
            
            // Update links for the new nodes
            const visibleLinks = this.vizLinks.filter(link => {
                // Handle both node objects and IDs
                const sourceNode = typeof link.source === 'object' ? link.source : 
                    this.vizNodes.find(n => n.id === link.source);
                const targetNode = typeof link.target === 'object' ? link.target : 
                    this.vizNodes.find(n => n.id === link.target);
                    
                return sourceNode && targetNode && 
                       currentNodes.includes(sourceNode) && 
                       currentNodes.includes(targetNode);
            });
            this.simulation.force('link').links(visibleLinks);
            
            // Restart simulation with stronger alpha to create pop-out effect
            this.simulation.alpha(0.7).restart();
            
            // Add temporary radial force to push nodes outward - match main visualization scaling
            const radialForce = d3.forceRadial()
                .radius(d => {
                    const maxRadius = Math.min(this.canvas.width, this.canvas.height) * 0.45;  // Match main simulation
                    switch(d.type) {
                        case 'central': return 0;
                        case 'degree': return maxRadius * 0.50;
                        case 'internal': return maxRadius * 0.70;
                        case 'external': return maxRadius * 0.90;
                        default: return maxRadius * 0.75;
                    }
                })
                .x(centerX)
                .y(centerY)
                .strength(1.2); // Stronger force for pop-out effect
            
            this.simulation.force('radialPop', radialForce);
            
            // Reduce force strength after animation
            setTimeout(() => {
                if (this.simulation) {
                    this.simulation.force('radialPop').strength(0.8);
                }
            }, 1000);
        }
    }
    
    animateNodesFromCenter(category = null) {
        // This method is now just a wrapper for backwards compatibility
        if (category === 0) {
            // Animate all nodes at once (for returning visits)
            this.addNodesToSimulation(this.categoryRevealOrder);
        } else if (category) {
            // Animate only nodes of this category
            this.addNodesToSimulation([category]);
        }
    }
    
    destroy() {
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }
        if (this.simulation) {
            this.simulation.stop();
            this.simulation = null;
        }
        // Clear all nodes and links
        this.vizNodes = [];
        this.vizLinks = [];
        this.trackNodes = [];
        this.trackLinks = [];
        // Reset categories
        this.enabledCategories.clear();
        this.enabledCategories.add('central');
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
}