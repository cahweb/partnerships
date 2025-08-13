import { EventBus } from './EventBus.js';
import { CircuitAnimation } from './CircuitAnimation.js';
import { DepartmentNodes } from './DepartmentNodes.js';
import { PartnershipGraph } from './PartnershipGraph.js';
import { DataCard } from './DataCard.js';

export class AppCoordinator {
    constructor() {
        this.eventBus = new EventBus();
        this.departmentData = null;
        this.isDetailView = false;
        this.currentDepartmentId = null;
        this.canSkipAnimation = true;
        
        // UI elements
        this.collegeText = document.getElementById('collegeText');
        this.digitalText = document.getElementById('digitalText');
        this.artsText = document.getElementById('artsText');
        this.humanitiesText = document.getElementById('humanitiesText');
        this.exploreButton = document.getElementById('exploreButton');
        this.backButton = document.getElementById('backButton');
        this.deptInfoButton = document.getElementById('deptInfoButton');
        this.popupOverlay = document.getElementById('popupOverlay');
        this.nodeContainer = document.querySelector('.node-container');
        this.vizArea = document.querySelector('.viz-area');
        
        this.init();
    }
    
    async init() {
        // Load department data
        await this.loadDepartmentData();
        
        // Initialize components
        this.initializeComponents();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Setup UI interactions
        this.setupUIInteractions();
        
        // Setup animation skip
        this.setupAnimationSkip();
        
        // Setup resize handling
        this.setupResizeHandler();
        
        // Start text animation sequence FIRST
        this.startTextAnimationSequence();
        
        // Start circuit animation AFTER text appears
        setTimeout(() => {
            this.circuitAnimation.start();
        }, 1000); // Wait 1 second for text to appear
    }
    
    setupResizeHandler() {
        window.addEventListener('resize', () => {
            this.handleGlobalResize();
        });
    }
    
    handleGlobalResize() {
        // Handle any global UI elements that need repositioning
        // The individual components handle their own resize logic
        
        // Reposition popup overlay if it's visible
        if (this.popupOverlay && this.popupOverlay.classList.contains('show')) {
            // Popup overlay is already responsive with CSS, but we can trigger
            // a repaint if needed
            this.popupOverlay.style.display = 'none';
            this.popupOverlay.offsetHeight; // Force reflow
            this.popupOverlay.style.display = '';
        }
        
        // Update department info container positioning if visible
        const deptInfoContainer = document.getElementById('deptInfoContainer');
        if (deptInfoContainer && deptInfoContainer.style.display !== 'none') {
            // Apply responsive scaling changes immediately
            deptInfoContainer.style.transition = 'none';
            deptInfoContainer.offsetHeight; // Force reflow
            deptInfoContainer.style.transition = '';
        }
    }
    
    async loadDepartmentData() {
        try {
            // Try multiple paths for the JSON file
            const paths = ['./new_data.json', 'new_data.json', '/new_data.json'];
            let loaded = false;
            
            for (const path of paths) {
                try {
                    const response = await fetch(path);
                    if (response.ok) {
                        this.departmentData = await response.json();
                        console.log('Department data loaded successfully from:', path);
                        loaded = true;
                        break;
                    }
                } catch (e) {
                    // Try next path
                    continue;
                }
            }
            
            if (!loaded) {
                throw new Error('Could not load from any path');
            }
        } catch (error) {
            console.error('Error loading department data:', error);
            console.warn('Using embedded fallback data for local development');
            
            // Fallback embedded data (minimal version)
            this.departmentData = {
                departments: [
                    {
                        id: "school-of-visual-arts-and-design",
                        name: "School of Visual Arts and Design",
                        degrees: ["Art BFA", "Architecture BSAS", "Digital Media and Game Design"],
                        internalPartners: ["SVAD Gallery", "Maker Space"],
                        externalPartners: ["Orlando Museum of Art", "CityArts"],
                        highlights: [
                            { title: "SVAD Gallery", url: "https://svad.cah.ucf.edu/gallery/" }
                        ]
                    },
                    {
                        id: "college-of-arts-and-humanities",
                        name: "College of Arts and Humanities",
                        degrees: ["Texts and Technology PhD", "Themed Experience MS"],
                        internalPartners: ["CHDR", "LIFE at UCF"],
                        externalPartners: ["National Endowment for the Arts"],
                        highlights: [
                            { title: "Veterans Legacy Program", url: "https://vlp.cah.ucf.edu/" }
                        ]
                    }
                ]
            };
        }
    }
    
