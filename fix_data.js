const fs = require('fs');
const path = require('path');

const dataPath = path.join(__dirname, 'public', 'data', 'data.json');

try {
    const content = fs.readFileSync(dataPath, 'utf8');
    const data = JSON.parse(content);

    let count = 0;
    data.companies.forEach(company => {
        company.sectors.forEach(sector => {
            sector.parentCompany = company.name;
            count++;
        });
    });

    fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
    console.log(`Successfully updated ${count} sectors with parentCompany: ${data.companies.length} companies processed.`);
} catch (err) {
    console.error('Error fixing data.json:', err);
    process.exit(1);
}
