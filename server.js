const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;
const DATA_DIR = path.join(__dirname, 'public', 'data', 'companies');

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Create new company
app.post('/api/admin/create-company', (req, res) => {
  const { companyId, companyName, csvContent, htmlContent, htmlFilename } = req.body;
  
  if (!companyId || !companyName || !csvContent) {
    return res.status(400).send('Missing required fields');
  }
  
  const companyDir = path.join(DATA_DIR, companyId);
  const graphsDir = path.join(companyDir, 'graphs');
  
  try {
    // Create directories
    fs.mkdirSync(companyDir, { recursive: true });
    fs.mkdirSync(graphsDir, { recursive: true });
    
    // Write metadata.csv
    fs.writeFileSync(path.join(companyDir, 'metadata.csv'), csvContent);
    
    // Write HTML if provided
    if (htmlContent && htmlFilename) {
      fs.writeFileSync(path.join(graphsDir, htmlFilename), htmlContent);
    }
    
    res.json({ success: true, message: 'Company created' });
  } catch (error) {
    console.error('Error creating company:', error);
    res.status(500).send('Failed to create company');
  }
});

// Append graph to existing company
app.post('/api/admin/append-graph', (req, res) => {
  const { companyId, htmlContent, htmlFilename } = req.body;
  
  if (!companyId || !htmlContent || !htmlFilename) {
    return res.status(400).send('Missing required fields');
  }
  
  const graphsDir = path.join(DATA_DIR, companyId, 'graphs');
  
  try {
    // Ensure graphs directory exists
    fs.mkdirSync(graphsDir, { recursive: true });
    
    // Write HTML file
    const filePath = path.join(graphsDir, htmlFilename);
    fs.writeFileSync(filePath, htmlContent);
    
    res.json({ success: true, message: 'Graph appended' });
  } catch (error) {
    console.error('Error appending graph:', error);
    res.status(500).send('Failed to append graph');
  }
});

// List companies
app.get('/api/companies', (req, res) => {
  try {
    const companies = fs.readdirSync(DATA_DIR)
      .filter(dir => fs.statSync(path.join(DATA_DIR, dir)).isDirectory())
      .map(id => {
        const metadataPath = path.join(DATA_DIR, id, 'metadata.csv');
        let name = id;
        
        if (fs.existsSync(metadataPath)) {
          const content = fs.readFileSync(metadataPath, 'utf8');
          const firstLine = content.split('\n')[1];
          if (firstLine) {
            const cols = firstLine.split(',');
            if (cols[0]) name = cols[0];
          }
        }
        
        return { id, name };
      });
    
    res.json({ companies });
  } catch (error) {
    console.error('Error listing companies:', error);
    res.status(500).send('Failed to list companies');
  }
});

// Serve static files
app.use(express.static('dist'));
app.use('/data', express.static('public/data'));

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Data directory: ${DATA_DIR}`);
});
