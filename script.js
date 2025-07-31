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
        this.animationSpeed = 2;
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
        
        // Start line generation after a short delay
        setTimeout(() => {
            this.generateLines();
        }, 500);
        
        // Setup new UI functionality
        this.setupNewUI();
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
            // Setup main title click
            const collegeText = document.getElementById('collegeText');
            if (collegeText) {
                console.log('Setting up click handler for college text');
                collegeText.addEventListener('click', (e) => {
                    console.log('College text clicked!');
                    e.preventDefault();
                    e.stopPropagation();
                    this.showDataCard('college-of-arts-and-humanities');
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
        const interval = setInterval(() => {
            if (this.lines.length >= this.maxLines) {
                clearInterval(interval);
                this.showText();
                return;
            }
            
            this.createRandomLine();
        }, 200);
    }
    
    createRandomLine() {
        const startPoint = this.getRandomGridPoint();
        const direction = Math.random() < 0.5 ? 'horizontal' : 'vertical';
        const length = this.grid * (3 + Math.floor(Math.random() * 8));
        
        let endPoint;
        if (direction === 'horizontal') {
            endPoint = {
                x: Math.min(startPoint.x + length, this.canvas.width),
                y: startPoint.y
            };
        } else {
            endPoint = {
                x: startPoint.x,
                y: Math.min(startPoint.y + length, this.canvas.height)
            };
        }
        
        const line = {
            start: startPoint,
            end: endPoint,
            progress: 0,
            color: this.getRandomColor(),
            width: Math.random() < 0.3 ? 3 : 2,
            glowIntensity: 0.5 + Math.random() * 0.5
        };
        
        this.lines.push(line);
        this.checkIntersections(line);
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
                this.intersections.push({
                    x: intersection.x,
                    y: intersection.y,
                    intensity: 1,
                    maxRadius: 15,
                    currentRadius: 0,
                    color: this.blendColors(newLine.color, existingLine.color)
                });
                
                // Create pulse effect
                this.createPulse(intersection.x, intersection.y);
            }
        });
    }
    
    getLineIntersection(line1, line2) {
        const x1 = line1.start.x, y1 = line1.start.y;
        const x2 = line1.end.x, y2 = line1.end.y;
        const x3 = line2.start.x, y3 = line2.start.y;
        const x4 = line2.end.x, y4 = line2.end.y;
        
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
        
        // Position nodes in a circular pattern around the center
        const totalNodes = this.departmentNames.length;
        const baseRadius = Math.min(this.canvas.width, this.canvas.height) * 0.3;
        const radiusVariation = 100; // Add some variation to make it less rigid
        
        // Calculate angle for this node
        const angle = (index / totalNodes) * 2 * Math.PI;
        const radius = baseRadius + (Math.random() - 0.5) * radiusVariation;
        
        // Calculate initial position
        let x = centerX + Math.cos(angle) * radius;
        let y = centerY + Math.sin(angle) * radius;
        
        // Ensure nodes stay within screen bounds with proper margins
        const margin = 20;
        x = Math.max(margin, Math.min(x, this.canvas.width - nodeWidth - margin));
        y = Math.max(margin, Math.min(y, this.canvas.height - nodeHeight - margin));
        
        // Add extra padding around text area
        const textPadding = 80;
        const textArea = {
            left: textRect.left - textPadding,
            right: textRect.right + textPadding,
            top: textRect.top - textPadding,
            bottom: textRect.bottom + textPadding
        };
        
        // If overlapping with text, push node away
        if (this.overlapsWithText(x, y, nodeWidth, nodeHeight, textArea)) {
            // Push away from center text
            const pushAngle = Math.atan2(y - centerY, x - centerX);
            const pushDistance = Math.max(
                (textArea.right - textArea.left) / 2 + 50,
                (textArea.bottom - textArea.top) / 2 + 50
            );
            
            x = centerX + Math.cos(pushAngle) * pushDistance;
            y = centerY + Math.sin(pushAngle) * pushDistance;
            
            // Ensure still within bounds
            x = Math.max(margin, Math.min(x, this.canvas.width - nodeWidth - margin));
            y = Math.max(margin, Math.min(y, this.canvas.height - nodeHeight - margin));
        }
        
        // Check for overlap with existing nodes and adjust if needed
        let attempts = 0;
        const maxAttempts = 20;
        while (attempts < maxAttempts && this.overlapsWithExistingNodes(x, y, nodeWidth, nodeHeight)) {
            // Slightly adjust position
            const adjustAngle = Math.random() * 2 * Math.PI;
            const adjustDistance = 60;
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
        const buffer = 20; // Space between nodes
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
            }
        });
        
        // Move clicked node to center
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;
        const nodeRect = clickedNode.getBoundingClientRect();
        
        clickedNode.style.transition = 'all 0.8s cubic-bezier(0.68, -0.55, 0.265, 1.55)';
        clickedNode.style.left = (centerX - nodeRect.width / 2) + 'px';
        clickedNode.style.top = (centerY - nodeRect.height / 2) + 'px';
        clickedNode.style.transform = 'scale(1.2)';
        clickedNode.style.zIndex = '1000';
        
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
        
        // Restore clicked node position
        if (this.currentNode) {
            const nodeData = this.nodes.find(n => n.element === this.currentNode);
            if (nodeData) {
                this.currentNode.style.transition = 'all 0.8s cubic-bezier(0.68, -0.55, 0.265, 1.55)';
                this.currentNode.style.left = nodeData.x + 'px';
                this.currentNode.style.top = nodeData.y + 'px';
                this.currentNode.style.transform = 'scale(1)';
                this.currentNode.style.zIndex = '10';
            }
        }
        
        // Fade in other elements
        setTimeout(() => {
            this.canvas.classList.remove('fade-out');
            document.getElementById('textContainer').classList.remove('fade-out');
            
            // Fade in other nodes
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
        
        const angleStep = (Math.PI * 2) / allPartners.length;
        const radius = Math.min(canvasWidth, canvasHeight) * 0.3;
        
        allPartners.forEach((partner, index) => {
            const angle = index * angleStep;
            const x = centerX + Math.cos(angle) * radius;
            const y = centerY + Math.sin(angle) * radius;
            
            const partnerId = partner.name.toLowerCase().replace(/\s+/g, '-');
            this.vizNodes.push({
                id: partnerId,
                name: partner.name,
                x: x,
                y: y,
                type: partner.type,
                radius: 12
            });
            
            // Create link with type information
            this.vizLinks.push({
                source: department.id,
                target: partnerId,
                type: partner.type,
                opacity: 0
            });
        });
        
        // Animate links
        setTimeout(() => {
            this.animateVizLinks();
        }, 500);
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
        
        // Degrees Offered
        if (department.degrees && department.degrees.length > 0) {
            html += `
                <div class="card-section">
                    <h3 class="section-title">Degrees Offered</h3>
                    <div class="section-content">
                        <ul class="degrees-list">
                            ${department.degrees.map(degree => 
                                `<li class="degree-item">${degree}</li>`
                            ).join('')}
                        </ul>
                    </div>
                </div>
            `;
        }
        
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
                line.progress += 0.02;
            }
            this.drawLine(line);
        });
        
        // Draw and update intersections
        this.intersections = this.intersections.filter(intersection => {
            intersection.currentRadius += 0.5;
            intersection.intensity *= 0.98;
            
            if (intersection.intensity > 0.01) {
                this.drawIntersection(intersection);
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
            this.vizCtx.fillStyle = '#ff6600';
            this.vizCtx.font = 'bold 16px Orbitron';
            this.vizCtx.shadowColor = '#ff6600';
            this.vizCtx.shadowBlur = 8;
        } else if (node.type === 'internal') {
            this.vizCtx.fillStyle = '#ffff00';
            this.vizCtx.font = '12px Orbitron';
            this.vizCtx.shadowColor = '#ffff00';
            this.vizCtx.shadowBlur = 5;
        } else if (node.type === 'external') {
            this.vizCtx.fillStyle = '#ff00ff';
            this.vizCtx.font = '12px Orbitron';
            this.vizCtx.shadowColor = '#ff00ff';
            this.vizCtx.shadowBlur = 5;
        } else {
            this.vizCtx.fillStyle = '#ffffff';
            this.vizCtx.font = '12px Orbitron';
            this.vizCtx.shadowColor = '#000000';
            this.vizCtx.shadowBlur = 3;
        }
        
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
        
        this.vizCtx.restore();
    }
    
    drawLine(line) {
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
