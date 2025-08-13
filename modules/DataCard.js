export class DataCard {
    constructor(container, departmentData, eventBus) {
        this.container = container;
        this.departmentData = departmentData;
        this.eventBus = eventBus;
        this.currentCard = null;
    }
    
    showDataCard(departmentId) {
        const dept = this.departmentData[departmentId];
        if (!dept) return;
        
        // Store current department ID
        this.currentDepartmentId = departmentId;
        
        // Remove existing card if any
        this.hideDataCard();
        
        // Create new card
        const card = document.createElement('div');
        card.className = 'data-card show';
        card.innerHTML = this.generateCardContent(dept);
        
        this.container.appendChild(card);
        this.currentCard = card;
        
        // Setup event handlers
        this.setupCardInteractions(card, dept);
        
        // Position card
        this.positionCard(card);
        
        this.eventBus.emit('dataCardShown', { departmentId });
    }
    
    generateCardContent(dept) {
        let content = `<h2 class="card-title">${dept.name}</h2>`;
        
        // Spotlight Section - Featured at top with image
        if (dept.spotlight) {
            content += `
                <div class="featured-project">
                    <h3 class="featured-title">Department Spotlight</h3>
                    <div class="featured-preview external-link" data-url="${dept.spotlight}" 
                         ${dept.image ? `style="background-image: url('${dept.image}'); background-size: cover; background-position: center;"` : ''}>
                        <div class="preview-overlay">
                            ${!dept.image ? '<div class="preview-icon">🔗</div>' : ''}
                            <p class="preview-text">Click to view Spotlight</p>
                        </div>
                    </div>
                </div>
            `;
        }
        
        // Highlights section - show as links
        if (dept.highlights && dept.highlights.length > 0) {
            content += '<div class="highlights-section">';
            content += '<h4>Featured Projects & Resources</h4>';
            content += '<ul class="highlights-list">';
            dept.highlights.forEach(highlight => {
                if (typeof highlight === 'string') {
                    content += `<li>${highlight}</li>`;
                } else if (highlight.title && highlight.url) {
                    content += `<li><a href="#" class="highlight-link external-link" data-url="${highlight.url}">${highlight.title}</a></li>`;
                }
            });
            content += '</ul></div>';
        }
        
        // Tech Courses section - only if present
        if (dept.techCourses && dept.techCourses.length > 0) {
            content += '<div class="tech-section">';
            content += '<h4>Technology & Digital Courses</h4>';
            content += '<div class="tech-grid">';
            dept.techCourses.forEach(course => {
                const [code, ...nameParts] = course.split(' - ');
                const name = nameParts.join(' - ');
                content += `<div class="tech-course">
                    <span class="course-code">${code}</span>
                    ${name ? `<span class="course-name">${name}</span>` : ''}
                </div>`;
            });
            content += '</div></div>';
        }
        
        // Close button
        content += '<button class="close-card">&times;</button>';
        
        return content;
    }
    
    setupCardInteractions(card, dept) {
        // Close button
        const closeBtn = card.querySelector('.close-card');
        closeBtn.addEventListener('click', () => this.hideDataCard());
        
        // External links - replace card with iframe
        const externalLinks = card.querySelectorAll('.external-link');
        externalLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const url = link.getAttribute('data-url');
                
                // Replace card content with iframe
                this.showIframe(url, dept.name);
            });
        });
        
        // Click outside to close
        setTimeout(() => {
            document.addEventListener('click', this.handleOutsideClick);
        }, 100);
    }
    
    showIframe(url, departmentName) {
        // Store original content
        if (!this.originalContent) {
            this.originalContent = this.currentCard.innerHTML;
            this.originalDept = departmentName;
            this.originalCardClass = this.currentCard.className;
        }
        
        // Expand card to fill most of viewport
        this.currentCard.className = 'data-card show iframe-mode';
        
        // Create iframe content
        const iframeContent = `
            <div class="iframe-container">
                <div class="iframe-header">
                    <h3>${departmentName} - External Resource</h3>
                    <button class="iframe-back">← Back to Department Info</button>
                    <button class="iframe-close">&times;</button>
                </div>
                <iframe src="${url}" class="external-iframe"></iframe>
            </div>
        `;
        
        this.currentCard.innerHTML = iframeContent;
        
        // Setup iframe interactions
        const backBtn = this.currentCard.querySelector('.iframe-back');
        const closeBtn = this.currentCard.querySelector('.iframe-close');
        
        backBtn.addEventListener('click', () => {
            this.returnToCard();
        });
        
        closeBtn.addEventListener('click', () => {
            this.hideDataCard();
        });
        
        // Update outside click handler to return to card instead of closing
        document.removeEventListener('click', this.handleOutsideClick);
        this.handleIframeOutsideClick = (e) => {
            if (this.currentCard && !this.currentCard.contains(e.target) && 
                !e.target.closest('#deptInfoButton')) {
                this.returnToCard();
            }
        };
        
        setTimeout(() => {
            document.addEventListener('click', this.handleIframeOutsideClick);
        }, 100);
    }
    
    returnToCard() {
        if (this.originalContent) {
            // Restore original card size
            this.currentCard.className = this.originalCardClass || 'data-card show';
            this.currentCard.innerHTML = this.originalContent;
            
            // Re-setup interactions for the restored content
            const dept = this.departmentData[this.currentDepartmentId];
            if (dept) {
                this.setupCardInteractions(this.currentCard, dept);
            }
            
            // Clear iframe click handler and restore original
            document.removeEventListener('click', this.handleIframeOutsideClick);
            setTimeout(() => {
                document.addEventListener('click', this.handleOutsideClick);
            }, 100);
            
            this.originalContent = null;
            this.originalCardClass = null;
        }
    }
    
    handleOutsideClick = (e) => {
        if (this.currentCard && !this.currentCard.contains(e.target) && 
            !e.target.closest('#deptInfoButton')) {
            this.hideDataCard();
        }
    }
    
    positionCard(card) {
        // Center the card on screen
        card.style.position = 'fixed';
        card.style.left = '50%';
        card.style.top = '50%';
        card.style.transform = 'translate(-50%, -50%)';
        
        // Ensure it's within viewport
        const rect = card.getBoundingClientRect();
        const padding = 20;
        
        if (rect.left < padding) {
            card.style.left = padding + rect.width / 2 + 'px';
        }
        if (rect.right > window.innerWidth - padding) {
            card.style.left = window.innerWidth - padding - rect.width / 2 + 'px';
        }
        if (rect.top < padding) {
            card.style.top = padding + rect.height / 2 + 'px';
        }
        if (rect.bottom > window.innerHeight - padding) {
            card.style.top = window.innerHeight - padding - rect.height / 2 + 'px';
        }
    }
    
    hideDataCard() {
        if (this.currentCard) {
            this.currentCard.classList.remove('show');
            setTimeout(() => {
                this.currentCard.remove();
                this.currentCard = null;
            }, 300);
            
            // Clear stored content
            this.originalContent = null;
            this.originalDept = null;
            
            // Remove all click handlers
            document.removeEventListener('click', this.handleOutsideClick);
            document.removeEventListener('click', this.handleIframeOutsideClick);
            
            this.eventBus.emit('dataCardHidden');
        }
    }
    
    destroy() {
        this.hideDataCard();
    }
}