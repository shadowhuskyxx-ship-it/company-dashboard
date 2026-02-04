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
  htmlFile?: string;
}

// Load company data from folder structure
async function loadCompanies(): Promise<Company[]> {
  // Return sample data
  return [
    {
      id: 'acme-corp',
      name: 'Acme Corp',
      path: 'data/companies/acme-corp',
      sectors: [
        { name: 'Smart Energy Storage', companyCount: 42, growthScore: 0.25, employeeCagr: 15.5, htmlFile: 'smart-energy.html' },
        { name: 'Grid Flexibility Solutions', companyCount: 28, growthScore: 0.18, employeeCagr: 12.3, htmlFile: 'grid-flex.html' },
      ]
    },
    {
      id: 'techstart',
      name: 'TechStart Inc',
      path: 'data/companies/techstart',
      sectors: [
        { name: 'AI & Machine Learning', companyCount: 35, growthScore: 0.32, employeeCagr: 22.1, htmlFile: 'ai-ml.html' },
        { name: 'Cloud Infrastructure', companyCount: 48, growthScore: 0.28, employeeCagr: 18.7, htmlFile: 'cloud.html' },
      ]
    },
    {
      id: 'globex',
      name: 'Globex Industries',
      path: 'data/companies/globex',
      sectors: [
        { name: 'Renewable Energy', companyCount: 56, growthScore: 0.21, employeeCagr: 14.2, htmlFile: 'renewable.html' },
      ]
    }
  ];
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
              {sector.htmlFile && (
                <div className="retro-html-indicator">
                  <span className="retro-icon">📊</span>
                  <span>{sector.htmlFile}</span>
                </div>
              )}
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

function SectorView({ company, sector, onBack }: { 
  company: Company; 
  sector: Sector;
  onBack: () => void;
}) {
  const [htmlContent, setHtmlContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (sector.htmlFile) {
      setLoading(true);
      fetch(`${company.path}/${sector.htmlFile}`)
        .then(r => r.text())
        .then(setHtmlContent)
        .catch(() => setHtmlContent(null))
        .finally(() => setLoading(false));
    }
  }, [company, sector]);

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
        
        {sector.htmlFile && (
          <div className="retro-html-viewer">
            <div className="retro-html-header">
              <span>📊 {sector.htmlFile}</span>
              <a 
                href={`${company.path}/${sector.htmlFile}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="retro-link"
              >
                OPEN FULL SCREEN ↗
              </a>
            </div>
            {loading ? (
              <div className="retro-loading">LOADING GRAPH...</div>
            ) : htmlContent ? (
              <iframe 
                srcDoc={htmlContent}
                className="retro-iframe"
                title={sector.name}
              />
            ) : (
              <div className="retro-error">GRAPH FILE NOT FOUND</div>
            )}
          </div>
        )}
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
