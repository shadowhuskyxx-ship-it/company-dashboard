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
  const sectorIdx = headers.indexOf('sector');
  const sectorDescIdx = headers.indexOf('sector_description');
  const thematicIdx = headers.indexOf('thematic_sector');
  const thematicDescIdx = headers.indexOf('thematic_sector_description');
  // Sector-level metrics
  const sectorCountIdx = headers.indexOf('sector_company_count');
  const sectorGrowthIdx = headers.indexOf('sector_median_growth_score');
  const sectorCagrIdx = headers.indexOf('sector_median_employee_cagr');
  // Thematic-level metrics
  const thematicCountIdx = headers.indexOf('company_count');
  const thematicGrowthIdx = headers.indexOf('median_growth_score');
  const thematicCagrIdx = headers.indexOf('median_employee_cagr');
  const thematicRevIdx = headers.indexOf('median_revenue_cagr'); // Added
  const thematicAcqIdx = headers.indexOf('acquisition_pct');     // Added
  const thematicRankIdx = headers.indexOf('combined_rank');     // Combined rank
  const thematicEntryIdx = headers.indexOf('entry_rate_pct');   // Entry rate
  const thematic5YrIdx = headers.indexOf('5_year_median_employee_cagr_pct'); // 5yr CAGR

  const companies = [...existingData.companies];

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    if (cols.length < 5) continue;

    const companyName = companyNameOverride || cols[companyIdx];
    const sectorName = cols[sectorIdx];
    const thematicName = cols[thematicIdx];

    if (!companyName) continue;

    // Find or create company
    let company = companies.find(c => c.name === companyName);
    if (!company) {
      company = { name: companyName, sectors: [] };
      companies.push(company);
    }

    // Find or create sector
    let sector = company.sectors.find(s => s.name === sectorName);
    if (!sector) {
      sector = {
        name: sectorName,
        description: cols[sectorDescIdx] || '',
        companyCount: parseInt(cols[sectorCountIdx]) || 0,
        medianGrowthScore: parseFloat(cols[sectorGrowthIdx]) || 0,
        medianEmployeeCagr: parseFloat(cols[sectorCagrIdx]) || 0,
        thematicSectors: [],
        graphs: []
      };
      company.sectors.push(sector);
    }

    // Add thematic sector if not exists
    const existingThematic = sector.thematicSectors.find(t => t.name === thematicName);
    if (!existingThematic) {
      sector.thematicSectors.push({
        name: thematicName,
        description: cols[thematicDescIdx] || '',
        companyCount: parseInt(cols[thematicCountIdx]) || 0,
        medianGrowthScore: parseFloat(cols[thematicGrowthIdx]) || 0,
        medianEmployeeCagr: parseFloat(cols[thematicCagrIdx]) || 0,
        medianRevenueCagr: parseFloat(cols[thematicRevIdx]) || 0,
        acquisitionPct: parseFloat(cols[thematicAcqIdx]) || 0,
        entryRatePct: parseFloat(cols[thematicEntryIdx]) || 0,
        fiveYearCagr: parseFloat(cols[thematic5YrIdx]) || 0,
        rank: parseInt(cols[thematicRankIdx]) || 0,
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
  const { csvContent, companyName, htmlFiles } = req.body;
  console.log('[UPLOAD] Request received. companyName:', companyName);

  try {
    // Load existing data
    let data = loadData();

    // Merge CSV data
    if (csvContent) {
      console.log('[UPLOAD] Merging CSV content...');
      data = mergeCSVData(data, csvContent, companyName);
    }

    // Save HTML graph files and attach to sectors/thematics
    if (htmlFiles && htmlFiles.length > 0) {
      console.log(`[UPLOAD] Processing ${htmlFiles.length} HTML files...`);
      for (const html of htmlFiles) {
        if (html.content && html.filename && html.target) {
          console.log(`[UPLOAD] Processing file: ${html.filename} for ${html.type}: ${html.target}`);
          const safeName = html.filename.replace(/[^a-zA-Z0-9.-]/g, '_');
          fs.writeFileSync(path.join(GRAPHS_DIR, safeName), html.content);

          // Find company
          const company = data.companies.find(c => c.name === companyName);
          if (company) {
            if (html.type === 'sector') {
              // Attach to sector
              const sector = company.sectors.find(s => s.name === html.target);
              if (sector) {
                if (!sector.graphs) sector.graphs = [];
                const existing = sector.graphs.find(g => g.filename === html.filename);
                if (existing) {
                  existing.content = html.content;
                } else {
                  sector.graphs.push({ filename: html.filename, content: html.content });
                }
                console.log(`[UPLOAD] Attached to sector: ${html.target}`);
              }
            } else if (html.type === 'thematic') {
              // Attach to thematic sector (search across all sectors)
              for (const sector of company.sectors) {
                const thematic = sector.thematicSectors.find(t => t.name === html.target);
                if (thematic) {
                  if (!thematic.graphs) thematic.graphs = [];
                  const existing = thematic.graphs.find(g => g.filename === html.filename);
                  if (existing) {
                    existing.content = html.content;
                  } else {
                    thematic.graphs.push({ filename: html.filename, content: html.content });
                  }
                  console.log(`[UPLOAD] Attached to thematic: ${html.target} in sector: ${sector.name}`);
                  break;
                }
              }
            }
          }
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

// Delete company
app.delete('/api/company/:name', (req, res) => {
  const { name } = req.params;
  const data = loadData();
  data.companies = data.companies.filter(c => c.name !== name);
  saveData(data);
  res.json({ success: true });
});

// Serve static files
app.use(express.static(path.join(__dirname, 'dist')));
app.use('/data', express.static(DATA_DIR));

// SPA fallback
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});
