class LandscapeCAD {
    constructor() {
        this.canvas = document.getElementById('mainCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.currentTool = null;
        this.currentLayer = 'ground';
        this.isDrawing = false;
        this.elements = [];
        
        // Grid settings
        this.gridSize = 20;
        this.gridEnabled = true;
        this.snapToGrid = true;
        this.scale = { pixels: 20, meters: 1 }; // 20 pixels = 1 meter
        
        this.initializeCanvas();
        this.setupEventListeners();
        this.selectedElement = null;
        
        // Project metadata
        this.projectName = 'Untitled Project';
        this.lastModified = new Date();
    }

    initializeCanvas() {
        // Set canvas size to match container
        const resizeCanvas = () => {
            const container = this.canvas.parentElement;
            this.canvas.width = container.clientWidth;
            this.canvas.height = container.clientHeight;
            this.render();
        };

        window.addEventListener('resize', resizeCanvas);
        resizeCanvas();
    }

    setupEventListeners() {
        // Tool selection
        document.querySelectorAll('[data-tool]').forEach(button => {
            button.addEventListener('click', () => {
                this.currentTool = button.dataset.tool;
                this.highlightSelectedTool(button);
            });
        });

        // Layer selection
        document.getElementById('layerSelect').addEventListener('change', (e) => {
            this.currentLayer = e.target.value;
            this.render();
        });

        // Grid controls
        document.getElementById('toggleGrid').addEventListener('click', () => {
            this.gridEnabled = !this.gridEnabled;
            this.render();
        });

        document.getElementById('toggleSnap').addEventListener('click', () => {
            this.snapToGrid = !this.snapToGrid;
            document.getElementById('toggleSnap').classList.toggle('active', this.snapToGrid);
        });

        document.getElementById('gridSize').addEventListener('change', (e) => {
            this.gridSize = parseInt(e.target.value);
            this.render();
        });

        // Canvas event listeners
        this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
        this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
        this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
        this.canvas.addEventListener('click', this.handleClick.bind(this));

        // Project management
        document.getElementById('newProject').addEventListener('click', this.newProject.bind(this));
        document.getElementById('saveProject').addEventListener('click', this.saveProjectToFile.bind(this));
        document.getElementById('loadProjectBtn').addEventListener('click', () => {
            document.getElementById('loadProject').click();
        });
        document.getElementById('loadProject').addEventListener('change', this.loadProjectFromFile.bind(this));
    }

    highlightSelectedTool(selectedButton) {
        document.querySelectorAll('[data-tool]').forEach(button => {
            button.style.backgroundColor = button === selectedButton ? '#45a049' : '#4CAF50';
        });
    }

    handleMouseDown(e) {
        this.isDrawing = true;
        const pos = this.getMousePos(e);
        
        switch(this.currentTool) {
            case 'rectangle':
            case 'circle':
                this.startShape = pos;
                break;
            case 'freehand':
                this.currentPath = [pos];
                break;
        }
    }

    handleMouseMove(e) {
        if (!this.isDrawing) return;
        
        const pos = this.getMousePos(e);
        
        switch(this.currentTool) {
            case 'freehand':
                if (this.currentPath) {
                    this.currentPath.push(pos);
                    this.render();
                }
                break;
            case 'rectangle':
            case 'circle':
                this.render();
                this.drawPreview(pos);
                break;
        }
    }

    handleMouseUp(e) {
        if (!this.isDrawing) return;
        this.isDrawing = false;
        
        const pos = this.getMousePos(e);
        
        switch(this.currentTool) {
            case 'rectangle':
                this.elements.push({
                    type: 'rectangle',
                    layer: this.currentLayer,
                    x: Math.min(this.startShape.x, pos.x),
                    y: Math.min(this.startShape.y, pos.y),
                    width: Math.abs(pos.x - this.startShape.x),
                    height: Math.abs(pos.y - this.startShape.y)
                });
                break;
            case 'circle':
                const radius = Math.sqrt(
                    Math.pow(pos.x - this.startShape.x, 2) +
                    Math.pow(pos.y - this.startShape.y, 2)
                );
                this.elements.push({
                    type: 'circle',
                    layer: this.currentLayer,
                    x: this.startShape.x,
                    y: this.startShape.y,
                    radius: radius
                });
                break;
            case 'freehand':
                if (this.currentPath) {
                    this.elements.push({
                        type: 'path',
                        layer: this.currentLayer,
                        points: [...this.currentPath]
                    });
                    this.currentPath = null;
                }
                break;
        }
        
        this.render();
    }

    getMousePos(e) {
        const rect = this.canvas.getBoundingClientRect();
        let pos = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };

        if (this.snapToGrid) {
            pos.x = Math.round(pos.x / this.gridSize) * this.gridSize;
            pos.y = Math.round(pos.y / this.gridSize) * this.gridSize;
        }

        return pos;
    }

