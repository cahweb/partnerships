export class CircuitAnimation {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.lines = [];
        this.intersections = [];
        this.pulses = [];
        this.grid = 30;
        this.gridPoints = [];
        this.animationFrame = null;
        this.isRunning = false;
        this.edgeCounter = 0;
        
        this.setupCanvas();
        this.generateGrid();
    }
    
    setupCanvas() {
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
    }
    
    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.generateGrid();
    }
    
    generateGrid() {
        this.gridPoints = [];
        for (let x = 0; x <= this.canvas.width; x += this.grid) {
            for (let y = 0; y <= this.canvas.height; y += this.grid) {
                this.gridPoints.push({ x, y });
            }
        }
    }
    
    getRandomColor() {
        const colors = ['#ffff00', '#00ff80', '#80ff00', '#8000ff', '#ff0080'];
        return colors[Math.floor(Math.random() * colors.length)];
    }
    
    getTextBoundaries() {
        const collegeText = document.getElementById('collegeText');
        
        // Default fallback boundaries for text area (centered)
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
            
            // Get exact border edges (not adding padding)
            textBounds = {
                left: rect.left - canvasRect.left,
                right: rect.right - canvasRect.left,
                top: rect.top - canvasRect.top,
                bottom: rect.bottom - canvasRect.top
            };
            
            // Ensure bounds are within canvas
            textBounds.left = Math.max(0, textBounds.left);
            textBounds.right = Math.min(this.canvas.width, textBounds.right);
            textBounds.top = Math.max(0, textBounds.top);
            textBounds.bottom = Math.min(this.canvas.height, textBounds.bottom);
        }
        
        return textBounds;
    }
    
    createRandomLine(forcedEdge = null) {
        // Get text boundaries for lines to intersect with
        const textBounds = this.getTextBoundaries();
        
        // Choose edge - use forced edge for even distribution, or random
        const edge = forcedEdge !== null ? forcedEdge : Math.floor(Math.random() * 4);
        let startPoint, straightEndPoint, curveEndPoint;
        
        // Create straight segment length (20-40% of the way across screen)
        const straightLength = (0.2 + Math.random() * 0.2) * Math.min(this.canvas.width, this.canvas.height);
        
        switch(edge) {
            case 0: // Top edge - lines go down toward text box
                startPoint = {
                    x: Math.random() * this.canvas.width,
                    y: -this.grid * 2 // Start offscreen
                };
                // Straight segment goes down, but stops before text box
                straightEndPoint = {
                    x: startPoint.x,
                    y: Math.min(startPoint.y + straightLength, textBounds.top - this.grid * 4)
                };
                // Curve to text box top edge at random position
                curveEndPoint = {
                    x: textBounds.left + Math.random() * (textBounds.right - textBounds.left),
                    y: textBounds.top
                };
                break;
            case 1: // Right edge - lines go left toward text box
                startPoint = {
                    x: this.canvas.width + this.grid * 2, // Start offscreen
                    y: Math.random() * this.canvas.height
                };
                // Straight segment goes left, but stops before text box
                straightEndPoint = {
                    x: Math.max(startPoint.x - straightLength, textBounds.right + this.grid * 4),
                    y: startPoint.y
                };
                // Curve to text box right edge at random position
                curveEndPoint = {
                    x: textBounds.right,
                    y: textBounds.top + Math.random() * (textBounds.bottom - textBounds.top)
                };
                break;
            case 2: // Bottom edge - lines go up toward text box
                startPoint = {
                    x: Math.random() * this.canvas.width,
                    y: this.canvas.height + this.grid * 2 // Start offscreen
                };
                // Straight segment goes up, but stops before text box
                straightEndPoint = {
                    x: startPoint.x,
                    y: Math.max(startPoint.y - straightLength, textBounds.bottom + this.grid * 4)
                };
                // Curve to text box bottom edge at random position
                curveEndPoint = {
                    x: textBounds.left + Math.random() * (textBounds.right - textBounds.left),
                    y: textBounds.bottom
                };
                break;
            case 3: // Left edge - lines go right toward text box
                startPoint = {
                    x: -this.grid * 2, // Start offscreen
                    y: Math.random() * this.canvas.height
                };
                // Straight segment goes right, but stops before text box
                straightEndPoint = {
                    x: Math.min(startPoint.x + straightLength, textBounds.left - this.grid * 4),
                    y: startPoint.y
                };
                // Curve to text box left edge at random position
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
        
        // Check for intersections with existing lines
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
        const branchLength = this.grid * (2 + Math.floor(Math.random() * 3)); // Shorter branches
        
        let branchEnd = {
            x: branchStart.x + Math.cos(branchAngle) * branchLength,
            y: branchStart.y + Math.sin(branchAngle) * branchLength
        };
        
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
            glowIntensity: parentLine.glowIntensity * 0.7,
            parentProgress: branchParentProgress // When parent reaches this progress, branch starts
        };
        
        parentLine.branches.push(branch);
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
                this.createPulse(intersection.x, intersection.y, intersection.color);
            }
        });
    }
    
    getLineIntersection(line1, line2) {
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
        const intersections = [];
        line1Segments.forEach(seg1 => {
            line2Segments.forEach(seg2 => {
                const intersection = checkSegmentIntersection(seg1.start, seg1.end, seg2.start, seg2.end);
                if (intersection) {
                    intersections.push(intersection);
                }
            });
        });
        
        // Return the first intersection found
        return intersections.length > 0 ? intersections[0] : null;
    }
    
    getLineSegments(line) {
        if (!line.isCurved) {
            // Simple straight line (branches)
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
        // Simple color blending - return the brighter color or mix them
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
    
    createPulse(x, y, color) {
        this.pulses.push({
            x: x,
            y: y,
            radius: 0,
            maxRadius: 30,
            color: color || '#ffffff',
            intensity: 1,
            speed: 2
        });
    }
    
    updateLines() {
        this.lines.forEach(line => {
            if (line.progress < 1) {
                line.progress = Math.min(1, line.progress + 0.02); // Slower for more dramatic effect
            }
            
            // Update branches
            line.branches?.forEach(branch => {
                if (line.progress >= branch.parentProgress && branch.progress < 1) {
                    branch.progress = Math.min(1, branch.progress + 0.03);
                }
            });
        });
    }
    
    updatePulses() {
        this.pulses = this.pulses.filter(pulse => {
            pulse.radius += pulse.speed;
            pulse.intensity *= 0.95; // Fade out
            return pulse.intensity > 0.01 && pulse.radius < pulse.maxRadius;
        });
    }
    
    updateIntersections() {
        this.intersections = this.intersections.filter(intersection => {
            if (intersection.isIntersection) {
                intersection.currentRadius = Math.min(intersection.currentRadius + 0.5, intersection.maxRadius);
                intersection.intensity *= 0.995; // Very slow fade for persistent glow
                return intersection.intensity > 0.01;
            }
            return false;
        });
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
            this.ctx.lineWidth = line.width * 0.7;
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
        this.ctx.lineWidth = line.width * 0.7;
        this.ctx.strokeStyle = '#ffffff';
        
        this.ctx.beginPath();
        this.ctx.moveTo(line.start.x, line.start.y);
        
        if (line.progress <= straightProgress) {
            this.ctx.lineTo(currentEnd.x, currentEnd.y);
        } else {
            this.ctx.lineTo(line.straightEnd.x, line.straightEnd.y);
            this.ctx.lineTo(currentEnd.x, currentEnd.y);
        }
        
        this.ctx.stroke();
        
        // Draw branches
        line.branches?.forEach(branch => {
            if (line.progress >= branch.parentProgress && branch.progress > 0) {
                this.drawLine(branch);
            }
        });
    }
    
    drawIntersections() {
        this.intersections.forEach(intersection => {
            // Draw glowing intersection circle
            const gradient = this.ctx.createRadialGradient(
                intersection.x, intersection.y, 0,
                intersection.x, intersection.y, intersection.currentRadius
            );
            gradient.addColorStop(0, intersection.color);
            gradient.addColorStop(0.7, `${intersection.color}88`);
            gradient.addColorStop(1, 'transparent');
            
            this.ctx.fillStyle = gradient;
            this.ctx.globalAlpha = intersection.intensity;
            this.ctx.beginPath();
            this.ctx.arc(intersection.x, intersection.y, intersection.currentRadius, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Draw bright center dot
            this.ctx.fillStyle = '#ffffff';
            this.ctx.globalAlpha = intersection.intensity * 0.9;
            this.ctx.beginPath();
            this.ctx.arc(intersection.x, intersection.y, 3, 0, Math.PI * 2);
            this.ctx.fill();
        });
    }
    
    drawGrid() {
        // Draw subtle grid dots - optimized for performance
        this.ctx.fillStyle = 'rgba(0, 255, 255, 0.1)';
        
        // Use a single path for all dots instead of individual paths
        this.ctx.beginPath();
        for (let i = 0; i < this.gridPoints.length; i++) {
            const point = this.gridPoints[i];
            this.ctx.moveTo(point.x + 1, point.y);
            this.ctx.arc(point.x, point.y, 1, 0, Math.PI * 2);
        }
        this.ctx.fill();
    }
    
    drawPulses() {
        this.pulses.forEach(pulse => {
            // Draw expanding ring
            this.ctx.strokeStyle = pulse.color;
            this.ctx.lineWidth = 2;
            this.ctx.globalAlpha = pulse.intensity * 0.8;
            this.ctx.shadowBlur = 10;
            this.ctx.shadowColor = pulse.color;
            
            this.ctx.beginPath();
            this.ctx.arc(pulse.x, pulse.y, pulse.radius, 0, Math.PI * 2);
            this.ctx.stroke();
            
            // Draw inner ring for more effect
            this.ctx.strokeStyle = '#ffffff';
            this.ctx.lineWidth = 1;
            this.ctx.globalAlpha = pulse.intensity * 0.5;
            this.ctx.shadowBlur = 5;
            this.ctx.shadowColor = '#ffffff';
            
            this.ctx.beginPath();
            this.ctx.arc(pulse.x, pulse.y, pulse.radius * 0.7, 0, Math.PI * 2);
            this.ctx.stroke();
        });
        
        // Reset shadow
        this.ctx.shadowBlur = 0;
    }
    
    animate() {
        if (!this.isRunning) return;
        
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw grid points as subtle dots
        this.drawGrid();
        
        // Update all elements
        this.updateLines();
        this.updateIntersections();
        this.updatePulses();
        
        // Draw all elements in correct order
        this.lines.forEach(line => {
            this.drawLine(line);
        });
        
        this.drawIntersections();
        this.drawPulses();
        
        // Reset alpha
        this.ctx.globalAlpha = 1;
        
        this.animationFrame = requestAnimationFrame(() => this.animate());
    }
    
    start() {
        this.isRunning = true;
        this.startTime = Date.now();
        
        // Generate lines with even distribution across edges
        const generateLine = () => {
            if (!this.isRunning) return;
            
            // Stop generating new lines after 8 seconds
            const elapsed = Date.now() - this.startTime;
            if (elapsed > 8000) return;
            
            // Use forced edge for even distribution
            this.createRandomLine(this.edgeCounter % 4);
            this.edgeCounter++;
            
            // Continue generating lines
            if (this.lines.length < 15) {
                setTimeout(generateLine, 200);
            } else if (this.lines.length < 30) {
                setTimeout(generateLine, 500);
            } else if (this.lines.length < 40) {
                setTimeout(generateLine, 1000);
            }
        };
        
        // Start generating lines
        generateLine();
        
        // Stop animation completely after 10 seconds
        setTimeout(() => {
            this.stop();
        }, 10000);
        
        // Start animation loop
        this.animate();
    }
    
    stop() {
        this.isRunning = false;
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
        }
    }
    
    forceComplete() {
        this.lines.forEach(line => {
            line.progress = 1;
            line.branches?.forEach(branch => {
                branch.progress = 1;
            });
        });
    }
}