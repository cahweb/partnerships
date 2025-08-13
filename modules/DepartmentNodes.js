export class DepartmentNodes {
    constructor(container, departmentData, eventBus) {
        this.container = container;
        this.departmentData = departmentData;
        this.eventBus = eventBus;
        this.nodes = [];
        this.nodesGenerated = false;
        
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
    }
    
    generateNodes() {
        if (this.nodesGenerated) return;
        
        const positions = this.calculateResponsivePositions();
        
        // Generate nodes with staggered delay like original
        this.departmentNames.forEach((name, index) => {
            setTimeout(() => {
                const node = this.createNode(name, positions[index], index);
                this.container.appendChild(node.element);
                this.nodes.push(node);
                
                // Animate in after adding to DOM
                setTimeout(() => {
                    node.element.classList.add('visible');
                }, 100);
            }, index * 200); // 200ms delay between each node appearing
        });
        
        this.nodesGenerated = true;
        
        // Emit event after all nodes are created
        setTimeout(() => {
            this.eventBus.emit('departmentNodesGenerated', { nodes: this.nodes });
        }, this.departmentNames.length * 200 + 100);
    }
    
    createNode(name, position, index) {
        const node = document.createElement('div');
        node.className = 'neon-node';
        node.textContent = name;
        node.style.left = position.x + 'px';
        node.style.top = position.y + 'px';
        node.style.opacity = '0';
        node.style.transform = 'scale(0) rotate(180deg)';
        node.setAttribute('data-department', name);
        
        // Add click handler
        node.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = this.getDepartmentId(name);
            this.eventBus.emit('departmentNodeClicked', { 
                element: node, 
                departmentId: id,
                departmentName: name
            });
        });
        
        return {
            element: node,
            name: name,
            position: position,
            index: index
        };
    }
    
    calculateResponsivePositions() {
        const width = window.innerWidth;
        const height = window.innerHeight;
        const centerX = width / 2;
        const centerY = height / 2;
        
        // Get text bounds to create exclusion zone
        const textBounds = this.getTextBounds();
        
        // Calculate radius that clears the text box with good spacing
        const textWidth = textBounds.right - textBounds.left;
        const textHeight = textBounds.bottom - textBounds.top;
        const textDiagonal = Math.sqrt(textWidth * textWidth + textHeight * textHeight);
        
        // Base radius should be at least half the text diagonal plus padding
        const minRadius = (textDiagonal / 2) + 100; // 100px padding from text
        const maxRadius = Math.min(width, height) * 0.4;
        const baseRadius = Math.max(minRadius, Math.min(maxRadius, Math.min(width, height) * 0.35));
        
        const positions = [];
        const totalNodes = this.departmentNames.length;
        
        for (let i = 0; i < totalNodes; i++) {
            // Evenly distribute angles around a circle
            // Start from top (-PI/2) and go clockwise
            const angle = (i / totalNodes) * Math.PI * 2 - Math.PI / 2;
            
            // Calculate position on the circle
            let x = centerX + Math.cos(angle) * baseRadius;
            let y = centerY + Math.sin(angle) * baseRadius;
            
            // Adjust for node dimensions (center the node)
            // Approximate node width/height
            const nodeWidth = 200;
            const nodeHeight = 60;
            x = x - nodeWidth / 2;
            y = y - nodeHeight / 2;
            
            // Keep nodes within viewport with padding
            const padding = 100;
            x = Math.max(padding, Math.min(width - padding - nodeWidth, x));
            y = Math.max(padding, Math.min(height - padding - nodeHeight, y));
            
            positions.push({ x, y });
        }
        
        return positions;
    }
    
    getTextBounds() {
        // Get bounds of the main text element for exclusion zone calculation
        const collegeText = document.getElementById('collegeText');
        
        if (collegeText && collegeText.offsetParent !== null) {
            const rect = collegeText.getBoundingClientRect();
            return {
                left: rect.left,
                right: rect.right,
                top: rect.top,
                bottom: rect.bottom
            };
        }
        
        // Fallback to center area if text not found
        const width = window.innerWidth;
        const height = window.innerHeight;
        return {
            left: width * 0.3,
            right: width * 0.7,
            top: height * 0.4,
            bottom: height * 0.6
        };
    }
    
    getDepartmentId(name) {
        const idMap = {
            'School of Performing Arts': 'school-of-performing-arts',
            'School of Visual Arts and Design': 'school-of-visual-arts-and-design',
            'English': 'english',
            'History': 'history',
            'Modern Languages and Literatures': 'modern-languages-and-literatures',
            'Philosophy': 'philosophy',
            'Writing and Rhetoric': 'writing-and-rhetoric',
            'Texts and Technology': 'texts-and-technology',
            'Themed Experience': 'themed-experience',
            'Women\'s and Gender Studies': 'womens-and-gender-studies'
        };
        return idMap[name] || name.toLowerCase().replace(/\s+/g, '-');
    }
    
    hideNodes() {
        this.nodes.forEach((node, index) => {
            setTimeout(() => {
                node.element.classList.remove('visible');
            }, index * 50);
        });
    }
    
    showNodes() {
        this.nodes.forEach((node, index) => {
            setTimeout(() => {
                node.element.classList.add('visible');
            }, index * 100);
        });
    }
    
    getNode(departmentName) {
        return this.nodes.find(node => node.name === departmentName);
    }
    
    destroy() {
        this.nodes.forEach(node => {
            node.element.remove();
        });
        this.nodes = [];
        this.nodesGenerated = false;
    }
}