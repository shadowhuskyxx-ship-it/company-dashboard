const fs = require('fs');
const path = require('path');

const dataPath = '/home/user8397/clawd/company-dashboard/public/data/data.json';
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

// 1. Sector-level graph
const renewableSector = data.companies[0].sectors.find(s => s.name === 'Renewable Energy');
if (renewableSector) {
  renewableSector.graphs = [
    { filename: 'renewable_energy_thematic_sectors_plotly__3_.html' }
  ];

  // 2. Thematic-level graph (fastest growing)
  const fastestGrowingThematic = renewableSector.thematicSectors.find(
    t => t.name === 'Smart Energy Storage & Grid Flexibility Solutions'
  );
  if (fastestGrowingThematic) {
    fastestGrowingThematic.graphs = [
      { filename: 'fastest_growing_thematic_sector_plotly__2_.html' }
    ];
  }
}

fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
console.log("Graphs re-linked: sector and thematic mapping updated.");