    initializeComponents() {
        // Circuit animation
        const circuitCanvas = document.getElementById('circuitCanvas');
        this.circuitAnimation = new CircuitAnimation(circuitCanvas);
        
        // Create a map of department IDs for easy lookup
        this.departmentMap = {};
        if (this.departmentData && this.departmentData.departments) {
            this.departmentData.departments.forEach(dept => {
                this.departmentMap[dept.id] = dept;
            });
            console.log('Department map created:', Object.keys(this.departmentMap));
        } else {
            console.warn('No department data available for mapping');
        }
        
        // Department nodes
        this.departmentNodes = new DepartmentNodes(
            this.nodeContainer,
            this.departmentMap,
            this.eventBus
        );
        
        // Partnership graph
        const vizCanvas = document.getElementById('nodeVizCanvas');
        this.partnershipGraph = new PartnershipGraph(
            vizCanvas,
            this.departmentMap,
            this.eventBus
        );
        
        // Data card
        this.dataCard = new DataCard(
            document.body,
            this.departmentMap,
            this.eventBus
        );
    }
    
    setupEventListeners() {
        // Department node clicked
        this.eventBus.on('departmentNodeClicked', ({ element, departmentId, departmentName }) => {
            this.enterDetailView(element, departmentId);
        });
        
        // External link clicked
        this.eventBus.on('externalLinkClicked', ({ url, department }) => {
            this.showPopup(url, department);
        });
        
        // Filter changed
        this.eventBus.on('filterChanged', ({ filter }) => {
            console.log('Filter changed to:', filter);
        });
    }
    
