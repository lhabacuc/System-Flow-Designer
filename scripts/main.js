
const themeToggle = document.getElementById('themeToggle');
const themeToggleApp = document.getElementById('themeToggleApp');
const themeIcon = document.getElementById('themeIcon');
const launchButtons = [
    document.getElementById('launchSystemBtn'),
    document.getElementById('heroLaunchBtn'),
    document.getElementById('ctaLaunchBtn')
].filter(Boolean);
const backToLandingBtn = document.getElementById('backToLandingBtn');
const body = document.body;

function syncThemeButtons(isDark) {
    themeIcon.innerHTML = isDark
        ? "<i class='bx bx-sun'></i>"
        : "<i class='bx bx-moon'></i>";

    if (themeToggleApp) {
        themeToggleApp.innerHTML = isDark
            ? "<i class='bx bx-sun'></i> Tema"
            : "<i class='bx bx-moon'></i> Tema";
    }
}

// Check for saved theme preference or default to light mode
const currentTheme = localStorage.getItem('theme') || 'light';
if (currentTheme === 'dark') {
    body.classList.add('dark-mode');
}
syncThemeButtons(body.classList.contains('dark-mode'));

function toggleTheme() {
    body.classList.toggle('dark-mode');
    const isDark = body.classList.contains('dark-mode');
    syncThemeButtons(isDark);

    localStorage.setItem('theme', isDark ? 'dark' : 'light');

    const instance = FlowchartManager.getInstance();
    if (instance) {
        instance.draw();
    }
}

themeToggle?.addEventListener('click', toggleTheme);
themeToggleApp?.addEventListener('click', toggleTheme);

function openSystemExperience() {
    body.classList.add('app-active');

    if (!FlowchartManager.getInstance()) {
        flowchart = FlowchartManager.init();
    } else {
        const instance = FlowchartManager.getInstance();
        instance.setupCanvas();
        instance.draw();
    }
}

function returnToLanding() {
    body.classList.remove('app-active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

launchButtons.forEach((button) => {
    button.addEventListener('click', openSystemExperience);
});

backToLandingBtn?.addEventListener('click', returnToLanding);


// Helper function to close floating menu
function closeFloatingMenu() {
    document.getElementById('floatingMenu')?.classList.remove('active');
    document.getElementById('floatingMenuBtn')?.classList.remove('active');
}

// Floating Menu Toggle
document.getElementById('floatingMenuBtn')?.addEventListener('click', () => {
    const menu = document.getElementById('floatingMenu');
    const btn = document.getElementById('floatingMenuBtn');
    menu.classList.toggle('active');
    btn.classList.toggle('active');
});

// Close menu when clicking outside
document.addEventListener('click', (e) => {
    const menu = document.getElementById('floatingMenu');
    const btn = document.getElementById('floatingMenuBtn');
    if (!menu || !btn) {
        return;
    }
    if (!menu.contains(e.target) && !btn.contains(e.target)) {
        closeFloatingMenu();
    }
});

// Toolbar buttons
document.getElementById('addNodeBtn')?.addEventListener('click', () => {
    const instance = FlowchartManager.getInstance();
    if (instance) {
        instance.openAddNodeModal();
    }
    closeFloatingMenu();
});

document.getElementById('exportJsonBtn')?.addEventListener('click', () => {
    const instance = FlowchartManager.getInstance();
    if (instance) {
        instance.exportToJSON();
    }
    closeFloatingMenu();
});

document.getElementById('importJsonBtn')?.addEventListener('click', () => {
    document.getElementById('jsonFileInput').click();
    closeFloatingMenu();
});

document.getElementById('jsonFileInput')?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const json = JSON.parse(event.target.result);
                const instance = FlowchartManager.getInstance();
                if (instance) {
                    instance.importFromJSON(json);
                }
            } catch (error) {
                alert('Erro ao importar JSON: ' + error.message);
            }
        };
        reader.readAsText(file);
    }
    e.target.value = ''; // Reset file input
});

// Canvas Flowchart Implementation
// Polyfill for roundRect if not supported
if (!CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
        if (typeof r === 'number') {
            r = [r, r, r, r];
        } else if (r.length === 1) {
            r = [r[0], r[0], r[0], r[0]];
        } else if (r.length === 2) {
            r = [r[0], r[1], r[0], r[1]];
        } else if (r.length === 3) {
            r = [r[0], r[1], r[2], r[1]];
        }
        
        if (w < 2 * r[0]) r[0] = w / 2;
        if (h < 2 * r[1]) r[1] = h / 2;
        if (w < 2 * r[2]) r[2] = w / 2;
        if (h < 2 * r[3]) r[3] = h / 2;
        
        this.beginPath();
        this.moveTo(x + r[0], y);
        this.lineTo(x + w - r[1], y);
        this.arcTo(x + w, y, x + w, y + r[1], r[1]);
        this.lineTo(x + w, y + h - r[2]);
        this.arcTo(x + w, y + h, x + w - r[2], y + h, r[2]);
        this.lineTo(x + r[3], y + h);
        this.arcTo(x, y + h, x, y + h - r[3], r[3]);
        this.lineTo(x, y + r[0]);
        this.arcTo(x, y, x + r[0], y, r[0]);
        this.closePath();
        return this;
    };
}

class InteractiveFlowchart {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.nodes = [];
        this.connections = [];
        this.selectedNode = null;
        this.draggedNode = null;
        this.offsetX = 0;
        this.offsetY = 0;
        this.scale = 1;
        this.panX = 0;
        this.panY = 0;
        this.isDragging = false;
        this.isPanning = false;
        this.lastMouseX = 0;
        this.lastMouseY = 0;
        this.isConnecting = false;
        this.connectionStartNode = null;
        this.tempConnectionEnd = null;
        this.selectedConnection = null;
        this.hoveredConnection = null;
        this.customBlockTypes = {}; // Store custom block types
        this.contextMenu = null;
        this.resizeHandle = null;
        this.isResizing = false;
        
        // Drag and drop from toolbar
        this.isDraggingFromToolbar = false;
        this.draggedToolbarType = null;
        this.draggedToolbarShape = null;
        this.dragPreview = null;
        
        // Inline editing
        this.editingNode = null;
        this.editingField = null;
        this.inlineInput = null;
        
        // Multi-select and layers
        this.selectedNodes = []; // Array of selected nodes
        this.isSelecting = false; // Selection rectangle mode
        this.selectionStart = null;
        this.selectionRect = null;
        this.layerOrder = []; // Array of node IDs in order
        this.isSpacePressed = false; // Track Space key for pan mode
        this.iconCache = {}; // Cache for loaded technology icons
        
        // Page management and persistence
        this.pages = {}; // Object to store all pages: { pageId: { name, nodes, connections, layerOrder } }
        this.currentPageId = null;
        
        // Constants
        this.MIN_NODE_WIDTH = 100;
        this.MIN_NODE_HEIGHT = 60;
        this.CONNECTION_HIT_THRESHOLD = 8;
        
