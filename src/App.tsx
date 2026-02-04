import { useState, useEffect } from 'react';
import './index.css';

// Types
interface Company {
  id: string;
  name: string;
  path: string;
  sectors: Sector[];
}

interface Sector {
  name: string;
  companyCount: number;
  growthScore: number;
  employeeCagr: number;
  htmlFile: string;
}

// Parse metadata CSV
function parseMetadata(csv: string, companyId: string): Sector[] {
  const lines = csv.trim().split('\n');
  if (lines.length < 2) return [];
  
  const headers = lines[0].split(',');
  const thematicIdx = headers.indexOf('thematic_sector');
  const countIdx = headers.indexOf('company_count');
  const growthIdx = headers.indexOf('median_growth_score');
  const cagrIdx = headers.indexOf('median_employee_cagr');
  
  const sectors: Sector[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',');
    if (cols.length >= 4) {
      const sectorName = cols[thematicIdx] || `Sector ${i}`;
      sectors.push({
        name: sectorName,
        companyCount: parseInt(cols[countIdx]) || 0,
        growthScore: parseFloat(cols[growthIdx]) || 0,
        employeeCagr: parseFloat(cols[cagrIdx]) || 0,
        htmlFile: `/data/companies/${companyId}/graphs/${sectorName.toLowerCase().replace(/\s+/g, '-')}.html`,
      });
    }
  }
  return sectors;
}

// Load company data from folder structure
async function loadCompanies(): Promise<Company[]> {
  const companyIds = ['acme-corp', 'techstart', 'globex'];
  const companyNames: Record<string, string> = {
    'acme-corp': 'Acme Corp',
    'techstart': 'TechStart Inc',
    'globex': 'Globex Industries'
  };
  
  const companies: Company[] = [];
  
  for (const id of companyIds) {
    try {
      const response = await fetch(`/data/companies/${id}/metadata.csv`);
      if (response.ok) {
        const csv = await response.text();
        const sectors = parseMetadata(csv, id);
        companies.push({
          id,
          name: companyNames[id] || id,
          path: `data/companies/${id}`,
          sectors
        });
      }
    } catch (e) {
      console.error(`Failed to load ${id}:`, e);
    }
  }
  
  return companies;
}

