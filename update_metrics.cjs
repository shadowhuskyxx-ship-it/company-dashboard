const fs = require('fs');
const path = require('path');

const csvPath = '/home/user8397/.clawdbot/media/inbound/fb05cbcf-785d-4a60-bd89-35e67e717ac9';
const dataPath = '/home/user8397/clawd/company-dashboard/public/data/data.json';

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') inQuotes = !inQuotes;
    else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else current += char;
  }
  result.push(current.trim());
  return result;
}

const csvContent = fs.readFileSync(csvPath, 'utf8');
const lines = csvContent.trim().split('\n');
const headers = lines[0].split(',');

const sectorIdx = headers.indexOf('sector');
const sectorDescIdx = headers.indexOf('sector_description');
const sectorCountIdx = headers.indexOf('sector_company_count');
const sectorGrowthIdx = headers.indexOf('sector_median_growth_score');
const sectorCagrIdx = headers.indexOf('sector_median_employee_cagr');

const thematicIdx = headers.indexOf('thematic_sector');
const thematicDescIdx = headers.indexOf('thematic_sector_description');
const countIdx = headers.indexOf('company_count');
const growthIdx = headers.indexOf('median_growth_score');
const cagrIdx = headers.indexOf('median_employee_cagr');
const revCagrIdx = headers.indexOf('median_revenue_cagr');
const acqIdx = headers.indexOf('acquisition_pct');

// We'll create one main company "Inflexion Industry Overview"
const companies = [{
  name: "Inflexion Industry Overview",
  sectors: []
}];

const company = companies[0];

for (let i = 1; i < lines.length; i++) {
  const cols = parseCSVLine(lines[i]);
  if (cols.length < 5) continue;

  const sectorName = cols[sectorIdx];
  let sector = company.sectors.find(s => s.name === sectorName);
  
  if (!sector) {
    sector = {
      name: sectorName,
      description: cols[sectorDescIdx],
      companyCount: parseInt(cols[sectorCountIdx]) || 0,
      medianGrowthScore: parseFloat(cols[sectorGrowthIdx]) || 0,
      medianEmployeeCagr: parseFloat(cols[sectorCagrIdx]) || 0,
      thematicSectors: [],
      graphs: []
    };
    company.sectors.push(sector);
  }

  const thematicName = cols[thematicIdx];
  if (!sector.thematicSectors.find(t => t.name === thematicName)) {
    sector.thematicSectors.push({
      name: thematicName,
      description: cols[thematicDescIdx],
      companyCount: parseInt(cols[countIdx]) || 0,
      medianGrowthScore: parseFloat(cols[growthIdx]) || 0,
      medianEmployeeCagr: parseFloat(cols[cagrIdx]) || 0,
      medianRevenueCagr: parseFloat(cols[revCagrIdx]) || 0,
      acquisitionPct: parseFloat(cols[acqIdx]) || 0,
      graphs: []
    });
  }
}

fs.writeFileSync(dataPath, JSON.stringify({ companies }, null, 2));
console.log("Data updated successfully.");
