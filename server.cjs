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
function mergeCSVData(existingData, csvContent, companyNameOverride = null) {
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

    // Use override if provided, otherwise CSV value
    const companyName = companyNameOverride || cols[companyIdx];
    if (!companyName) continue;

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
  const { csvContent, htmlFiles, companyName } = req.body;
  console.log('[UPLOAD] Request received. companyName override:', companyName || 'None');

  try {
    // Load existing data
    let data = loadData();
    console.log(`[UPLOAD] Current company count: ${data.companies.length}`);

    // Merge CSV data
    if (csvContent) {
      console.log('[UPLOAD] Merging CSV content...');
      data = mergeCSVData(data, csvContent, companyName);
    }

    // Save HTML graph files and attach to sectors
    if (htmlFiles && htmlFiles.length > 0) {
      console.log(`[UPLOAD] Processing ${htmlFiles.length} HTML files...`);
      for (const html of htmlFiles) {
        if (html.content && html.filename && html.company && html.sector) {
          console.log(`[UPLOAD] Processing file: ${html.filename} for ${html.company} -> ${html.sector}`);
          const safeName = html.filename.replace(/[^a-zA-Z0-9.-]/g, '_');
          fs.writeFileSync(path.join(GRAPHS_DIR, safeName), html.content);

          // Find company and sector
          const company = data.companies.find(c => c.name === html.company);
          if (company) {
            const sector = company.sectors.find(s => s.name === html.sector);
            if (sector) {
              if (!sector.graphs) sector.graphs = [];
              // Avoid duplicates
              const existingGraph = sector.graphs.find(g => g.filename === html.filename);
              if (existingGraph) {
                existingGraph.content = html.content;
              } else {
                sector.graphs.push({
                  filename: html.filename,
                  content: html.content
                });
              }
              console.log(`[UPLOAD] Success: Attached ${html.filename} to ${html.company} -> ${html.sector}`);
            } else {
              console.warn(`[UPLOAD] Sector not found: "${html.sector}" in company "${html.company}"`);
              console.log(`[UPLOAD] Available sectors for this company: ${company.sectors.map(s => s.name).join(', ')}`);
            }
          } else {
            console.warn(`[UPLOAD] Company not found by name: "${html.company}"`);
            // Close match check
            const closeMatch = data.companies.find(c => c.name.toLowerCase().trim() === html.company.toLowerCase().trim());
            if (closeMatch) {
              console.log(`[UPLOAD] Found close match: "${closeMatch.name}"`);
            }
          }
        } else {
          console.warn('[UPLOAD] Missing required HTML data fields:', {
            filename: html.filename,
            company: html.company,
            sector: html.sector,
            hasContent: !!html.content
          });
        }
      }
    }

    // Save data
    saveData(data);
    console.log('[UPLOAD] Data saved successfully');

    res.json({ success: true, message: 'Upload successful' });
  } catch (error) {
    console.error('[UPLOAD] Error:', error);
    res.status(500).send('Failed to upload: ' + error.message);
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