// Views
function CompanyList({ onSelect }: { onSelect: (c: Company) => void }) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCompanies().then(data => {
      setCompanies(data);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="retro-loading">LOADING...</div>;

  return (
    <div className="retro-container">
      <header className="retro-header">
        <h1>► COMPANY ANALYTICS TERMINAL v2.0</h1>
        <span className="retro-blink">_</span>
      </header>
      
      <div className="retro-content">
        <div className="retro-tree">
          <div className="retro-tree-header">ROOT/DATA/COMPANIES/</div>
          {companies.map((company, idx) => (
            <div 
              key={company.id}
              className="retro-tree-item"
              onClick={() => onSelect(company)}
              style={{ animationDelay: `${idx * 50}ms` }}
            >
              <span className="retro-icon">📁</span>
              <span className="retro-name">{company.name.toUpperCase()}/</span>
              <span className="retro-meta">[{company.sectors.length} sectors]</span>
            </div>
          ))}
        </div>
      </div>
      
      <footer className="retro-footer">
        <span>SYSTEM READY</span>
        <span>{companies.length} COMPANIES FOUND</span>
      </footer>
    </div>
  );
}

function CompanyView({ company, onBack, onSelectSector }: { 
  company: Company; 
  onBack: () => void;
  onSelectSector: (s: Sector) => void;
}) {
  return (
    <div className="retro-container">
      <header className="retro-header">
        <button className="retro-btn" onClick={onBack}>← BACK</button>
        <h1>► {company.name.toUpperCase()}</h1>
      </header>
      
      <div className="retro-content">
        <div className="retro-path">PATH: {company.path}</div>
        
        <div className="retro-grid">
          {company.sectors.map((sector, idx) => (
            <div 
              key={idx}
              className="retro-card"
              onClick={() => onSelectSector(sector)}
            >
              <div className="retro-card-header">
                <span className="retro-icon">📄</span>
                <span className="retro-filename">{sector.name.toUpperCase().replace(/\s+/g, '_')}.CSV</span>
              </div>
              <div className="retro-card-stats">
                <div>COMPANIES: {sector.companyCount}</div>
                <div>GROWTH: {(sector.growthScore * 100).toFixed(1)}%</div>
                <div>CAGR: {sector.employeeCagr.toFixed(1)}%</div>
              </div>
              <div className="retro-html-indicator">
                <span className="retro-icon">📊</span>
                <span>GRAPH AVAILABLE</span>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <footer className="retro-footer">
        <span>{company.sectors.length} SECTORS</span>
        <span>TOTAL COMPANIES: {company.sectors.reduce((a, s) => a + s.companyCount, 0)}</span>
      </footer>
    </div>
  );
}

function SectorView({ sector, onBack }: { 
  company: Company; 
  sector: Sector;
  onBack: () => void;
}) {
  const [htmlContent, setHtmlContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(false);
    fetch(sector.htmlFile)
      .then(r => {
        if (!r.ok) throw new Error('Not found');
        return r.text();
      })
      .then(setHtmlContent)
      .catch(() => {
        setError(true);
        setHtmlContent(null);
      })
      .finally(() => setLoading(false));
  }, [sector]);

  return (
    <div className="retro-container">
      <header className="retro-header">
        <button className="retro-btn" onClick={onBack}>← BACK</button>
        <h1>► {sector.name.toUpperCase()}</h1>
      </header>
      
      <div className="retro-content">
        <div className="retro-sector-info">
          <div className="retro-stat-box">
            <label>COMPANY COUNT</label>
            <span className="retro-value">{sector.companyCount}</span>
          </div>
          <div className="retro-stat-box">
            <label>GROWTH SCORE</label>
            <span className="retro-value">{(sector.growthScore * 100).toFixed(1)}%</span>
          </div>
          <div className="retro-stat-box">
            <label>EMPLOYEE CAGR</label>
            <span className="retro-value">{sector.employeeCagr.toFixed(1)}%</span>
          </div>
        </div>
        
        <div className="retro-html-viewer">
          <div className="retro-html-header">
            <span>📊 {sector.htmlFile.split('/').pop()}</span>
            <a 
              href={sector.htmlFile} 
              target="_blank" 
              rel="noopener noreferrer"
              className="retro-link"
            >
              OPEN FULL SCREEN ↗
            </a>
          </div>
          {loading ? (
            <div className="retro-loading">LOADING GRAPH...</div>
          ) : error ? (
            <div className="retro-error">GRAPH FILE NOT FOUND</div>
          ) : htmlContent ? (
            <iframe 
              srcDoc={htmlContent}
              className="retro-iframe"
              title={sector.name}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}

// Main App
function App() {
  const [view, setView] = useState<'list' | 'company' | 'sector'>('list');
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [selectedSector, setSelectedSector] = useState<Sector | null>(null);

  const selectCompany = (company: Company) => {
    setSelectedCompany(company);
    setView('company');
  };

  const selectSector = (sector: Sector) => {
    setSelectedSector(sector);
    setView('sector');
  };

  const goBack = () => {
    if (view === 'sector') {
      setSelectedSector(null);
      setView('company');
    } else if (view === 'company') {
      setSelectedCompany(null);
      setView('list');
    }
  };

  return (
    <div className="retro-app">
      {view === 'list' && <CompanyList onSelect={selectCompany} />}
      {view === 'company' && selectedCompany && (
        <CompanyView 
          company={selectedCompany} 
          onBack={goBack}
          onSelectSector={selectSector}
        />
      )}
      {view === 'sector' && selectedCompany && selectedSector && (
        <SectorView 
          company={selectedCompany} 
          sector={selectedSector}
          onBack={goBack}
        />
      )}
    </div>
  );
}

export default App;
