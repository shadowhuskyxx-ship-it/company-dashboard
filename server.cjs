const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;
const DATA_DIR = path.join(__dirname, 'public', 'data');
const COMPANIES_FILE = path.join(DATA_DIR, 'companies.csv');
const GRAPHS_DIR = path.join(DATA_DIR, 'graphs');

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Ensure directories exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(GRAPHS_DIR)) {
  fs.mkdirSync(GRAPHS_DIR, { recursive: true });
}

// Upload companies CSV and HTML graphs
app.post('/api/admin/upload', (req, res) => {
  const { csvContent, htmlFiles } = req.body;
  
  try {
    // Save CSV if provided
    if (csvContent) {
      fs.writeFileSync(COMPANIES_FILE, csvContent);
    }
    
    // Save HTML graph files
    if (htmlFiles && htmlFiles.length > 0) {
      for (const html of htmlFiles) {
        if (html.content && html.filename) {
          const safeName = html.filename.replace(/[^a-zA-Z0-9.-]/g, '_');
          fs.writeFileSync(path.join(GRAPHS_DIR, safeName), html.content);
          
          // Save metadata
          const metadataPath = path.join(GRAPHS_DIR, `${safeName}.meta.json`);
          fs.writeFileSync(metadataPath, JSON.stringify({
            sector: html.sector,
            filename: html.filename
          }));
        }
      }
    }
    
    res.json({ success: true, message: 'Upload successful' });
  } catch (error) {
    console.error('Error uploading:', error);
    res.status(500).send('Failed to upload');
  }
});

// Get all graphs
app.get('/api/graphs', (req, res) => {
  try {
    if (!fs.existsSync(GRAPHS_DIR)) {
      return res.json([]);
    }
    
    const files = fs.readdirSync(GRAPHS_DIR);
    const graphs = [];
    
    for (const file of files) {
      if (file.endsWith('.html') || file.endsWith('.htm')) {
        const metaPath = path.join(GRAPHS_DIR, `${file}.meta.json`);
        let sector = '';
        
        if (fs.existsSync(metaPath)) {
          const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
          sector = meta.sector || '';
        }
        
        const content = fs.readFileSync(path.join(GRAPHS_DIR, file), 'utf8');
        graphs.push({ filename: file, sector, content });
      }
    }
    
    res.json(graphs);
  } catch (error) {
    res.status(500).send('Failed to read graphs');
  }
});

// Serve static files
app.use(express.static('dist'));
app.use('/data', express.static(DATA_DIR));

// SPA fallback
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
