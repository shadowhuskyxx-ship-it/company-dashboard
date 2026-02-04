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
  // Load from API
  try {
    const response = await fetch('/api/companies');
    if (response.ok) {
      return await response.json();
    }
  } catch (e) {
    console.error('Failed to load from API:', e);
  }
  
  // Fallback: scan directory
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

// Admin Panel Component
function AdminPanel({ onClose, companies, onRefresh }: { 
  onClose: () => void; 
  companies: Company[];
  onRefresh: () => void;
}) {
  const [activeTab, setActiveTab] = useState<'new' | 'append'>('new');
  const [companyName, setCompanyName] = useState('');
  const [selectedCompany, setSelectedCompany] = useState('');
  const [csvContent, setCsvContent] = useState('');
  const [htmlContent, setHtmlContent] = useState('');
  const [htmlFilename, setHtmlFilename] = useState('');
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'csv' | 'html') => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (type === 'csv') {
        setCsvContent(content);
        // Auto-generate company name from filename
        if (!companyName) {
          setCompanyName(file.name.replace(/\.csv$/i, '').replace(/[-_]/g, ' '));
        }
      } else {
        setHtmlContent(content);
        if (!htmlFilename) {
          setHtmlFilename(file.name.replace(/\.html?$/i, '') + '.html');
        }
      }
    };
    reader.readAsText(file);
  };

  const handleSubmit = async () => {
    setMessage('');
    setIsError(false);

    if (activeTab === 'new') {
      if (!companyName || !csvContent) {
        setMessage('Company name and CSV are required');
        setIsError(true);
        return;
      }

      // Generate company ID
      const companyId = companyName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      
      try {
        const response = await fetch('/api/admin/create-company', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            companyId,
            companyName,
            csvContent,
            htmlContent,
            htmlFilename: htmlFilename || 'graph.html'
          })
        });
        
        if (response.ok) {
          setMessage(`Company "${companyName}" created successfully!`);
          setCompanyName('');
          setCsvContent('');
          setHtmlContent('');
          setHtmlFilename('');
          onRefresh();
        } else {
          const error = await response.text();
          setMessage(`Error: ${error}`);
          setIsError(true);
        }
      } catch (e) {
        setMessage('Failed to create company. Is the server running?');
        setIsError(true);
      }
    } else {
      // Append mode
      if (!selectedCompany || !htmlContent) {
        setMessage('Please select a company and provide HTML content');
        setIsError(true);
        return;
      }

      try {
        const response = await fetch('/api/admin/append-graph', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            companyId: selectedCompany,
            htmlContent,
            htmlFilename: htmlFilename || 'graph.html'
          })
        });
        
        if (response.ok) {
          setMessage('HTML graph appended successfully!');
          setHtmlContent('');
          setHtmlFilename('');
          onRefresh();
        } else {
          const error = await response.text();
          setMessage(`Error: ${error}`);
          setIsError(true);
        }
      } catch (e) {
        setMessage('Failed to append graph. Is the server running?');
        setIsError(true);
      }
    }
  };

  return (
    <div className="retro-container admin-panel">
      <header className="retro-header">
        <button className="retro-btn" onClick={onClose}>← CLOSE</button>
        <h1>► ADMIN PANEL</h1>
      </header>

      <div className="retro-content">
        <div className="retro-tabs">
          <button 
            className={`retro-tab ${activeTab === 'new' ? 'active' : ''}`}
            onClick={() => setActiveTab('new')}
          >
            📁 NEW COMPANY
          </button>
          <button 
            className={`retro-tab ${activeTab === 'append' ? 'active' : ''}`}
            onClick={() => setActiveTab('append')}
          >
            📄 APPEND GRAPH
          </button>
        </div>

        {message && (
          <div className={`retro-message ${isError ? 'error' : 'success'}`}>
            {message}
          </div>
        )}

        <div className="retro-form">
          {activeTab === 'new' ? (
            <>
              <div className="retro-form-group">
                <label>COMPANY NAME</label>
                <input 
                  type="text" 
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g., TechStart Inc"
                  className="retro-input"
                />
              </div>

              <div className="retro-form-group">
                <label>METADATA CSV FILE</label>
                <div className="retro-file-input">
                  <input 
                    type="file" 
                    accept=".csv"
                    onChange={(e) => handleFileUpload(e, 'csv')}
                    id="csv-upload"
                  />
                  <label htmlFor="csv-upload" className="retro-file-label">
                    {csvContent ? '✓ CSV LOADED' : 'CHOOSE CSV FILE...'}
                  </label>
                </div>
                {csvContent && (
                  <div className="retro-file-preview">
                    <pre>{csvContent.slice(0, 200)}{csvContent.length > 200 ? '...' : ''}</pre>
                  </div>
                )}
              </div>

              <div className="retro-form-group">
                <label>GRAPH HTML FILE (OPTIONAL)</label>
                <div className="retro-file-input">
                  <input 
                    type="file" 
                    accept=".html,.htm"
                    onChange={(e) => handleFileUpload(e, 'html')}
                    id="html-upload"
                  />
                  <label htmlFor="html-upload" className="retro-file-label">
                    {htmlContent ? '✓ HTML LOADED' : 'CHOOSE HTML FILE...'}
                  </label>
                </div>
                {htmlContent && (
                  <>
                    <input 
                      type="text" 
                      value={htmlFilename}
                      onChange={(e) => setHtmlFilename(e.target.value)}
                      placeholder="graph.html"
                      className="retro-input retro-filename-input"
                    />
                  </>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="retro-form-group">
                <label>SELECT COMPANY</label>
                <select 
                  value={selectedCompany}
                  onChange={(e) => setSelectedCompany(e.target.value)}
                  className="retro-select"
                >
                  <option value="">-- SELECT COMPANY --</option>
                  {companies.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="retro-form-group">
                <label>GRAPH HTML FILE</label>
                <div className="retro-file-input">
                  <input 
                    type="file" 
                    accept=".html,.htm"
                    onChange={(e) => handleFileUpload(e, 'html')}
                    id="html-append-upload"
                  />
                  <label htmlFor="html-append-upload" className="retro-file-label">
                    {htmlContent ? '✓ HTML LOADED' : 'CHOOSE HTML FILE...'}
                  </label>
                </div>
                {htmlContent && (
                  <input 
                    type="text" 
                    value={htmlFilename}
                    onChange={(e) => setHtmlFilename(e.target.value)}
                    placeholder="new-graph.html"
                    className="retro-input retro-filename-input"
                  />
                )}
              </div>

              {selectedCompany && (
                <div className="retro-existing-sectors">
                  <label>EXISTING SECTORS:</label>
                  <ul>
                    {companies.find(c => c.id === selectedCompany)?.sectors.map((s, i) => (
                      <li key={i}>{s.name} ({s.htmlFile.split('/').pop()})</li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}

          <button className="retro-btn retro-submit" onClick={handleSubmit}>
            {activeTab === 'new' ? '✓ CREATE COMPANY' : '✓ APPEND GRAPH'}
          </button>
        </div>
      </div>

      <footer className="retro-footer">
        <span>ADMIN MODE</span>
        <span>BE CAREFUL!</span>
      </footer>
    </div>
  );
}

// Views
function CompanyList({ onSelect, onAdmin }: { onSelect: (c: Company) => void; onAdmin: () => void }) {
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
        <div className="retro-header-actions">
          <button className="retro-btn admin-btn" onClick={onAdmin}>⚙ ADMIN</button>
          <span className="retro-blink">_</span>
        </div>
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
  const [view, setView] = useState<'list' | 'company' | 'sector' | 'admin'>('list');
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [selectedSector, setSelectedSector] = useState<Sector | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);

  const refreshCompanies = () => {
    loadCompanies().then(setCompanies);
  };

  useEffect(() => {
    refreshCompanies();
  }, []);

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
    } else if (view === 'company' || view === 'admin') {
      setSelectedCompany(null);
      setView('list');
    }
  };

  return (
    <div className="retro-app">
      {view === 'list' && (
        <CompanyList 
          onSelect={selectCompany}
          onAdmin={() => setView('admin')}
        />
      )}
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
      {view === 'admin' && (
        <AdminPanel 
          onClose={goBack}
          companies={companies}
          onRefresh={refreshCompanies}
        />
      )}
    </div>
  );
}

export default App;
