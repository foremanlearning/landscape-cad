class LandscapeCAD {
    constructor() {
        this.canvas = document.getElementById('mainCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.currentTool = null;
        this.currentLayer = 'ground';
        this.isDrawing = false;
        this.elements = [];
        this.currentPath = null;
        this.tempPolygon = false;
        this.tempPath = false;
        this.showLabels = true;
        
        // Undo system
        this.undoStack = [];
        this.maxUndoSteps = 50;
        
        // Grid settings
        this.gridSize = 20;
        this.gridEnabled = true;
        this.snapToGrid = true;
        this.scale = { pixels: 20, meters: 1 };
        
        // Layer settings with default colors
        this.layers = {
            ground: { 
                name: 'Ground Layer', 
                visible: true, 
                opacity: 1.0, 
                outlineColor: '#006400',  // Dark green
                fillColor: '#90EE90',     // Light green
                outlineAlpha: 1,
                fillAlpha: 1
            },
            hardscape: { 
                name: 'Hardscape Layer', 
                visible: true, 
                opacity: 1.0, 
                outlineColor: '#1A1A1A',  // Very dark gray
                fillColor: '#696969',     // Dim gray
                outlineAlpha: 1,
                fillAlpha: 1
            },
            water: { 
                name: 'Water Features', 
                visible: true, 
                opacity: 1.0, 
                outlineColor: '#000080',  // Navy blue
                fillColor: '#4169E1',     // Royal blue
                outlineAlpha: 1,
                fillAlpha: 1
            },
            planting: { 
                name: 'Planting Beds', 
                visible: true, 
                opacity: 1.0, 
                outlineColor: '#2F1810',  // Dark brown
                fillColor: '#8B4513',     // Saddle brown
                outlineAlpha: 1,
                fillAlpha: 1
            },
            plants: { 
                name: 'Plants', 
                visible: true, 
                opacity: 1.0, 
                outlineColor: '#006400',  // Dark green
                fillColor: '#32CD32',     // Lime green
                outlineAlpha: 1,
                fillAlpha: 1
            },
            structures: { 
                name: 'Structures', 
                visible: true, 
                opacity: 1.0, 
                outlineColor: '#404040',  // Dark gray
                fillColor: '#A9A9A9',     // Dark gray
                outlineAlpha: 1,
                fillAlpha: 1
            }
        };

        // Current colors and alphas
        this.currentOutlineColor = this.layers[this.currentLayer].outlineColor;
        this.currentFillColor = this.layers[this.currentLayer].fillColor;
        this.currentOutlineAlpha = this.layers[this.currentLayer].outlineAlpha;
        this.currentFillAlpha = this.layers[this.currentLayer].fillAlpha;
        
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
                
                // Reset colors to layer defaults when selecting a drawing tool
                if (['rectangle', 'circle', 'polygon', 'path', 'line', 'freehand'].includes(this.currentTool)) {
                    const layer = this.layers[this.currentLayer];
                    this.currentOutlineColor = layer.outlineColor;
                    this.currentFillColor = layer.fillColor;
                    this.currentOutlineAlpha = layer.outlineAlpha;
                    this.currentFillAlpha = layer.fillAlpha;
                    document.getElementById('outlineColor').value = layer.outlineColor;
                    document.getElementById('fillColor').value = layer.fillColor;
                    document.getElementById('outlineAlpha').value = layer.outlineAlpha;
                    document.getElementById('fillAlpha').value = layer.fillAlpha;
                }
            });
        });

        // Add keyboard shortcut for undo
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
                e.preventDefault();
                this.undo();
            }
        });

        // Layer controls
        document.getElementById('layerSelect').addEventListener('change', (e) => {
            this.currentLayer = e.target.value;
            this.currentOutlineColor = this.layers[this.currentLayer].outlineColor;
            this.currentFillColor = this.layers[this.currentLayer].fillColor;
            this.currentOutlineAlpha = this.layers[this.currentLayer].outlineAlpha;
            this.currentFillAlpha = this.layers[this.currentLayer].fillAlpha;
            document.getElementById('outlineColor').value = this.currentOutlineColor;
            document.getElementById('fillColor').value = this.currentFillColor;
            document.getElementById('outlineAlpha').value = this.currentOutlineAlpha;
            document.getElementById('fillAlpha').value = this.currentFillAlpha;
            this.updateLayerControls();
            this.render();
        });

        // Add opacity control event listener
        document.getElementById('layerOpacity').addEventListener('input', (e) => {
            this.layers[this.currentLayer].opacity = parseFloat(e.target.value);
            this.render();
        });

        // Add visibility toggle
        document.getElementById('layerVisibility').addEventListener('click', () => {
            this.layers[this.currentLayer].visible = !this.layers[this.currentLayer].visible;
            this.updateLayerControls();
            this.render();
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

        // Color and alpha control event listeners
        document.getElementById('outlineColor').addEventListener('input', (e) => {
            this.currentOutlineColor = e.target.value;
            if (this.selectedElement) {
                this.selectedElement.outlineColor = e.target.value;
                this.render();
            }
        });

        document.getElementById('fillColor').addEventListener('input', (e) => {
            this.currentFillColor = e.target.value;
            if (this.selectedElement) {
                this.selectedElement.fillColor = e.target.value;
                this.render();
            }
        });

        document.getElementById('outlineAlpha').addEventListener('input', (e) => {
            this.currentOutlineAlpha = parseFloat(e.target.value);
            if (this.selectedElement) {
                this.selectedElement.outlineAlpha = this.currentOutlineAlpha;
                this.render();
            }
        });

        document.getElementById('fillAlpha').addEventListener('input', (e) => {
            this.currentFillAlpha = parseFloat(e.target.value);
            if (this.selectedElement) {
                this.selectedElement.fillAlpha = this.currentFillAlpha;
                this.render();
            }
        });

        // Label toggle
        document.getElementById('toggleLabels').addEventListener('click', () => {
            this.showLabels = !this.showLabels;
            document.getElementById('toggleLabels').classList.toggle('active');
            this.render();
        });

        // Canvas event listeners
        this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
        this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
        this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
        this.canvas.addEventListener('click', this.handleClick.bind(this));
        this.canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault(); // Prevent default context menu
            if (this.currentTool === 'path' && this.currentPath && this.currentPath.length > 1) {
                this.addElement({
                    type: 'path',
                    layer: this.currentLayer,
                    points: [...this.currentPath]
                });
                this.currentPath = null;
                this.tempPath = false;
                this.render();
            }
        });

        // Keyboard event listener
        document.addEventListener('keydown', this.handleKeyDown.bind(this));

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
            case 'polygon':
                if (!this.currentPath) {
                    this.currentPath = [pos];
                    this.tempPolygon = true;
                } else {
                    // Check if click is near starting point to close polygon
                    const startPoint = this.currentPath[0];
                    const distance = Math.sqrt(
                        Math.pow(pos.x - startPoint.x, 2) + 
                        Math.pow(pos.y - startPoint.y, 2)
                    );
                    
                    if (distance < 10 && this.currentPath.length > 2) {
                        // Close polygon
                        this.addElement({
                            type: 'polygon',
                            layer: this.currentLayer,
                            points: [...this.currentPath]
                        });
                        this.currentPath = null;
                        this.tempPolygon = false;
                    } else {
                        this.currentPath.push(pos);
                    }
                }
                break;
            case 'line':
                this.startShape = pos;
                break;
            case 'path':
                if (!this.currentPath) {
                    this.currentPath = [pos];
                    this.tempPath = true;
                } else {
                    this.currentPath.push(pos);
                }
                break;
            case 'freehand':
                this.currentPath = [pos];
                break;
        }
    }

    handleMouseMove(e) {
        if (!this.isDrawing && !this.tempPolygon && !this.tempPath) return;
        
        const pos = this.getMousePos(e);
        
        switch(this.currentTool) {
            case 'freehand':
                if (this.currentPath) {
                    // Add point only if it's far enough from the last point
                    const lastPoint = this.currentPath[this.currentPath.length - 1];
                    const distance = Math.sqrt(
                        Math.pow(pos.x - lastPoint.x, 2) + 
                        Math.pow(pos.y - lastPoint.y, 2)
                    );
                    if (distance > 2) { // Minimum distance between points
                        this.currentPath.push(pos);
                        this.render();
                    }
                }
                break;
            case 'polygon':
            case 'path':
                this.render();
                // Draw preview line from last point to current mouse position
                if (this.currentPath && this.currentPath.length > 0) {
                    this.ctx.beginPath();
                    this.ctx.moveTo(this.currentPath[this.currentPath.length - 1].x, 
                                  this.currentPath[this.currentPath.length - 1].y);
                    this.ctx.lineTo(pos.x, pos.y);
                    this.ctx.stroke();
                }
                break;
            case 'line':
                this.render();
                if (this.startShape) {
                    this.ctx.beginPath();
                    this.ctx.moveTo(this.startShape.x, this.startShape.y);
                    this.ctx.lineTo(pos.x, pos.y);
                    this.ctx.stroke();
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
        
        const pos = this.getMousePos(e);
        let newElement;
        
        switch(this.currentTool) {
            case 'rectangle':
                newElement = {
                    type: 'rectangle',
                    layer: this.currentLayer,
                    x: Math.min(this.startShape.x, pos.x),
                    y: Math.min(this.startShape.y, pos.y),
                    width: Math.abs(pos.x - this.startShape.x),
                    height: Math.abs(pos.y - this.startShape.y),
                    label: ''
                };
                this.addElement(newElement);
                break;
            case 'circle':
                const radius = Math.sqrt(
                    Math.pow(pos.x - this.startShape.x, 2) +
                    Math.pow(pos.y - this.startShape.y, 2)
                );
                newElement = {
                    type: 'circle',
                    layer: this.currentLayer,
                    x: this.startShape.x,
                    y: this.startShape.y,
                    radius: radius,
                    label: ''
                };
                this.addElement(newElement);
                break;
            case 'line':
                if (this.startShape) {
                    newElement = {
                        type: 'line',
                        layer: this.currentLayer,
                        x1: this.startShape.x,
                        y1: this.startShape.y,
                        x2: pos.x,
                        y2: pos.y,
                        label: ''
                    };
                    this.addElement(newElement);
                    this.startShape = null;
                }
                break;
            case 'freehand':
                if (this.currentPath && this.currentPath.length > 2) {
                    const startPoint = this.currentPath[0];
                    const distance = Math.sqrt(
                        Math.pow(pos.x - startPoint.x, 2) + 
                        Math.pow(pos.y - startPoint.y, 2)
                    );
                    
                    if (distance < 20) {
                        newElement = {
                            type: 'polygon',
                            layer: this.currentLayer,
                            points: [...this.currentPath],
                            label: ''
                        };
                    } else {
                        newElement = {
                            type: 'path',
                            layer: this.currentLayer,
                            points: [...this.currentPath],
                            label: ''
                        };
                    }
                    this.addElement(newElement);
                    this.currentPath = null;
                }
                break;
        }
        
        if (!this.tempPolygon && !this.tempPath) {
            this.isDrawing = false;
        }
        
        this.render();
    }

    handleKeyDown(e) {
        if (e.key === 'Escape') {
            // Cancel current drawing
            this.currentPath = null;
            this.tempPolygon = false;
            this.tempPath = false;
            this.isDrawing = false;
            this.render();
        } else if (e.key === 'Enter') {
            // Complete current polygon or path
            if (this.tempPolygon && this.currentPath && this.currentPath.length > 2) {
                this.addElement({
                    type: 'polygon',
                    layer: this.currentLayer,
                    points: [...this.currentPath],
                    label: ''
                });
                this.currentPath = null;
                this.tempPolygon = false;
                this.render();
            } else if (this.tempPath && this.currentPath && this.currentPath.length > 1) {
                this.addElement({
                    type: 'path',
                    layer: this.currentLayer,
                    points: [...this.currentPath],
                    label: ''
                });
                this.currentPath = null;
                this.tempPath = false;
                this.render();
            }
        }
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
            // Update color pickers and alpha sliders
            document.getElementById('outlineColor').value = 
                this.selectedElement.outlineColor || this.layers[this.selectedElement.layer].outlineColor;
            document.getElementById('fillColor').value = 
                this.selectedElement.fillColor || this.layers[this.selectedElement.layer].fillColor;
            document.getElementById('outlineAlpha').value = 
                this.selectedElement.outlineAlpha ?? this.layers[this.selectedElement.layer].outlineAlpha;
            document.getElementById('fillAlpha').value = 
                this.selectedElement.fillAlpha ?? this.layers[this.selectedElement.layer].fillAlpha;

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

            const labelDiv = document.createElement('div');
            labelDiv.innerHTML = `
                <label>Label:</label>
                <input type="text" id="labelInput" value="${this.selectedElement.label || ''}" />
            `;
            panel.appendChild(labelDiv);

            // Add other properties based on shape type
            switch(this.selectedElement.type) {
                case 'rectangle':
                    this.addDimensionInputs(panel, ['width', 'height']);
                    break;
                case 'circle':
                    this.addDimensionInputs(panel, ['radius']);
                    break;
            }

            // Add event listener for label changes
            const labelInput = document.getElementById('labelInput');
            labelInput.addEventListener('input', (e) => {
                this.updateElementProperty('label', e.target.value);
            });
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

    updateLayerControls() {
        const layer = this.layers[this.currentLayer];
        document.getElementById('layerOpacity').value = layer.opacity;
        document.getElementById('layerVisibility').classList.toggle('active', layer.visible);
        document.getElementById('currentLayerName').textContent = layer.name;
        
        // Update color pickers and alpha sliders to match layer defaults
        document.getElementById('outlineColor').value = layer.outlineColor;
        document.getElementById('fillColor').value = layer.fillColor;
        document.getElementById('outlineAlpha').value = layer.outlineAlpha;
        document.getElementById('fillAlpha').value = layer.fillAlpha;
        
        // Update current colors and alphas
        this.currentOutlineColor = layer.outlineColor;
        this.currentFillColor = layer.fillColor;
        this.currentOutlineAlpha = layer.outlineAlpha;
        this.currentFillAlpha = layer.fillAlpha;
    }

    drawElement(element) {
        const layer = this.layers[element.layer];
        if (!layer.visible) return;

        this.ctx.save();
        
        // Set outline color with alpha
        const outlineColor = element.outlineColor || layer.outlineColor;
        const outlineAlpha = element.outlineAlpha ?? layer.outlineAlpha;
        this.ctx.strokeStyle = outlineColor;
        this.ctx.globalAlpha = outlineAlpha;
        
        switch(element.type) {
            case 'rectangle':
                this.ctx.strokeRect(element.x, element.y, element.width, element.height);
                // Set fill color with alpha
                const fillColor = element.fillColor || layer.fillColor;
                const fillAlpha = element.fillAlpha ?? layer.fillAlpha;
                this.ctx.fillStyle = fillColor;
                this.ctx.globalAlpha = fillAlpha;
                this.ctx.fillRect(element.x, element.y, element.width, element.height);
                break;
            case 'circle':
                this.ctx.beginPath();
                this.ctx.arc(element.x, element.y, element.radius, 0, Math.PI * 2);
                this.ctx.stroke();
                // Set fill color with alpha
                this.ctx.fillStyle = element.fillColor || layer.fillColor;
                this.ctx.globalAlpha = element.fillAlpha ?? layer.fillAlpha;
                this.ctx.fill();
                break;
            case 'polygon':
                if (element.points && element.points.length > 1) {
                    this.ctx.beginPath();
                    this.ctx.moveTo(element.points[0].x, element.points[0].y);
                    for (let i = 1; i < element.points.length; i++) {
                        this.ctx.lineTo(element.points[i].x, element.points[i].y);
                    }
                    this.ctx.closePath();
                    this.ctx.stroke();
                    // Set fill color with alpha
                    this.ctx.fillStyle = element.fillColor || layer.fillColor;
                    this.ctx.globalAlpha = element.fillAlpha ?? layer.fillAlpha;
                    this.ctx.fill();
                }
                break;
            case 'line':
                this.ctx.beginPath();
                this.ctx.moveTo(element.x1, element.y1);
                this.ctx.lineTo(element.x2, element.y2);
                this.ctx.stroke();
                break;
            case 'path':
                if (element.points && element.points.length > 1) {
                    this.ctx.beginPath();
                    this.ctx.moveTo(element.points[0].x, element.points[0].y);
                    for (let i = 1; i < element.points.length; i++) {
                        this.ctx.lineTo(element.points[i].x, element.points[i].y);
                    }
                    this.ctx.stroke();
                }
                break;
        }
        
        // Draw selection highlight
        if (element === this.selectedElement) {
            this.ctx.strokeStyle = '#ff0000';
            this.ctx.globalAlpha = 1;
            this.ctx.setLineDash([5, 5]);
            switch(element.type) {
                case 'rectangle':
                    this.ctx.strokeRect(element.x - 2, element.y - 2, 
                                     element.width + 4, element.height + 4);
                    break;
                case 'circle':
                    this.ctx.beginPath();
                    this.ctx.arc(element.x, element.y, element.radius + 2, 0, Math.PI * 2);
                    this.ctx.stroke();
                    break;
                // Add similar highlight logic for other shapes
            }
            this.ctx.setLineDash([]);
        }
        
        // Draw label if enabled
        if (this.showLabels && element.label) {
            this.ctx.font = '12px Arial';
            this.ctx.fillStyle = '#000';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            switch(element.type) {
                case 'rectangle':
                    this.ctx.fillText(element.label, element.x + element.width / 2, element.y + element.height / 2);
                    break;
                case 'circle':
                    this.ctx.fillText(element.label, element.x, element.y);
                    break;
                case 'polygon':
                case 'path':
                    // Calculate center of points
                    const points = element.points || element.path;
                    const labelX = points.reduce((sum, p) => sum + p.x, 0) / points.length;
                    const labelY = points.reduce((sum, p) => sum + p.y, 0) / points.length;
                    this.ctx.fillText(element.label, labelX, labelY);
                    break;
                case 'line':
                    this.ctx.fillText(element.label, (element.x1 + element.x2) / 2, (element.y1 + element.y2) / 2);
                    break;
            }
        }
        
        this.ctx.restore();
    }

    addElement(element) {
        // Add colors and alphas to the element
        element.outlineColor = this.currentOutlineColor;
        element.fillColor = this.currentFillColor;
        element.outlineAlpha = this.currentOutlineAlpha;
        element.fillAlpha = this.currentFillAlpha;
        
        // Create a command for adding the element
        const command = {
            type: 'add',
            element: element,
            undo: () => {
                const index = this.elements.findIndex(e => e === element);
                if (index !== -1) {
                    this.elements.splice(index, 1);
                }
            },
            redo: () => {
                this.elements.push(element);
            }
        };
        
        // Execute the command
        command.redo();
        
        // Add to undo stack
        this.undoStack.push(command);
        
        // Limit undo stack size
        if (this.undoStack.length > this.maxUndoSteps) {
            this.undoStack.shift();
        }
        
        this.render();
    }
    
    undo() {
        if (this.undoStack.length > 0) {
            const command = this.undoStack.pop();
            command.undo();
            this.render();
        }
    }

    render() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw grid
        this.drawGrid();
        
        // Sort elements by layer order
        const layerOrder = ['ground', 'hardscape', 'water', 'planting', 'plants', 'structures'];
        const sortedElements = [...this.elements].sort((a, b) => {
            return layerOrder.indexOf(a.layer) - layerOrder.indexOf(b.layer);
        });
        
        // Draw all elements
        sortedElements.forEach(element => {
            this.drawElement(element);
        });
        
        // Draw current path if drawing
        if (this.currentPath) {
            this.drawPath(this.currentPath);
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
            elements: this.elements,
            layers: this.layers
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

            // Load layers
            this.layers = projectData.layers || this.layers;

            // Reset selection
            this.selectedElement = null;

            // Update UI
            this.updateGridControls();
            this.updateLayerControls();
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