    setupUIInteractions() {
        // Explore button
        this.exploreButton.addEventListener('click', () => {
            this.exploreClicked();
        });
        
        // Back button
        this.backButton.addEventListener('click', () => {
            this.exitDetailView();
        });
        
        // Department info button
        this.deptInfoButton.addEventListener('click', () => {
            if (this.currentDepartmentId) {
                this.dataCard.showDataCard(this.currentDepartmentId);
            }
        });
        
        // College text click (after animation)
        this.collegeText.style.pointerEvents = 'none';
        this.collegeText.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            // Hide explore button if visible
            if (this.exploreButton.style.display !== 'none') {
                this.exploreButton.style.opacity = '0';
                this.exploreButton.style.transform = 'translateY(50px) scale(0.8)';
                setTimeout(() => {
                    this.exploreButton.style.display = 'none';
                }, 800);
            }
            
            // Generate nodes if not already done
            if (!this.departmentNodes.nodesGenerated) {
                this.departmentNodes.generateNodes();
            } else {
                // Enter detail view for the college
                this.enterDetailView(this.digitalText, 'college-of-arts-and-humanities');
            }
        });
        
        // Legend filters
        this.setupLegendFilters();
        
        // Debug toggle
        const debugToggle = document.getElementById('debugToggle');
        if (debugToggle) {
            debugToggle.addEventListener('click', () => {
                document.body.classList.toggle('debug-bounds');
            });
        }
    }
    
    setupLegendFilters() {
        const legendItems = document.querySelectorAll('.legend-item[data-filter]');
        
        legendItems.forEach(item => {
            if (!item.classList.contains('debug-toggle')) {
                const category = item.getAttribute('data-filter');
                
                // Hover effect - highlight this category, dim others
                item.addEventListener('mouseenter', () => {
                    if (this.partnershipGraph) {
                        this.partnershipGraph.setHoveredFilter(category);
                    }
                });
                
                item.addEventListener('mouseleave', () => {
                    if (this.partnershipGraph) {
                        this.partnershipGraph.setHoveredFilter(null);
                    }
                });
                
                // Click to toggle category on/off
                item.addEventListener('click', () => {
                    if (this.partnershipGraph) {
                        this.partnershipGraph.toggleCategory(category);
                        
                        // Update visual state
                        if (this.partnershipGraph.isCategoryEnabled(category)) {
                            item.classList.add('enabled');
                            item.classList.remove('disabled');
                        } else {
                            item.classList.remove('enabled');
                            item.classList.add('disabled');
                        }
                    }
                });
            }
        });
        
        // Listen for category reveals from progressive animation
        this.eventBus.on('categoryRevealed', ({ category }) => {
            const item = document.querySelector(`.legend-item[data-filter="${category}"]`);
            if (item) {
                item.classList.add('enabled');
                item.classList.remove('disabled');
            }
        });
        
        // Initially disable all legend items - they'll be enabled by progressive reveal
        legendItems.forEach(item => {
            if (!item.classList.contains('debug-toggle')) {
                item.classList.add('disabled');
            }
        });
    }
    
    setupAnimationSkip() {
        // Canvas click to skip
        const circuitCanvas = document.getElementById('circuitCanvas');
        circuitCanvas.addEventListener('click', () => {
            if (this.canSkipAnimation && !this.buttonShown) {
                this.skipToFinalState();
            }
        });
        
        // Document click to skip
        document.addEventListener('click', (e) => {
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
        
        // Complete circuit animation
        this.circuitAnimation.forceComplete();
        
        // Show all text elements
        this.collegeText.classList.add('show');
        this.digitalText.classList.add('show');
        this.artsText.style.opacity = '1';
        this.humanitiesText.style.opacity = '1';
        this.exploreButton.classList.add('show');
        
        // Enable college text clicking
        this.collegeText.style.pointerEvents = 'auto';
        
        this.textShown = true;
        this.digitalShown = true;
        this.buttonShown = true;
    }
    
    startTextAnimationSequence() {
        // Show text immediately
        if (!this.textShown) {
            this.collegeText.classList.add('show');
            this.textShown = true;
            
            // Show "Digital" after 2.5 seconds
            setTimeout(() => {
                if (!this.digitalShown) {
                    // Hide "Arts" and "Humanities" temporarily for dramatic effect
                    this.artsText.style.opacity = '0.3';
                    this.humanitiesText.style.opacity = '0.3';
                    
                    this.digitalText.classList.add('show');
                    this.digitalShown = true;
                    
                    // Show "Arts" and "Humanities" again after Digital is positioned
                    setTimeout(() => {
                        this.artsText.style.opacity = '1';
                        this.humanitiesText.style.opacity = '1';
                        this.artsText.style.transition = 'opacity 0.5s ease-in-out';
                        this.humanitiesText.style.transition = 'opacity 0.5s ease-in-out';
                    }, 800);
                    
                    // Show explore button after 2 seconds
                    setTimeout(() => {
                        if (!this.buttonShown) {
                            this.exploreButton.classList.add('show');
                            this.buttonShown = true;
                            this.canSkipAnimation = false;
                            
                            // Enable college text clicking
                            this.collegeText.style.pointerEvents = 'auto';
                        }
                    }, 2000);
                }
            }, 2500);
        }
    }
    
    exploreClicked() {
        // Hide button with animation
        this.exploreButton.style.opacity = '0';
        this.exploreButton.style.transform = 'translateY(50px) scale(0.8)';
        
        setTimeout(() => {
            this.exploreButton.style.display = 'none';
            this.departmentNodes.generateNodes();
        }, 800);
    }
    
    enterDetailView(element, departmentId) {
        console.log('Entering detail view for:', departmentId);
        this.isDetailView = true;
        this.currentDepartmentId = departmentId;
        
        // Stop circuit animation to improve performance
        this.circuitAnimation.stop();
        
        // Reset legend items to disabled state - they'll be enabled by progressive reveal
        const legendItems = document.querySelectorAll('.legend-item[data-filter]');
        legendItems.forEach(item => {
            item.classList.remove('enabled');
            item.classList.add('disabled');
        });
        
        // Hide other department nodes
        this.departmentNodes.hideNodes();
        
        // Hide all main scene elements
        this.collegeText.style.display = 'none';
        this.digitalText.style.display = 'none';
        this.artsText.style.display = 'none';
        this.humanitiesText.style.display = 'none';
        this.exploreButton.style.display = 'none';
        
        // Clear the main canvas
        const circuitCanvas = document.getElementById('circuitCanvas');
        const ctx = circuitCanvas.getContext('2d');
        ctx.clearRect(0, 0, circuitCanvas.width, circuitCanvas.height);
        
        // Show visualization area
        this.vizArea.classList.add('show');
        
        // Show department info container
        const deptInfoContainer = document.getElementById('deptInfoContainer');
        if (deptInfoContainer) {
            deptInfoContainer.style.display = 'block';
        }
        
        // Start visualization after transition
        setTimeout(() => {
            this.partnershipGraph.createVisualization(departmentId);
            
            // Show back button and info button
            this.backButton.classList.add('show');
            this.deptInfoButton.classList.add('show');
        }, 500);
        
        this.eventBus.emit('detailViewEntered', { departmentId });
    }
    
    exitDetailView() {
        console.log('Exiting detail view');
        this.isDetailView = false;
        
        // Legend filters remain enabled - no changes needed
        // They continue to work as before
        
        // Hide visualization
        this.partnershipGraph.destroy();
        
        // Hide buttons
        this.backButton.classList.remove('show');
        this.deptInfoButton.classList.remove('show');
        
        // Hide department info container
        const deptInfoContainer = document.getElementById('deptInfoContainer');
        if (deptInfoContainer) {
            deptInfoContainer.style.display = 'none';
        }
        
        // Hide viz area
        this.vizArea.classList.remove('show');
        
        // Show main scene elements again
        this.collegeText.style.display = '';
        this.digitalText.style.display = '';
        this.artsText.style.display = '';
        this.humanitiesText.style.display = '';
        
        // Restart circuit animation
        this.circuitAnimation.start();
        
        // Show department nodes again
        setTimeout(() => {
            this.departmentNodes.showNodes();
        }, 300);
        
        this.currentDepartmentId = null;
        this.eventBus.emit('detailViewExited');
    }
    
    showPopup(url, departmentName) {
        const popupTitle = document.getElementById('popupTitle');
        const popupMessage = document.getElementById('popupMessage');
        const confirmButton = document.getElementById('confirmButton');
        const cancelButton = document.getElementById('cancelButton');
        
        popupTitle.textContent = `Leaving ${departmentName}`;
        popupMessage.textContent = `You are about to visit an external website. Do you want to continue to ${url}?`;
        
        // Show popup
        this.popupOverlay.classList.add('show');
        
        // Setup button handlers
        const handleConfirm = () => {
            window.open(url, '_blank');
            this.closePopup();
        };
        
        const handleCancel = () => {
            this.closePopup();
        };
        
        confirmButton.onclick = handleConfirm;
        cancelButton.onclick = handleCancel;
        
        // Close on overlay click
        this.popupOverlay.onclick = (e) => {
            if (e.target === this.popupOverlay) {
                this.closePopup();
            }
        };
    }
    
    closePopup() {
        this.popupOverlay.classList.remove('show');
        
        // Clean up event handlers
        const confirmButton = document.getElementById('confirmButton');
        const cancelButton = document.getElementById('cancelButton');
        confirmButton.onclick = null;
        cancelButton.onclick = null;
        this.popupOverlay.onclick = null;
    }
}