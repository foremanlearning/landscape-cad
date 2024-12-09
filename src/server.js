const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Data file paths
const USERS_FILE = path.join(__dirname, 'data', 'users.json');
const PLANTS_FILE = path.join(__dirname, 'data', 'plants.json');
const PROJECTS_FILE = path.join(__dirname, 'data', 'projects.json');

// Helper function to read JSON files
async function readJsonFile(filePath) {
    try {
        const data = await fs.readFile(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error(`Error reading file ${filePath}:`, error);
        return null;
    }
}

// Helper function to write JSON files
async function writeJsonFile(filePath, data) {
    try {
        await fs.writeFile(filePath, JSON.stringify(data, null, 2));
        return true;
    } catch (error) {
        console.error(`Error writing file ${filePath}:`, error);
        return false;
    }
}

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Plants API
app.get('/api/plants', async (req, res) => {
    const data = await readJsonFile(PLANTS_FILE);
    if (data) {
        res.json(data.plants);
    } else {
        res.status(500).json({ error: 'Error reading plants data' });
    }
});

// Projects API
app.get('/api/projects', async (req, res) => {
    const data = await readJsonFile(PROJECTS_FILE);
    if (data) {
        res.json(data.projects);
    } else {
        res.status(500).json({ error: 'Error reading projects data' });
    }
});

app.post('/api/projects', async (req, res) => {
    const data = await readJsonFile(PROJECTS_FILE);
    if (!data) {
        return res.status(500).json({ error: 'Error reading projects data' });
    }

    const newProject = {
        id: Date.now().toString(),
        ...req.body,
        createdAt: new Date().toISOString()
    };

    data.projects.push(newProject);
    
    if (await writeJsonFile(PROJECTS_FILE, data)) {
        res.json(newProject);
    } else {
        res.status(500).json({ error: 'Error saving project' });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