        this.setupCanvas();
        this.loadFromLocalStorage(); // Load saved data or start empty
        this.setupEventListeners();
        this.setupToolbarDragAndDrop();
        this.setupPropertiesPanel();
        this.setupLayersPanel();
        this.setupPageManagement();
    }

    setupCanvas() {
        const dpr = window.devicePixelRatio || 1;
        const rect = this.canvas.getBoundingClientRect();
        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;
        this.ctx.scale(dpr, dpr);
        this.canvas.style.width = rect.width + 'px';
        this.canvas.style.height = rect.height + 'px';
    }

    // LocalStorage Persistence
    loadFromLocalStorage() {
        const saved = localStorage.getItem('System_Flow_Designer_editor_data');
        if (saved) {
            try {
                const data = JSON.parse(saved);
                this.pages = data.pages || {};
                this.customBlockTypes = data.customBlockTypes || {};
                this.currentPageId = data.currentPageId || null;
                
                // If we have a current page, load it
                if (this.currentPageId && this.pages[this.currentPageId]) {
                    this.loadPage(this.currentPageId);
                } else {
                    // Start empty
                    this.nodes = [];
                    this.connections = [];
                    this.layerOrder = [];
                }
            } catch (e) {
                console.error('Error loading from LocalStorage:', e);
                this.startEmpty();
            }
        } else {
            // First time - start empty
            this.startEmpty();
        }
        
        this.updatePageSelector();
        this.draw();
    }
    
    startEmpty() {
        this.pages = {};
        this.currentPageId = null;
        this.nodes = [];
        this.connections = [];
        this.layerOrder = [];
        this.customBlockTypes = {};
    }
    
    saveToLocalStorage() {
        // Save current page state
        if (this.currentPageId) {
            this.pages[this.currentPageId] = {
                name: this.pages[this.currentPageId].name,
                nodes: JSON.parse(JSON.stringify(this.nodes)),
                connections: JSON.parse(JSON.stringify(this.connections)),
                layerOrder: [...this.layerOrder]
            };
        }
        
        const data = {
            pages: this.pages,
            customBlockTypes: this.customBlockTypes,
            currentPageId: this.currentPageId
        };
        
        localStorage.setItem('System_Flow_Designer_editor_data', JSON.stringify(data));
    }
    
    // Page Management
    setupPageManagement() {
        const newPageBtn = document.getElementById('newPageBtn');
        const pageSelector = document.getElementById('pageSelector');
        
        newPageBtn?.addEventListener('click', () => {
            const pageName = prompt('Nome da nova página:', 'Nova Página');
            if (pageName) {
                this.createNewPage(pageName);
            }
        });
        
        pageSelector?.addEventListener('change', (e) => {
            this.switchToPage(e.target.value);
        });
    }
    
    createNewPage(pageName) {
        const pageId = 'page_' + Date.now();
        this.pages[pageId] = {
            name: pageName,
            nodes: [],
            connections: [],
            layerOrder: []
        };
        
        this.switchToPage(pageId);
        this.saveToLocalStorage();
    }
    
    switchToPage(pageId) {
        // Save current page before switching
        if (this.currentPageId && this.pages[this.currentPageId]) {
            this.pages[this.currentPageId] = {
                name: this.pages[this.currentPageId].name,
                nodes: JSON.parse(JSON.stringify(this.nodes)),
                connections: JSON.parse(JSON.stringify(this.connections)),
                layerOrder: [...this.layerOrder]
            };
        }
        
        this.currentPageId = pageId;
        this.loadPage(pageId);
        this.saveToLocalStorage();
    }
    
    loadPage(pageId) {
        const page = this.pages[pageId];
        if (page) {
            this.nodes = JSON.parse(JSON.stringify(page.nodes));
            this.connections = JSON.parse(JSON.stringify(page.connections));
            this.layerOrder = [...page.layerOrder];
            
            // Clear selections
            this.selectedNode = null;
            this.selectedNodes = [];
            this.selectedConnection = null;
            
            // Update UI
            this.updatePageSelector();
            this.updateLayersPanel();
            this.updatePropertiesPanel();
            this.draw();
        }
    }
    
    updatePageSelector() {
        const pageSelector = document.getElementById('pageSelector');
        if (!pageSelector) return;
        
        pageSelector.innerHTML = '';
        
        if (Object.keys(this.pages).length === 0) {
            const option = document.createElement('option');
            option.value = '';
            option.textContent = 'Nenhuma página criada';
            pageSelector.appendChild(option);
            pageSelector.disabled = true;
        } else {
            pageSelector.disabled = false;
            Object.keys(this.pages).forEach(pageId => {
                const option = document.createElement('option');
                option.value = pageId;
                option.textContent = this.pages[pageId].name;
                if (pageId === this.currentPageId) {
                    option.selected = true;
                }
                pageSelector.appendChild(option);
            });
        }
    }

    createNode(name, type, description, responsibilities, x, y, width, height, shape = 'rectangle') {
        const id = this.generateNodeId();
        const node = {
            id,
            title: name,
            nodeType: type,
            description: description,
            responsibilities: responsibilities || '',
            x: x,
            y: y,
            width: width,
            height: height,
            shape: shape,
            phaseNumber: 1,
            color: this.getColorByType(type),
            metadata: {},
            hidden: false,
            locked: false
        };
        this.nodes.push(node);
        this.layerOrder.push(id);
        return id;
    }

    addConnection(fromId, toId) {
        this.connections.push({
            from: fromId,
            to: toId
        });
    }

    getPhaseColor(index) {
        const colors = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899', '#fbbf24'];
        return colors[index % colors.length];
    }

    getColorByType(type) {
        // Check if it's a custom type first
        if (this.customBlockTypes && this.customBlockTypes[type]) {
            return this.customBlockTypes[type].color;
        }
        
        const typeColors = {
            'service': '#f59e0b',      // Orange - Business services
            'module': '#10b981',        // Green - Modules
            'endpoint': '#3b82f6',      // Blue - Endpoints
            'middleware': '#8b5cf6',    // Purple - Middleware
            'repository': '#ef4444',    // Red - Data access
            'database': '#06b6d4',      // Cyan - Database
            'external': '#ec4899',      // Pink - External services
            'layer': '#3b82f6'          // Blue - Architectural layers
        };
        return typeColors[type] || '#737373';
    }

    autoLayout() {
        const padding = 100;
        const horizontalSpacing = 350;
        const verticalSpacing = 120;
        
        let currentPhase = 1;
        let phaseStartY = padding;
        let maxX = 0;
        
        this.nodes.forEach((node, index) => {
            if (node.phaseNumber !== currentPhase) {
                currentPhase = node.phaseNumber;
                phaseStartY += verticalSpacing * 3;
            }
            
            const nodesInPhase = this.nodes.filter(n => n.phaseNumber === currentPhase);
            const stepIndex = nodesInPhase.indexOf(node);
            
            node.x = padding + (stepIndex % 3) * horizontalSpacing;
            node.y = phaseStartY + Math.floor(stepIndex / 3) * verticalSpacing;
            maxX = Math.max(maxX, node.x);
        });
        
        // Center the flowchart
        this.panX = 0;
        this.panY = 0;
        this.scale = 1;
    }

    generateNodeId() {
        return `node-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
    }

    sanitizeCustomTypeName(name) {
        // Create a unique type ID from name, add timestamp to avoid conflicts
        // Allow alphanumeric, hyphens, underscores, and dots
        const sanitized = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-_.]/g, '');
        return `${sanitized}-${Date.now().toString(36)}`;
    }

    draw() {
        const rect = this.canvas.getBoundingClientRect();
        this.ctx.clearRect(0, 0, rect.width, rect.height);
        
        this.ctx.save();
        this.ctx.translate(this.panX, this.panY);
        this.ctx.scale(this.scale, this.scale);
        
        // Draw connections
        this.connections.forEach(conn => {
            const fromNode = this.nodes.find(n => n.id === conn.from);
            const toNode = this.nodes.find(n => n.id === conn.to);
            if (fromNode && toNode && !fromNode.hidden && !toNode.hidden) {
                const isSelected = this.selectedConnection === conn;
                const isHovered = this.hoveredConnection === conn;
                this.drawConnection(fromNode, toNode, isSelected, isHovered);
            }
        });
        
        // Draw temporary connection if in connection mode
        if (this.isConnecting && this.connectionStartNode && this.tempConnectionEnd) {
            const isDark = document.body.classList.contains('dark-mode');
            this.ctx.strokeStyle = isDark ? '#fbbf24' : '#f59e0b';
            this.ctx.lineWidth = 2;
            this.ctx.setLineDash([5, 5]);
            this.ctx.beginPath();
            this.ctx.moveTo(
                this.connectionStartNode.x + this.connectionStartNode.width / 2,
                this.connectionStartNode.y + this.connectionStartNode.height / 2
            );
            this.ctx.lineTo(this.tempConnectionEnd.x, this.tempConnectionEnd.y);
            this.ctx.stroke();
            this.ctx.setLineDash([]);
        }
        
        // Draw nodes (respect layer order and visibility)
        const orderedNodes = this.layerOrder.length > 0
            ? this.layerOrder.map(id => this.nodes.find(n => n.id === id)).filter(n => n)
            : this.nodes;
        
        orderedNodes.forEach(node => {
            if (!node.hidden) {
                const isMultiSelected = this.selectedNodes.includes(node) && this.selectedNodes.length > 1;
                this.drawNode(node, isMultiSelected);
            }
        });
        
        // Draw selection rectangle
        if (this.isSelecting && this.selectionRect) {
            this.ctx.strokeStyle = '#0070f3';
            this.ctx.lineWidth = 2;
            this.ctx.setLineDash([5, 5]);
            this.ctx.strokeRect(
                this.selectionRect.x,
                this.selectionRect.y,
                this.selectionRect.width,
                this.selectionRect.height
            );
            this.ctx.fillStyle = 'rgba(0, 112, 243, 0.1)';
            this.ctx.fillRect(
                this.selectionRect.x,
                this.selectionRect.y,
                this.selectionRect.width,
                this.selectionRect.height
            );
            this.ctx.setLineDash([]);
        }
        
        this.ctx.restore();
    }

    drawConnection(from, to, isSelected = false, isHovered = false) {
        const isDark = document.body.classList.contains('dark-mode');
        this.ctx.strokeStyle = isSelected ? '#f59e0b' : (isHovered ? '#fbbf24' : (isDark ? '#404040' : '#d4d4d4'));
        this.ctx.lineWidth = isSelected ? 3 : (isHovered ? 3 : 2);
        this.ctx.beginPath();
        
        const fromX = from.x + from.width / 2;
        const fromY = from.y + from.height;
        const toX = to.x + to.width / 2;
        const toY = to.y;
        
        // Draw curved line
        const midY = (fromY + toY) / 2;
        this.ctx.moveTo(fromX, fromY);
        this.ctx.bezierCurveTo(fromX, midY, toX, midY, toX, toY);
        this.ctx.stroke();
        
        // Draw arrow
        const arrowSize = 8;
        this.ctx.beginPath();
        this.ctx.moveTo(toX, toY);
        this.ctx.lineTo(toX - arrowSize, toY - arrowSize);
        this.ctx.lineTo(toX + arrowSize, toY - arrowSize);
        this.ctx.closePath();
        this.ctx.fillStyle = isSelected ? '#f59e0b' : (isHovered ? '#fbbf24' : (isDark ? '#404040' : '#d4d4d4'));
        this.ctx.fill();
    }

    getConnectionAtPos(x, y) {
        const threshold = this.CONNECTION_HIT_THRESHOLD;
        
        for (const conn of this.connections) {
            const fromNode = this.nodes.find(n => n.id === conn.from);
            const toNode = this.nodes.find(n => n.id === conn.to);
            
            if (!fromNode || !toNode) continue;
            
            const fromX = fromNode.x + fromNode.width / 2;
            const fromY = fromNode.y + fromNode.height;
            const toX = toNode.x + toNode.width / 2;
            const toY = toNode.y;
            
            // Check if point is near the bezier curve
            // Sample points along the curve
            for (let t = 0; t <= 1; t += 0.05) {
                const midY = (fromY + toY) / 2;
                const curveX = Math.pow(1-t, 3) * fromX + 
                              3 * Math.pow(1-t, 2) * t * fromX + 
                              3 * (1-t) * Math.pow(t, 2) * toX + 
                              Math.pow(t, 3) * toX;
                const curveY = Math.pow(1-t, 3) * fromY + 
                              3 * Math.pow(1-t, 2) * t * midY + 
                              3 * (1-t) * Math.pow(t, 2) * midY + 
                              Math.pow(t, 3) * toY;
                
                const dist = Math.sqrt(Math.pow(x - curveX, 2) + Math.pow(y - curveY, 2));
                if (dist < threshold) {
                    return conn;
                }
            }
        }
        return null;
    }

    deleteConnection(conn) {
        this.connections = this.connections.filter(c => c !== conn);
        this.selectedConnection = null;
        this.hoveredConnection = null;
        this.draw();
        this.saveToLocalStorage(); // Auto-save
    }

    drawNode(node, isMultiSelected = false) {
        const isDark = document.body.classList.contains('dark-mode');
        const isSelected = this.selectedNode === node || isMultiSelected;
        const shape = node.shape || 'rectangle';
        
        // Shadow
        if (isSelected) {
            this.ctx.shadowColor = isMultiSelected ? '#0070f3' : node.color;
            this.ctx.shadowBlur = 15;
        }
        
        // Node background based on shape
        this.ctx.fillStyle = isDark ? '#262626' : '#ffffff';
        this.ctx.strokeStyle = isSelected ? (isMultiSelected ? '#0070f3' : node.color) : (isDark ? '#404040' : '#e5e5e5');
        this.ctx.lineWidth = isSelected ? 3 : 2;
        
        this.ctx.beginPath();
        
        switch(shape) {
            case 'circle':
                const radius = Math.min(node.width, node.height) / 2;
                const centerX = node.x + node.width / 2;
                const centerY = node.y + node.height / 2;
                this.ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
                break;
            
            case 'triangle':
                this.ctx.moveTo(node.x + node.width / 2, node.y);
                this.ctx.lineTo(node.x + node.width, node.y + node.height);
                this.ctx.lineTo(node.x, node.y + node.height);
                this.ctx.closePath();
                break;
            
            case 'diamond':
                this.ctx.moveTo(node.x + node.width / 2, node.y);
                this.ctx.lineTo(node.x + node.width, node.y + node.height / 2);
                this.ctx.lineTo(node.x + node.width / 2, node.y + node.height);
                this.ctx.lineTo(node.x, node.y + node.height / 2);
                this.ctx.closePath();
                break;
            
            case 'rectangle':
            default:
                this.ctx.roundRect(node.x, node.y, node.width, node.height, 8);
                break;
        }
        
        this.ctx.fill();
        this.ctx.stroke();
        
        this.ctx.shadowBlur = 0;
        
        // For non-rectangle shapes, draw a simpler text representation
        if (shape !== 'rectangle') {
            // Title centered
            this.ctx.fillStyle = isDark ? '#ededed' : '#171717';
            this.ctx.font = 'bold 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            const title = this.truncateText(node.title, node.width - 30);
            this.ctx.fillText(title, node.x + node.width / 2, node.y + node.height / 2 - 10);
            
            // Type label centered below
            this.ctx.fillStyle = node.color;
            this.ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
            const typeLabel = (node.nodeType || 'service').toUpperCase();
            this.ctx.fillText(typeLabel, node.x + node.width / 2, node.y + node.height / 2 + 10);
            
            this.ctx.textAlign = 'left';
            this.ctx.textBaseline = 'alphabetic';
        } else {
            // Type header bar (rectangle only)
            this.ctx.fillStyle = node.color;
            this.ctx.beginPath();
            this.ctx.roundRect(node.x, node.y, node.width, 28, [8, 8, 0, 0]);
            this.ctx.fill();
            
            // Component type label
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
            this.ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
            const typeLabel = (node.nodeType || 'service').toUpperCase();
            this.ctx.fillText(typeLabel, node.x + 10, node.y + 18);
            
            // Title
            this.ctx.fillStyle = isDark ? '#ededed' : '#171717';
            this.ctx.font = 'bold 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
            const title = this.truncateText(node.title, node.width - 20);
            this.ctx.fillText(title, node.x + 10, node.y + 48);
            
            // Description
            this.ctx.fillStyle = isDark ? '#a3a3a3' : '#737373';
            this.ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
            const desc = this.truncateText(node.description, node.width - 20);
            this.ctx.fillText(desc, node.x + 10, node.y + 65);
        }
        
        // Draw technology icon if available
        if (node.icon && node.icon.trim()) {
            const iconSize = 24;
            const iconX = node.x + node.width - iconSize - 8;
            const iconY = node.y + 4;
            
            if (!this.iconCache[node.icon]) {
                const img = new Image();
                img.crossOrigin = 'anonymous';
                img.src = node.icon;
                img.onload = () => {
                    this.draw(); // Redraw when icon loads
                };
                img.onerror = () => {
                    console.warn('Failed to load icon:', node.icon);
                    // Mark as failed to avoid repeated attempts
                    this.iconCache[node.icon] = { failed: true };
                };
                this.iconCache[node.icon] = img;
            }
            
            const cached = this.iconCache[node.icon];
            if (cached && !cached.failed && cached.complete && cached.naturalWidth > 0) {
                try {
                    this.ctx.drawImage(cached, iconX, iconY, iconSize, iconSize);
                } catch (e) {
                    console.warn('Failed to draw icon:', e.message);
                }
            }
        }
        
        // Draw resize handle if selected
        if (isSelected && !this.isResizing) {
            this.ctx.fillStyle = node.color;
            this.ctx.fillRect(node.x + node.width - 8, node.y + node.height - 8, 8, 8);
        }
    }

    truncateText(text, maxWidth) {
        let width = this.ctx.measureText(text).width;
        if (width <= maxWidth) return text;
        
        while (width > maxWidth && text.length > 0) {
            text = text.slice(0, -1);
            width = this.ctx.measureText(text + '...').width;
        }
        return text + '...';
    }

    setupEventListeners() {
        this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
        this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
        this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
        this.canvas.addEventListener('wheel', this.handleWheel.bind(this));
        this.canvas.addEventListener('dblclick', this.handleDoubleClick.bind(this));
        this.canvas.addEventListener('contextmenu', this.handleContextMenu.bind(this));
        
        // Close context menu when clicking elsewhere
        document.addEventListener('click', (e) => {
            if (!e.target.closest('#contextMenu')) {
                this.hideContextMenu();
            }
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Space key for pan mode
            if (e.code === 'Space' && !e.target.closest('input, textarea')) {
                e.preventDefault();
                this.isSpacePressed = true;
                this.canvas.style.cursor = 'grab';
            }
            
            if (e.key === 'Delete' || e.key === 'Backspace') {
                if (this.selectedNode && !e.target.closest('.modal, input, textarea')) {
                    e.preventDefault();
                    this.removeNode(this.selectedNode.id);
                } else if (this.selectedConnection) {
                    e.preventDefault();
                    this.deleteConnection(this.selectedConnection);
                }
            }
            if (e.key === 'Escape') {
                this.isConnecting = false;
                this.connectionStartNode = null;
                this.tempConnectionEnd = null;
                this.selectedNode = null;
                this.selectedConnection = null;
                this.canvas.style.cursor = 'grab';
                this.draw();
            }
        });
        
        document.addEventListener('keyup', (e) => {
            if (e.code === 'Space') {
                this.isSpacePressed = false;
                this.canvas.style.cursor = 'grab';
            }
        });
        
        window.addEventListener('resize', () => {
            this.setupCanvas();
            this.draw();
        });
    }

    handleContextMenu(e) {
        e.preventDefault();
        const pos = this.getMousePos(e);
        const node = this.getNodeAtPos(pos.x, pos.y);
        const connection = this.getConnectionAtPos(pos.x, pos.y);
        
        if (connection) {
            this.showContextMenu(e.clientX, e.clientY, { type: 'connection', connection });
        } else if (node) {
            this.showContextMenu(e.clientX, e.clientY, { type: 'node', node });
        } else {
            this.showContextMenu(e.clientX, e.clientY, { type: 'canvas' });
        }
    }

    getMousePos(e) {
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: (e.clientX - rect.left - this.panX) / this.scale,
            y: (e.clientY - rect.top - this.panY) / this.scale
        };
    }

    getNodeAtPos(x, y) {
        return this.nodes.find(node => {
            const shape = node.shape || 'rectangle';
            
            switch(shape) {
                case 'circle':
                    const radius = Math.min(node.width, node.height) / 2;
                    const centerX = node.x + node.width / 2;
                    const centerY = node.y + node.height / 2;
                    const dist = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));
                    return dist <= radius;
                
                case 'triangle':
                    // Point-in-triangle test using barycentric coordinates/area comparison
                    // If the sum of the three sub-triangle areas equals the main triangle area,
                    // the point is inside the triangle
                    const x1 = node.x + node.width / 2;
                    const y1 = node.y;
                    const x2 = node.x + node.width;
                    const y2 = node.y + node.height;
                    const x3 = node.x;
                    const y3 = node.y + node.height;
                    const area = Math.abs((x2-x1)*(y3-y1) - (x3-x1)*(y2-y1));
                    const area1 = Math.abs((x-x2)*(y3-y2) - (x3-x2)*(y-y2));
                    const area2 = Math.abs((x1-x)*(y-y1) - (x-x1)*(y1-y));
                    const area3 = Math.abs((x-x1)*(y3-y1) - (x3-x1)*(y-y1));
                    return Math.abs(area - (area1 + area2 + area3)) < 1;
                
                case 'diamond':
                    // Point in diamond (rotated square) test
                    const dx = Math.abs(x - (node.x + node.width / 2));
                    const dy = Math.abs(y - (node.y + node.height / 2));
                    return (dx / (node.width / 2) + dy / (node.height / 2)) <= 1;
                
                case 'rectangle':
                default:
                    return x >= node.x && x <= node.x + node.width &&
                           y >= node.y && y <= node.y + node.height;
            }
        });
    }

    isOverResizeHandle(node, x, y) {
        if (!node) return false;
        const handleSize = 8;
        return x >= node.x + node.width - handleSize && 
               x <= node.x + node.width &&
               y >= node.y + node.height - handleSize && 
               y <= node.y + node.height;
    }

    showContextMenu(x, y, target) {
        const menu = document.getElementById('contextMenu');
        if (!menu) return;
        
        let html = '';
        
        if (target.type === 'node') {
            html = `
<div class="context-menu-item" data-action="editFull">
<i class="bx bx-edit"></i> Editar Bloco Inteiro
</div>

<div class="context-menu-item" data-action="changeFormat">
<i class="bx bx-shape-square"></i> Mudar Formato
</div>

<div class="context-menu-item" data-action="editHeader">
<i class="bx bx-text"></i> Editar Header
</div>

<div class="context-menu-item" data-action="editColor">
<i class="bx bx-palette"></i> Editar Cor
</div>

<div class="context-menu-separator"></div>

<div class="context-menu-item" data-action="sendToBack">
<i class="bx bx-layer-minus"></i> Enviar para Trás
</div>

<div class="context-menu-item" data-action="sendToFront">
<i class="bx bx-layer-plus"></i> Enviar para Frente
</div>

<div class="context-menu-separator"></div>

<div class="context-menu-item" data-action="toggleLock">
<i class="bx ${target.node?.locked ? 'bx-lock-open' : 'bx-lock'}"></i>
${target.node?.locked ? 'Desbloquear' : 'Somente Leitura'}
</div>

<div class="context-menu-separator"></div>

<div class="context-menu-item" data-action="duplicate">
<i class="bx bx-copy"></i> Duplicar
</div>

<div class="context-menu-item" data-action="connect">
<i class="bx bx-link"></i> Conectar
</div>

<div class="context-menu-item danger" data-action="delete">
<i class="bx bx-trash"></i> Remover
</div>
            `;
        } else if (target.type === 'connection') {
            html = `
                <div class="context-menu-item danger" data-action="deleteConnection"><i class='bx bx-trash' ></i>Remover Ligação</div>
            `;
        } else {
            html = `
<div class="context-menu-item" data-action="addNode">
<i class="bx bx-plus-circle"></i> Criar Bloco
</div>

<div class="context-menu-separator"></div>

<div class="context-menu-item" data-action="resetZoom">
<i class="bx bx-zoom-out"></i> Reset Zoom
</div>

<div class="context-menu-item" data-action="autoLayout">
<i class="bx bx-bolt"></i> Auto Layout
</div>
            `;
        }
        
        menu.innerHTML = html;
        menu.style.left = x + 'px';
        menu.style.top = y + 'px';
        menu.classList.add('active');
        
        this.contextMenuTarget = target;
        
        // Add click handlers to menu items
        menu.querySelectorAll('.context-menu-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const action = e.target.dataset.action;
                this.handleContextMenuAction(action);
                this.hideContextMenu();
            });
        });
    }

    hideContextMenu() {
        const menu = document.getElementById('contextMenu');
        if (menu) {
            menu.classList.remove('active');
        }
        this.contextMenuTarget = null;
    }

    handleContextMenuAction(action) {
        const target = this.contextMenuTarget;
        
        switch(action) {
            case 'editFull':
                if (target.node) this.openEditModal(target.node);
                break;
            case 'changeFormat':
                if (target.node) {
                    const shapes = ['rectangle', 'circle', 'triangle', 'diamond'];
                    const currentIndex = shapes.indexOf(target.node.shape || 'rectangle');
                    const nextIndex = (currentIndex + 1) % shapes.length;
                    target.node.shape = shapes[nextIndex];
                    this.updatePropertiesPanel();
                    this.draw();
                }
                break;
            case 'editHeader':
                if (target.node) this.startInlineEdit(target.node, 'title', null);
                break;
            case 'editColor':
                if (target.node) {
                    // Open color picker in properties panel
                    this.selectSingleNode(target.node);
                    document.getElementById('propColor')?.focus();
                }
                break;
            case 'sendToBack':
                if (target.node) this.sendToBack([target.node]);
                break;
            case 'sendToFront':
                if (target.node) this.sendToFront([target.node]);
                break;
            case 'toggleLock':
                if (target.node) {
                    target.node.locked = !target.node.locked;
                    this.updateLayersPanel();
                    this.updatePropertiesPanel();
                    this.draw();
                }
                break;
            case 'editTitle':
                if (target.node) this.startInlineEdit(target.node, 'title', null);
                break;
            case 'editDescription':
                if (target.node) this.startInlineEdit(target.node, 'description', null);
                break;
            case 'edit':
                if (target.node) this.openEditModal(target.node);
                break;
            case 'duplicate':
                if (target.node) this.duplicateNode(target.node);
                break;
            case 'connect':
                if (target.node) {
                    this.isConnecting = true;
                    this.connectionStartNode = target.node;
                    this.canvas.style.cursor = 'crosshair';
                }
                break;
            case 'delete':
                this.removeNode(target.node.id);
                break;
            case 'deleteConnection':
                if (target.connection) {
                    this.deleteConnection(target.connection);
                }
                break;
            case 'addNode':
                this.openAddNodeModal();
                break;
            case 'paste':
                // TODO: Implement paste functionality
                break;
            case 'resetZoom':
                this.resetZoom();
                break;
            case 'autoLayout':
                this.autoLayout();
                this.draw();
                break;
        }
    }

    duplicateNode(node) {
        const newNode = {
            ...node,
            id: this.generateNodeId(),
            x: node.x + 50,
            y: node.y + 50,
            title: node.title + ' (cópia)'
        };
        this.nodes.push(newNode);
        this.selectedNode = newNode;
        this.draw();
    }

    handleMouseDown(e) {
        if (e.button === 2) return; // Ignore right click (handled by contextmenu event)
        
        this.hideContextMenu();
        
        const pos = this.getMousePos(e);
        const node = this.getNodeAtPos(pos.x, pos.y);
        
        // Check for resize handle first
        if (this.selectedNode && this.isOverResizeHandle(this.selectedNode, pos.x, pos.y)) {
            this.isResizing = true;
            this.resizeStartX = pos.x;
            this.resizeStartY = pos.y;
            this.resizeStartWidth = this.selectedNode.width;
            this.resizeStartHeight = this.selectedNode.height;
            return;
        }
        
        // Ctrl+Click to create connections
        if (e.ctrlKey && node) {
            if (!this.isConnecting) {
                // Start connecting
                this.isConnecting = true;
                this.connectionStartNode = node;
                this.canvas.style.cursor = 'crosshair';
            } else {
                // End connecting
                if (this.connectionStartNode && node.id !== this.connectionStartNode.id) {
                    // Check if connection already exists
                    const exists = this.connections.some(c => 
                        c.from === this.connectionStartNode.id && c.to === node.id
                    );
                    if (!exists) {
                        this.connections.push({
                            from: this.connectionStartNode.id,
                            to: node.id
                        });
                        this.saveToLocalStorage(); // Auto-save
                    }
                }
                this.isConnecting = false;
                this.connectionStartNode = null;
                this.tempConnectionEnd = null;
                this.canvas.style.cursor = 'grab';
            }
            this.draw();
            return;
        }
        
        // Check if clicking on a connection
        const connection = this.getConnectionAtPos(pos.x, pos.y);
        if (connection && !node) {
            this.selectedConnection = connection;
            this.selectedNode = null;
            this.selectedNodes = [];
            this.updatePropertiesPanel();
            this.updateLayersPanel();
            this.draw();
            return;
        }
        
        // Shift+Click for multi-select
        if (e.shiftKey && node) {
            this.toggleNodeSelection(node);
            return;
        }
        
        // Normal click behavior
        if (node) {
            // If clicking a node that's already in multi-selection, prepare to drag all
            if (this.selectedNodes.includes(node)) {
                this.draggedNode = node;
                this.offsetX = pos.x - node.x;
                this.offsetY = pos.y - node.y;
                this.isDragging = true;
            } else {
                // Single select
                this.draggedNode = node;
                this.offsetX = pos.x - node.x;
                this.offsetY = pos.y - node.y;
                this.selectSingleNode(node);
                this.selectedConnection = null;
                this.isDragging = true;
            }
        } else {
            // Space key pressed = pan mode, otherwise selection mode
            if (this.isSpacePressed) {
                // Pan mode
                this.isPanning = true;
                this.lastMouseX = e.clientX;
                this.lastMouseY = e.clientY;
                this.canvas.style.cursor = 'grabbing';
            } else {
                // Start drag selection
                this.isSelecting = true;
                this.selectionStart = pos;
                this.selectedNode = null;
                this.selectedNodes = [];
                this.selectedConnection = null;
                this.updatePropertiesPanel();
                this.updateLayersPanel();
            }
        }
        this.draw();
    }

    handleMouseMove(e) {
        const pos = this.getMousePos(e);
        
        // Handle resizing
        if (this.isResizing && this.selectedNode) {
            const deltaX = pos.x - this.resizeStartX;
            const deltaY = pos.y - this.resizeStartY;
            this.selectedNode.width = Math.max(this.MIN_NODE_WIDTH, this.resizeStartWidth + deltaX);
            this.selectedNode.height = Math.max(this.MIN_NODE_HEIGHT, this.resizeStartHeight + deltaY);
            this.updatePropertiesPanel();
            this.draw();
            return;
        }
        
        // Handle drag selection
        if (this.isSelecting && this.selectionStart) {
            this.selectionRect = {
                x: Math.min(pos.x, this.selectionStart.x),
                y: Math.min(pos.y, this.selectionStart.y),
                width: Math.abs(pos.x - this.selectionStart.x),
                height: Math.abs(pos.y - this.selectionStart.y)
            };
            
            // Select nodes within rectangle
            this.selectedNodes = this.nodes.filter(node => {
                return node.x < this.selectionRect.x + this.selectionRect.width &&
                       node.x + node.width > this.selectionRect.x &&
                       node.y < this.selectionRect.y + this.selectionRect.height &&
                       node.y + node.height > this.selectionRect.y;
            });
            this.selectedNode = this.selectedNodes[0] || null;
            this.draw();
            return;
        }
        
        // Update temp connection end if in connection mode
        if (this.isConnecting) {
            this.tempConnectionEnd = pos;
            this.draw();
            return;
        }
        
        if (this.isDragging && this.draggedNode) {
            const deltaX = pos.x - this.offsetX - this.draggedNode.x;
            const deltaY = pos.y - this.offsetY - this.draggedNode.y;
            
            // Move all selected nodes together
            if (this.selectedNodes.length > 1) {
                this.selectedNodes.forEach(node => {
                    if (!node.locked) {
                        node.x += deltaX;
                        node.y += deltaY;
                    }
                });
            } else {
                if (!this.draggedNode.locked) {
                    this.draggedNode.x = pos.x - this.offsetX;
                    this.draggedNode.y = pos.y - this.offsetY;
                }
            }
            this.draw();
        } else if (this.isPanning) {
            const dx = e.clientX - this.lastMouseX;
            const dy = e.clientY - this.lastMouseY;
            this.panX += dx;
            this.panY += dy;
            this.lastMouseX = e.clientX;
            this.lastMouseY = e.clientY;
            this.draw();
        } else {
            // Update cursor based on what's under mouse
            const node = this.getNodeAtPos(pos.x, pos.y);
            const connection = this.getConnectionAtPos(pos.x, pos.y);
            
            // Check if over resize handle
            if (this.selectedNode && this.isOverResizeHandle(this.selectedNode, pos.x, pos.y)) {
                this.canvas.style.cursor = 'nwse-resize';
            } else if (node) {
                this.canvas.style.cursor = 'pointer';
            } else if (connection) {
                this.canvas.style.cursor = 'pointer';
                if (this.hoveredConnection !== connection) {
                    this.hoveredConnection = connection;
                    this.draw();
                }
            } else {
                this.canvas.style.cursor = 'grab';
                if (this.hoveredConnection) {
                    this.hoveredConnection = null;
                    this.draw();
                }
            }
        }
    }

    handleMouseUp() {
        if (this.isSelecting) {
            this.isSelecting = false;
            this.selectionRect = null;
            this.updatePropertiesPanel();
            this.updateLayersPanel();
            this.draw();
        }
        
        // Save if we were dragging or resizing nodes
        if (this.isDragging || this.isResizing) {
            this.saveToLocalStorage(); // Auto-save after dragging/resizing
        }
        
        this.isDragging = false;
        this.isPanning = false;
        this.isResizing = false;
        this.draggedNode = null;
        // Restore cursor based on Space key state
        this.canvas.style.cursor = this.isSpacePressed ? 'grab' : 'default';
    }

    handleWheel(e) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        const newScale = Math.min(Math.max(0.5, this.scale * delta), 2);
        
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        this.panX = mouseX - (mouseX - this.panX) * (newScale / this.scale);
        this.panY = mouseY - (mouseY - this.panY) * (newScale / this.scale);
        this.scale = newScale;
        
        this.draw();
    }

    handleDoubleClick(e) {
        const pos = this.getMousePos(e);
        const node = this.getNodeAtPos(pos.x, pos.y);
        
        if (node) {
            // Start inline editing instead of opening modal
            this.startInlineEdit(node, 'title', e);
        }
    }

    setupToolbarDragAndDrop() {
        const toolbarItems = document.querySelectorAll('.toolbar-item');
        
        toolbarItems.forEach(item => {
            item.addEventListener('dragstart', (e) => {
                this.isDraggingFromToolbar = true;
                this.draggedToolbarType = item.dataset.type;
                this.draggedToolbarShape = item.dataset.shape;
                
                // Create drag preview
                const preview = document.createElement('div');
                preview.className = 'drag-preview';
                preview.style.cssText = `
                    background: ${this.getColorByType(this.draggedToolbarType)};
                    color: white;
                    padding: 12px 20px;
                    border-radius: 8px;
                    font-weight: 600;
                    font-size: 14px;
                `;
                preview.textContent = item.querySelector('.toolbar-label').textContent;
                document.body.appendChild(preview);
                this.dragPreview = preview;
                
                // Set drag image
                e.dataTransfer.effectAllowed = 'copy';
                e.dataTransfer.setDragImage(preview, 50, 25);
                
                item.classList.add('active');
            });
            
            item.addEventListener('dragend', (e) => {
                this.isDraggingFromToolbar = false;
                this.draggedToolbarType = null;
                this.draggedToolbarShape = null;
                
                if (this.dragPreview) {
                    this.dragPreview.remove();
                    this.dragPreview = null;
                }
                
                item.classList.remove('active');
            });
        });
        
        // Handle drop on canvas
        this.canvas.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
        });
        
        this.canvas.addEventListener('drop', (e) => {
            e.preventDefault();
            
            if (this.isDraggingFromToolbar && this.draggedToolbarType) {
                const rect = this.canvas.getBoundingClientRect();
                const x = (e.clientX - rect.left - this.panX) / this.scale;
                const y = (e.clientY - rect.top - this.panY) / this.scale;
                
                // Create new block at drop position
                const nodeData = {
                    title: this.getDefaultTitle(this.draggedToolbarType),
                    description: this.getDefaultDescription(this.draggedToolbarType),
                    responsibilities: '',
                    nodeType: this.draggedToolbarType,
                    shape: this.draggedToolbarShape,
                    metadata: {}
                };
                
                this.addNodeAtPosition(nodeData, x - 100, y - 40);
            }
        });
    }

    getDefaultTitle(type) {
        const titles = {
            'service': 'Novo Serviço',
            'module': 'Novo Módulo',
            'endpoint': 'Novo Endpoint',
            'middleware': 'Novo Middleware',
            'repository': 'Novo Repository',
            'database': 'Nova Database',
            'external': 'Serviço Externo',
            'layer': 'Nova Camada'
        };
        return titles[type] || 'Novo Bloco';
    }

    getDefaultDescription(type) {
        const descriptions = {
            'service': 'Descrição do serviço',
            'module': 'Descrição do módulo',
            'endpoint': 'Descrição do endpoint',
            'middleware': 'Descrição do middleware',
            'repository': 'Descrição do repository',
            'database': 'Descrição da database',
            'external': 'Descrição do serviço externo',
            'layer': 'Descrição da camada'
        };
        return descriptions[type] || 'Descrição do bloco';
    }

    addNodeAtPosition(nodeData, x, y) {
        const id = this.generateNodeId();
        const color = nodeData.customColor || this.getColorByType(nodeData.nodeType);
        
        const node = {
            id,
            title: nodeData.title,
            description: nodeData.description,
            responsibilities: nodeData.responsibilities || '',
            nodeType: nodeData.nodeType,
            shape: nodeData.shape || 'rectangle',
            phaseNumber: 1,
            metadata: nodeData.metadata || {},
            x: x,
            y: y,
            width: 200,
            height: 80,
            color,
            hidden: false,  // Ensure new blocks are visible
            locked: false   // Ensure new blocks are unlocked
        };
        
        this.nodes.push(node);
        
        // Add to layer order at the top (highest z-index)
        this.layerOrder.push(id);
        
        this.selectedNode = node;
        this.selectedNodes = [node];
        
        // Update panels
        this.updateLayersPanel();
        this.updatePropertiesPanel();
        this.draw();
        this.saveToLocalStorage(); // Auto-save
        
        // Start inline editing immediately
        setTimeout(() => {
            this.startInlineEdit(node, 'title', null);
        }, 100);
    }

    startInlineEdit(node, field, event) {
        // Close any existing inline edit
        this.closeInlineEdit();
        
        this.editingNode = node;
        this.editingField = field;
        
        // Create inline input
        const input = document.createElement('input');
        input.className = 'inline-edit-input';
        input.type = 'text';
        input.value = node[field];
        
        // Position the input over the field
        const rect = this.canvas.getBoundingClientRect();
        const x = rect.left + (node.x + this.panX) * this.scale;
        const y = rect.top + (node.y + this.panY) * this.scale + 35; // Adjust for title position
        
        input.style.left = x + 'px';
        input.style.top = y + 'px';
        input.style.width = (node.width * this.scale - 20) + 'px';
        
        document.body.appendChild(input);
        this.inlineInput = input;
        
        input.focus();
        input.select();
        
        // Save on blur or enter
        const save = () => {
            if (this.editingNode && this.editingField) {
                this.editingNode[this.editingField] = input.value;
                this.draw();
            }
            this.closeInlineEdit();
        };
        
        input.addEventListener('blur', save);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                save();
            } else if (e.key === 'Escape') {
                this.closeInlineEdit();
            }
        });
    }

    closeInlineEdit() {
        if (this.inlineInput) {
            // Save the value before closing
            if (this.editingNode && this.editingField) {
                const value = this.inlineInput.value;
                if (this.editingField === 'title') {
                    this.editingNode.title = value;
                } else if (this.editingField === 'description') {
                    this.editingNode.description = value;
                }
                this.updateLayersPanel();
                this.updatePropertiesPanel();
                this.saveToLocalStorage(); // Auto-save
            }
            this.inlineInput.remove();
            this.inlineInput = null;
        }
        this.editingNode = null;
        this.editingField = null;
        this.draw();
    }

    setupPropertiesPanel() {
        // Listen for property changes
        const inputs = ['propTitle', 'propDescription', 'propIcon', 'propType', 'propShape', 'propColor', 
                        'propX', 'propY', 'propWidth', 'propHeight', 'propLocked'];
        
        inputs.forEach(id => {
            const elem = document.getElementById(id);
            if (elem) {
                elem.addEventListener('input', () => this.updateSelectedNodesProperties());
                elem.addEventListener('change', () => this.updateSelectedNodesProperties());
            }
        });

        // Color preview sync
        const colorInput = document.getElementById('propColor');
        const colorPreview = document.getElementById('propColorPreview');
        if (colorInput && colorPreview) {
            colorInput.addEventListener('input', (e) => {
                colorPreview.style.backgroundColor = e.target.value;
            });
        }
    }

    setupLayersPanel() {
        // Panel toggle
        document.querySelectorAll('.panel-header').forEach(header => {
            header.addEventListener('click', () => {
                header.parentElement.classList.toggle('collapsed');
            });
        });

        this.updateLayersPanel();
    }

    updatePropertiesPanel() {
        const noSelection = document.getElementById('noSelection');
        const propertiesForm = document.getElementById('propertiesForm');
        
        if (this.selectedNodes.length === 0) {
            noSelection.style.display = 'block';
            propertiesForm.style.display = 'none';
            return;
        }

        noSelection.style.display = 'none';
        propertiesForm.style.display = 'block';

        // If only one node selected, populate all fields
        if (this.selectedNodes.length === 1) {
            const node = this.selectedNodes[0];
            document.getElementById('propTitle').value = node.title || '';
            document.getElementById('propDescription').value = node.description || '';
            document.getElementById('propIcon').value = node.icon || '';
            document.getElementById('propType').value = node.nodeType || 'service';
            document.getElementById('propShape').value = node.shape || 'rectangle';
            document.getElementById('propColor').value = node.color || '#000000';
            document.getElementById('propColorPreview').style.backgroundColor = node.color || '#000000';
            document.getElementById('propX').value = Math.round(node.x);
            document.getElementById('propY').value = Math.round(node.y);
            document.getElementById('propWidth').value = Math.round(node.width);
            document.getElementById('propHeight').value = Math.round(node.height);
            document.getElementById('propLocked').value = node.locked ? 'true' : 'false';
        } else {
            // Multiple selection - show mixed values
            document.getElementById('propTitle').value = `${this.selectedNodes.length} blocos selecionados`;
            document.getElementById('propTitle').disabled = true;
        }
    }

    updateSelectedNodesProperties() {
        if (this.selectedNodes.length === 0) return;

        const propTitle = document.getElementById('propTitle').value;
        const propDescription = document.getElementById('propDescription').value;
        const propIcon = document.getElementById('propIcon').value;
        const propType = document.getElementById('propType').value;
        const propShape = document.getElementById('propShape').value;
        const propColor = document.getElementById('propColor').value;
        const propX = parseInt(document.getElementById('propX').value);
        const propY = parseInt(document.getElementById('propY').value);
        const propWidth = parseInt(document.getElementById('propWidth').value);
        const propHeight = parseInt(document.getElementById('propHeight').value);
        const propLocked = document.getElementById('propLocked').value === 'true';

        this.selectedNodes.forEach(node => {
            if (this.selectedNodes.length === 1) {
                node.title = propTitle;
                node.description = propDescription;
                node.icon = propIcon;
                node.x = propX || node.x;
                node.y = propY || node.y;
            }
            node.nodeType = propType;
            node.shape = propShape;
            node.color = propColor;
            node.width = propWidth || node.width;
            node.height = propHeight || node.height;
            node.locked = propLocked;
        });

        this.updateLayersPanel();
        this.draw();
        this.saveToLocalStorage(); // Auto-save
    }

    updateLayersPanel() {
        const layersContent = document.getElementById('layersContent');
        if (!layersContent) return;

        layersContent.innerHTML = '';
        
        // Build layer order if not exists
        if (this.layerOrder.length === 0) {
            this.layerOrder = this.nodes.map(n => n.id);
        }

        // Sort nodes by layer order (reverse for top-to-bottom display)
        const orderedNodes = [...this.layerOrder]
            .reverse()
            .map(id => this.nodes.find(n => n.id === id))
            .filter(n => n);

        orderedNodes.forEach((node, index) => {
            const layerItem = document.createElement('div');
            layerItem.className = 'layer-item';
            layerItem.draggable = true;
            layerItem.dataset.nodeId = node.id;
            
            if (this.selectedNodes.includes(node)) {
                layerItem.classList.add('selected');
            }
            if (node.hidden) {
                layerItem.classList.add('hidden');
            }

            layerItem.innerHTML = `
            <span class="layer-icon" data-action="visibility">
                <i class="bx ${node.hidden ? 'bx-hide' : 'bx-show'}"></i>
            </span>
            <div class="layer-color" style="background: ${node.color}"></div>
            <span class="layer-name">${node.title}</span>
            <div class="layer-controls">
                <span class="layer-icon" data-action="lock">
                    <i class="bx ${node.locked ? 'bx-lock' : 'bx-lock-open'}"></i>
                </span>
            </div>
            `;

            // Click to select
            layerItem.addEventListener('click', (e) => {
                if (e.target.dataset.action) return; // Skip if clicking controls
                
                if (e.shiftKey) {
                    this.toggleNodeSelection(node);
                } else {
                    this.selectSingleNode(node);
                }
            });

            // Visibility toggle
            const visIcon = layerItem.querySelector('[data-action="visibility"]');
            visIcon.addEventListener('click', (e) => {
                e.stopPropagation();
                node.hidden = !node.hidden;
                this.updateLayersPanel();
                this.draw();
                this.saveToLocalStorage(); // Auto-save
            });

            // Lock toggle
            const lockIcon = layerItem.querySelector('[data-action="lock"]');
            lockIcon.addEventListener('click', (e) => {
                e.stopPropagation();
                node.locked = !node.locked;
                this.updateLayersPanel();
                this.updatePropertiesPanel();
                this.saveToLocalStorage(); // Auto-save
            });

            // Drag to reorder
            layerItem.addEventListener('dragstart', (e) => {
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('nodeId', node.id);
            });

            layerItem.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
            });

            layerItem.addEventListener('drop', (e) => {
                e.preventDefault();
                const draggedId = e.dataTransfer.getData('nodeId');
                this.reorderLayers(draggedId, node.id);
            });

            layersContent.appendChild(layerItem);
        });
    }

    selectSingleNode(node) {
        this.selectedNodes = [node];
        this.selectedNode = node;
        this.updateLayersPanel();
        this.updatePropertiesPanel();
        this.draw();
    }

    toggleNodeSelection(node) {
        const index = this.selectedNodes.indexOf(node);
        if (index > -1) {
            this.selectedNodes.splice(index, 1);
        } else {
            this.selectedNodes.push(node);
        }
        this.selectedNode = this.selectedNodes[0] || null;
        this.updateLayersPanel();
        this.updatePropertiesPanel();
        this.draw();
    }

    reorderLayers(draggedId, targetId) {
        const draggedIndex = this.layerOrder.indexOf(draggedId);
        const targetIndex = this.layerOrder.indexOf(targetId);
        
        if (draggedIndex === -1 || targetIndex === -1) return;
        
        this.layerOrder.splice(draggedIndex, 1);
        const newTargetIndex = this.layerOrder.indexOf(targetId);
        this.layerOrder.splice(newTargetIndex, 0, draggedId);
        
        this.updateLayersPanel();
        this.draw();
        this.saveToLocalStorage(); // Auto-save
    }

    sendToBack(nodes) {
        nodes.forEach(node => {
            const index = this.layerOrder.indexOf(node.id);
            if (index > -1) {
                this.layerOrder.splice(index, 1);
                this.layerOrder.unshift(node.id);
            }
        });
        this.updateLayersPanel();
        this.draw();
        this.saveToLocalStorage(); // Auto-save
    }

    sendToFront(nodes) {
        nodes.forEach(node => {
            const index = this.layerOrder.indexOf(node.id);
            if (index > -1) {
                this.layerOrder.splice(index, 1);
                this.layerOrder.push(node.id);
            }
        });
        this.updateLayersPanel();
        this.draw();
        this.saveToLocalStorage(); // Auto-save
    }

    openEditModal(node) {
        const modal = document.getElementById('editModal');
        const titleInput = document.getElementById('editTitle');
        const descInput = document.getElementById('editDescription');
        const typeSelect = document.getElementById('editNodeType');
        const shapeSelect = document.getElementById('editNodeShape');
        const respInput = document.getElementById('editResponsibilities');
        const metadataInput = document.getElementById('editMetadata');
        
        titleInput.value = node.title;
        descInput.value = node.description;
        typeSelect.value = node.nodeType || 'service';
        shapeSelect.value = node.shape || 'rectangle';
        respInput.value = node.responsibilities || '';
        metadataInput.value = JSON.stringify(node.metadata || {}, null, 2);
        modal.classList.add('active');
        
        const saveBtn = document.getElementById('saveEdit');
        const cancelBtn = document.getElementById('cancelEdit');
        const deleteBtn = document.getElementById('deleteNode');
        
        const save = () => {
            node.title = titleInput.value;
            node.description = descInput.value;
            node.nodeType = typeSelect.value;
            node.shape = shapeSelect.value;
            node.responsibilities = respInput.value;
            node.color = this.getColorByType(typeSelect.value);
            try {
                node.metadata = JSON.parse(metadataInput.value || '{}');
            } catch (e) {
                alert('Metadados JSON inválidos');
                return;
            }
            modal.classList.remove('active');
            this.draw();
            cleanup();
        };
        
        const deleteNode = () => {
            this.removeNode(node.id);
            modal.classList.remove('active');
            cleanup();
        };
        
        const cancel = () => {
            modal.classList.remove('active');
            cleanup();
        };
        
        const cleanup = () => {
            saveBtn.removeEventListener('click', save);
            cancelBtn.removeEventListener('click', cancel);
            deleteBtn.removeEventListener('click', deleteNode);
        };
        
        saveBtn.addEventListener('click', save);
        cancelBtn.addEventListener('click', cancel);
        deleteBtn.addEventListener('click', deleteNode);
    }

    openAddNodeModal() {
        const modal = document.getElementById('addNodeModal');
        const titleInput = document.getElementById('addNodeTitle');
        const descInput = document.getElementById('addNodeDescription');
        const typeSelect = document.getElementById('addNodeType');
        const shapeSelect = document.getElementById('addNodeShape');
        const respInput = document.getElementById('addNodeResponsibilities');
        const metadataInput = document.getElementById('addNodeMetadata');
        const customTypeGroup = document.getElementById('customTypeGroup');
        const customTypeColorGroup = document.getElementById('customTypeColorGroup');
        
        // Clear inputs
        titleInput.value = '';
        descInput.value = '';
        typeSelect.value = 'service';
        shapeSelect.value = 'rectangle';
        respInput.value = '';
        metadataInput.value = '';
        customTypeGroup.style.display = 'none';
        customTypeColorGroup.style.display = 'none';
        modal.classList.add('active');
        
        // Handle custom type selection
        const handleTypeChange = () => {
            if (typeSelect.value === 'custom') {
                customTypeGroup.style.display = 'block';
                customTypeColorGroup.style.display = 'block';
            } else {
                customTypeGroup.style.display = 'none';
                customTypeColorGroup.style.display = 'none';
            }
        };
        
        typeSelect.addEventListener('change', handleTypeChange);
        
        const saveBtn = document.getElementById('saveAddNode');
        const cancelBtn = document.getElementById('cancelAddNode');
        
        const save = () => {
            const title = titleInput.value.trim();
            const description = descInput.value.trim();
            const responsibilities = respInput.value.trim();
            let nodeType = typeSelect.value;
            let color = null;
            
            if (!title) {
                alert('Nome do componente é obrigatório');
                return;
            }
            
            // Handle custom type
            if (nodeType === 'custom') {
                const customTypeName = document.getElementById('customTypeName').value.trim();
                const customTypeColor = document.getElementById('customTypeColor').value;
                
                if (!customTypeName) {
                    alert('Nome do tipo personalizado é obrigatório');
                    return;
                }
                
                nodeType = this.sanitizeCustomTypeName(customTypeName);
                color = customTypeColor;
                
                // Store custom type for future use
                this.customBlockTypes[nodeType] = {
                    name: customTypeName,
                    color: customTypeColor
                };
            }
            
            let metadata = {};
            try {
                if (metadataInput.value.trim()) {
                    metadata = JSON.parse(metadataInput.value);
                }
            } catch (e) {
                alert('Metadados JSON inválidos');
                return;
            }
            
            this.addNode({
                title,
                description,
                responsibilities,
                nodeType: nodeType,
                shape: shapeSelect.value,
                metadata,
                customColor: color
            });
            
            modal.classList.remove('active');
            cleanup();
        };
        
        const cancel = () => {
            modal.classList.remove('active');
            cleanup();
        };
        
        const cleanup = () => {
            saveBtn.removeEventListener('click', save);
            cancelBtn.removeEventListener('click', cancel);
            typeSelect.removeEventListener('change', handleTypeChange);
        };
        
        saveBtn.addEventListener('click', save);
        cancelBtn.addEventListener('click', cancel);
    }

    addNode(nodeData) {
        const id = this.generateNodeId();
        const color = nodeData.customColor || this.getColorByType(nodeData.nodeType);
        
        // Position new node at center of viewport
        const centerX = (this.canvas.width / 2 - this.panX) / this.scale;
        const centerY = (this.canvas.height / 2 - this.panY) / this.scale;
        
        const node = {
            id,
            title: nodeData.title,
            description: nodeData.description,
            responsibilities: nodeData.responsibilities || '',
            nodeType: nodeData.nodeType,
            shape: nodeData.shape || 'rectangle',
            phaseNumber: 1,
            metadata: nodeData.metadata || {},
            x: centerX - 100,
            y: centerY - 40,
            width: 200,
            height: 80,
            color
        };
        
        this.nodes.push(node);
        this.selectedNode = node;
        this.draw();
    }

    removeNode(nodeId) {
        // Remove node
        this.nodes = this.nodes.filter(n => n.id !== nodeId);
        
        // Remove from layer order
        this.layerOrder = this.layerOrder.filter(id => id !== nodeId);
        
        // Remove connections related to this node
        this.connections = this.connections.filter(c => 
            c.from !== nodeId && c.to !== nodeId
        );
        
        this.selectedNode = null;
        this.selectedNodes = [];
        this.updateLayersPanel();
        this.updatePropertiesPanel();
        this.draw();
        this.saveToLocalStorage(); // Auto-save
    }

    exportToJSON() {
        const data = {
            version: '1.0',
            created: new Date().toISOString(),
            customBlockTypes: this.customBlockTypes,
            nodes: this.nodes.map(node => ({
                id: node.id,
                title: node.title,
                description: node.description,
                nodeType: node.nodeType,
                shape: node.shape || 'rectangle',
                phaseNumber: node.phaseNumber,
                metadata: node.metadata,
                position: { x: node.x, y: node.y },
                size: { width: node.width, height: node.height },
                color: node.color
            })),
            connections: this.connections
        };
        
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `jornada-usuario-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    importFromJSON(data) {
        try {
            if (!data.nodes || !Array.isArray(data.nodes)) {
                throw new Error('Formato de JSON inválido');
            }
            
            // Clear current data
            this.nodes = [];
            this.connections = [];
            
            // Load custom types if available
            if (data.customBlockTypes) {
                this.customBlockTypes = data.customBlockTypes;
            }
            
            // Load nodes
            data.nodes.forEach(nodeData => {
                const node = {
                    id: nodeData.id,
                    title: nodeData.title,
                    description: nodeData.description,
                    nodeType: nodeData.nodeType || 'service',
                    shape: nodeData.shape || 'rectangle',
                    phaseNumber: nodeData.phaseNumber || 1,
                    metadata: nodeData.metadata || {},
                    x: nodeData.position?.x || 100,
                    y: nodeData.position?.y || 100,
                    width: nodeData.size?.width || 200,
                    height: nodeData.size?.height || 80,
                    color: nodeData.color || this.getPhaseColor(0)
                };
                this.nodes.push(node);
            });
            
            // Load connections
            if (data.connections && Array.isArray(data.connections)) {
                this.connections = data.connections;
            }
            
            this.draw();
            alert('JSON importado com sucesso!');
        } catch (error) {
            alert('Erro ao importar JSON: ' + error.message);
        }
    }

    resetZoom() {
        this.scale = 1;
        this.panX = 0;
        this.panY = 0;
        this.draw();
    }

    clearAll() {
        this.nodes = [];
        this.connections = [];
        this.layerOrder = [];
        this.selectedNode = null;
        this.selectedNodes = [];
        this.updateLayersPanel();
        this.updatePropertiesPanel();
        this.draw();
        this.saveToLocalStorage(); // Auto-save
    }
}