    drawPreview(currentPos) {
        switch(this.currentTool) {
            case 'rectangle':
                this.ctx.strokeStyle = '#000';
                this.ctx.strokeRect(
                    Math.min(this.startShape.x, currentPos.x),
                    Math.min(this.startShape.y, currentPos.y),
                    Math.abs(currentPos.x - this.startShape.x),
                    Math.abs(currentPos.y - this.startShape.y)
                );
                break;
            case 'circle':
                const radius = Math.sqrt(
                    Math.pow(currentPos.x - this.startShape.x, 2) +
                    Math.pow(currentPos.y - this.startShape.y, 2)
                );
                this.ctx.beginPath();
                this.ctx.arc(this.startShape.x, this.startShape.y, radius, 0, Math.PI * 2);
                this.ctx.stroke();
                break;
        }
    }

    drawGrid() {
        if (!this.gridEnabled) return;

        this.ctx.strokeStyle = '#ddd';
        this.ctx.lineWidth = 0.5;

        // Draw vertical lines
        for (let x = 0; x < this.canvas.width; x += this.gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.canvas.height);
            this.ctx.stroke();
        }

        // Draw horizontal lines
        for (let y = 0; y < this.canvas.height; y += this.gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.canvas.width, y);
            this.ctx.stroke();
        }

        // Reset line width
        this.ctx.lineWidth = 1;
    }

    calculateArea(element) {
        let area = 0;
        switch(element.type) {
            case 'rectangle':
                area = (element.width * element.height) / (this.scale.pixels * this.scale.pixels);
                break;
            case 'circle':
                area = Math.PI * Math.pow(element.radius / this.scale.pixels, 2);
                break;
            case 'polygon':
                if (element.points && element.points.length > 2) {
                    for (let i = 0; i < element.points.length; i++) {
                        const j = (i + 1) % element.points.length;
                        area += element.points[i].x * element.points[j].y;
                        area -= element.points[j].x * element.points[i].y;
                    }
                    area = Math.abs(area / 2) / (this.scale.pixels * this.scale.pixels);
                }
                break;
        }
        return area.toFixed(2);
    }

    handleClick(e) {
        const pos = this.getMousePos(e);
        if (this.currentTool === 'select') {
            this.selectedElement = null;
            for (let i = this.elements.length - 1; i >= 0; i--) {
                const element = this.elements[i];
                if (this.isPointInElement(pos, element)) {
                    this.selectedElement = element;
                    this.updatePropertiesPanel();
                    break;
                }
            }
            this.render();
        }
    }

    isPointInElement(point, element) {
        switch(element.type) {
            case 'rectangle':
                return point.x >= element.x && 
                       point.x <= element.x + element.width &&
                       point.y >= element.y && 
                       point.y <= element.y + element.height;
            case 'circle':
                const dx = point.x - element.x;
                const dy = point.y - element.y;
                return Math.sqrt(dx * dx + dy * dy) <= element.radius;
            case 'polygon':
                if (!element.points) return false;
                let inside = false;
                for (let i = 0, j = element.points.length - 1; i < element.points.length; j = i++) {
                    const xi = element.points[i].x, yi = element.points[i].y;
                    const xj = element.points[j].x, yj = element.points[j].y;
                    const intersect = ((yi > point.y) !== (yj > point.y)) &&
                        (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);
                    if (intersect) inside = !inside;
                }
                return inside;
        }
        return false;
    }

    updatePropertiesPanel() {
        const panel = document.getElementById('objectProperties');
        panel.innerHTML = '';

        if (this.selectedElement) {
            const nameDiv = document.createElement('div');
            nameDiv.innerHTML = `
                <label>Name:</label>
                <input type="text" value="${this.selectedElement.name || ''}" 
                       onchange="window.landscapeCAD.updateElementProperty('name', this.value)">
            `;
            panel.appendChild(nameDiv);

            const areaDiv = document.createElement('div');
            areaDiv.innerHTML = `
                <label>Area:</label>
                <span>${this.calculateArea(this.selectedElement)} m²</span>
            `;
            panel.appendChild(areaDiv);

            // Add other properties based on shape type
            switch(this.selectedElement.type) {
                case 'rectangle':
                    this.addDimensionInputs(panel, ['width', 'height']);
                    break;
                case 'circle':
                    this.addDimensionInputs(panel, ['radius']);
                    break;
            }
        }
    }

    addDimensionInputs(panel, dimensions) {
        dimensions.forEach(dim => {
            const div = document.createElement('div');
            const value = this.selectedElement[dim] / this.scale.pixels;
            div.innerHTML = `
                <label>${dim.charAt(0).toUpperCase() + dim.slice(1)}:</label>
                <input type="number" value="${value}" 
                       onchange="window.landscapeCAD.updateElementProperty('${dim}', this.value * ${this.scale.pixels})">
                <span>m</span>
            `;
            panel.appendChild(div);
        });
    }

    updateElementProperty(property, value) {
        if (this.selectedElement) {
            this.selectedElement[property] = value;
            this.render();
        }
    }

    render() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw grid
        this.drawGrid();
        
        // Draw all elements
        this.elements.forEach(element => {
            if (element.layer === this.currentLayer) {
                this.ctx.strokeStyle = element === this.selectedElement ? '#ff0000' : '#000000';
                this.drawElement(element);
            }
        });
        
        // Draw current path if drawing
        if (this.currentPath) {
            this.drawPath(this.currentPath);
        }
    }

    drawElement(element) {
        switch(element.type) {
            case 'rectangle':
                this.ctx.strokeRect(element.x, element.y, element.width, element.height);
                break;
            case 'circle':
                this.ctx.beginPath();
                this.ctx.arc(element.x, element.y, element.radius, 0, Math.PI * 2);
                this.ctx.stroke();
                break;
            case 'path':
                this.drawPath(element.points);
                break;
        }
    }

    drawPath(points) {
        if (points.length < 2) return;
        
        this.ctx.beginPath();
        this.ctx.moveTo(points[0].x, points[0].y);
        
        for (let i = 1; i < points.length; i++) {
            this.ctx.lineTo(points[i].x, points[i].y);
        }
        
        this.ctx.stroke();
    }

    saveProjectToFile() {
        const projectData = {
            name: this.projectName,
            lastModified: new Date().toISOString(),
            gridSettings: {
                size: this.gridSize,
                enabled: this.gridEnabled,
                snapEnabled: this.snapToGrid
            },
            scale: this.scale,
            elements: this.elements
        };

        const blob = new Blob([JSON.stringify(projectData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${this.projectName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    async loadProjectFromFile(event) {
        const file = event.target.files[0];
        if (!file) return;

        try {
            const text = await file.text();
            const projectData = JSON.parse(text);

            // Load project data
            this.projectName = projectData.name || 'Untitled Project';
            this.lastModified = new Date(projectData.lastModified);

            // Load grid settings
            if (projectData.gridSettings) {
                this.gridSize = projectData.gridSettings.size;
                this.gridEnabled = projectData.gridSettings.enabled;
                this.snapToGrid = projectData.gridSettings.snapEnabled;
            }

            // Load scale
            if (projectData.scale) {
                this.scale = projectData.scale;
            }

            // Load elements
            this.elements = projectData.elements || [];

            // Reset selection
            this.selectedElement = null;

            // Update UI
            this.updateGridControls();
            this.render();

            // Clear file input
            event.target.value = '';

        } catch (error) {
            console.error('Error loading project:', error);
            alert('Error loading project file. Please make sure it is a valid JSON file.');
        }
    }

    updateGridControls() {
        // Update grid size input
        const gridSizeInput = document.getElementById('gridSize');
        if (gridSizeInput) {
            gridSizeInput.value = this.gridSize;
        }

        // Update grid toggle button
        const toggleGridBtn = document.getElementById('toggleGrid');
        if (toggleGridBtn) {
            toggleGridBtn.classList.toggle('active', this.gridEnabled);
        }

        // Update snap toggle button
        const toggleSnapBtn = document.getElementById('toggleSnap');
        if (toggleSnapBtn) {
            toggleSnapBtn.classList.toggle('active', this.snapToGrid);
        }
    }

    newProject() {
        if (confirm('Start a new project? Any unsaved changes will be lost.')) {
            this.projectName = 'Untitled Project';
            this.lastModified = new Date();
            this.elements = [];
            this.selectedElement = null;
            this.render();
        }
    }
}

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.landscapeCAD = new LandscapeCAD();
});
