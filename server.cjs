const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;
const DATA_DIR = path.join(__dirname, 'public', 'data');
const DATA_FILE = path.join(DATA_DIR, 'data.json');
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

// Load existing data
function loadData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    }
  } catch (e) {
    console.error('Error loading data:', e);
  }
  return { companies: [] };
}

// Save data
function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// Parse CSV and merge with existing data
function mergeCSVData(existingData, csvContent) {
  const lines = csvContent.trim().split('\n');
  if (lines.length < 2) return existingData;
  
  const headers = lines[0].split(',');
  const companyIdx = headers.indexOf('company_name');
  const sectorIdx = headers.indexOf('thematic_sector');
  const sectorDescIdx = headers.indexOf('thematic_sector_description');
  const countIdx = headers.indexOf('company_count');
  const growthIdx = headers.indexOf('median_growth_score');
  const cagrIdx = headers.indexOf('median_employee_cagr');
  
  const companies = [...existingData.companies];
  
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    if (cols.length < 5) continue;
    
    const companyName = cols[companyIdx];
    const sectorName = cols[sectorIdx];
    
    // Find or create company
    let company = companies.find(c => c.name === companyName);
    if (!company) {
      company = { name: companyName, sectors: [] };
      companies.push(company);
    }
    
    // Check if sector already exists
    const existingSector = company.sectors.find(s => s.name === sectorName);
    if (!existingSector) {
      company.sectors.push({
        name: sectorName,
        description: cols[sectorDescIdx] || '',
        companyCount: parseInt(cols[countIdx]) || 0,
        medianGrowthScore: parseFloat(cols[growthIdx]) || 0,
        medianEmployeeCagr: parseFloat(cols[cagrIdx]) || 0,
        parentCompany: companyName,
        graphs: []
      });
    }
  }
  
  return { companies };
}

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

// Upload endpoint
app.post('/api/admin/upload', (req, res) => {
  const { csvContent, htmlFiles } = req.body;
  
  try {
    // Load existing data
    let data = loadData();
    
    // Merge CSV data
    if (csvContent) {
      data = mergeCSVData(data, csvContent);
    }
    
    // Save HTML graph files and attach to sectors
    if (htmlFiles && htmlFiles.length > 0) {
      for (const html of htmlFiles) {
        if (html.content && html.filename && html.company && html.sector) {
          const safeName = html.filename.replace(/[^a-zA-Z0-9.-]/g, '_');
          fs.writeFileSync(path.join(GRAPHS_DIR, safeName), html.content);
          
          // Find company and sector
          const company = data.companies.find(c => c.name === html.company);
          if (company) {
            const sector = company.sectors.find(s => s.name === html.sector);
            if (sector) {
              if (!sector.graphs) sector.graphs = [];
              sector.graphs.push({
                filename: html.filename,
                content: html.content
              });
            }
          }
        }
      }
    }
    
    // Save data
    saveData(data);
    
    res.json({ success: true, message: 'Upload successful' });
  } catch (error) {
    console.error('Error uploading:', error);
    res.status(500).send('Failed to upload');
  }
});

// Get all data
app.get('/api/data', (req, res) => {
  res.json(loadData());
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