// Initialize flowchart
let flowchart;
const FlowchartManager = {
    instance: null,
    init: function() {
        this.instance = new InteractiveFlowchart('journeyCanvas');
        return this.instance;
    },
    getInstance: function() {
        return this.instance;
    }
};

window.addEventListener('resize', () => {
    const instance = FlowchartManager.getInstance();
    if (instance && body.classList.contains('app-active')) {
        instance.setupCanvas();
        instance.draw();
    }
});

// Reset zoom button
document.getElementById('resetZoom')?.addEventListener('click', () => {
    const instance = FlowchartManager.getInstance();
    if (instance) {
        instance.resetZoom();
    }
});

// Auto layout button
document.getElementById('autoLayout')?.addEventListener('click', () => {
    const instance = FlowchartManager.getInstance();
    if (instance) {
        instance.autoLayout();
        instance.draw();
    }
});

// Clear canvas button
// document.getElementById('clearCanvas')?.addEventListener('click', () => {
//     const instance = FlowchartManager.getInstance();
//     if (instance && confirm('Tem certeza que deseja limpar todo o canvas?')) {
//         instance.clearAll();
//     }
// });

const clearBtn = document.getElementById('clearCanvas');
const confirmModal = document.getElementById('confirmModal');
const cancelBtn = document.getElementById('cancelConfirm');
const yesBtn = document.getElementById('confirmYes');

clearBtn.addEventListener('click', () => {
    confirmModal.style.display = 'flex'; // abre o modal
});

cancelBtn.addEventListener('click', () => {
    confirmModal.style.display = 'none'; // fecha
});

yesBtn.addEventListener('click', () => {
    const instance = FlowchartManager.getInstance();
    if (instance) instance.clearAll();
    confirmModal.style.display = 'none'; // fecha
});

// Fecha modal ao clicar fora da caixa
confirmModal.addEventListener('click', (e) => {
    if (e.target === confirmModal) {
        confirmModal.style.display = 'none';
    }
});
