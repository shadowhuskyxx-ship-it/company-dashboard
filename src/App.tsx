import { useState, useEffect } from 'react';
import { 
  Building2, 
  ChevronRight, 
  ArrowLeft,
  Upload,
  X,
  BarChart3,
  TrendingUp,
  Users,
  Plus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import './index.css';

// Types
interface Company {
  name: string;
  sectors: Sector[];
}

interface Sector {
  name: string;
  description: string;
  companyCount: number;
  medianGrowthScore: number;
  medianEmployeeCagr: number;
  parentCompany: string;
  graphs: Graph[];
}

interface Graph {
  filename: string;
  content: string;
}

// Parse unique companies from CSV (for dropdown)
function parseUniqueCompanies(csv: string): string[] {
  const lines = csv.trim().split('\n');
  if (lines.length < 2) return [];
  
  const headers = lines[0].split(',');
  const companyIdx = headers.indexOf('company_name');
  
  const companies = new Set<string>();
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    if (cols[companyIdx]) {
      companies.add(cols[companyIdx]);
    }
  }
  return Array.from(companies).sort();
}

// Parse unique sectors from CSV (the sector column, not thematic_sector)
function parseUniqueSectors(csv: string): string[] {
  const lines = csv.trim().split('\n');
  if (lines.length < 2) return [];
  
  const headers = lines[0].split(',');
  const sectorIdx = headers.indexOf('sector');
  
  if (sectorIdx === -1) return [];
  
  const sectors = new Set<string>();
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    if (cols[sectorIdx]) {
      sectors.add(cols[sectorIdx]);
    }
  }
  return Array.from(sectors).sort();
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
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

// Admin Panel
function AdminPanel({ onClose, onRefresh }: { 
  onClose: () => void;
  onRefresh: () => void;
}) {
  const [csvContent, setCsvContent] = useState('');
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [htmlFiles, setHtmlFiles] = useState<{file: File, sector: string}[]>([]);
  const [companies, setCompanies] = useState<string[]>([]);
  const [sectors, setSectors] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (csvContent) {
      const parsedCompanies = parseUniqueCompanies(csvContent);
      const parsedSectors = parseUniqueSectors(csvContent);
      setCompanies(parsedCompanies);
      setSectors(parsedSectors);
    }
  }, [csvContent]);

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setCsvFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      setCsvContent(event.target?.result as string);
    };
    reader.readAsText(file);
  };

  const handleHtmlUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newFiles = files.map(file => ({ file, sector: '' }));
    setHtmlFiles([...htmlFiles, ...newFiles]);
  };

  const updateHtmlSector = (index: number, sector: string) => {
    const updated = [...htmlFiles];
    updated[index].sector = sector;
    setHtmlFiles(updated);
  };

  const removeHtmlFile = (index: number) => {
    setHtmlFiles(htmlFiles.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    setMessage('');
    setIsError(false);
    setLoading(true);

    try {
      if (!csvContent) {
        throw new Error('Please upload a CSV file');
      }

      const htmlData = await Promise.all(
        htmlFiles.map(async ({ file, sector }) => ({
          filename: file.name,
          sector,
          content: await file.text()
        }))
      );

      const response = await fetch('/api/admin/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          csvContent,
          htmlFiles: htmlData
        })
      });
      
      if (response.ok) {
        setMessage('Upload successful');
        setCsvContent('');
        setCsvFile(null);
        setHtmlFiles([]);
        setCompanies([]);
        onRefresh();
      } else {
        throw new Error(await response.text());
      }
    } catch (error: any) {
      setMessage(error.message);
      setIsError(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onClose}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-semibold">Upload Data</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Step 1: CSV */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-sm">1</span>
              Upload CSV
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:bg-muted/50 transition-colors cursor-pointer">
              <input 
                type="file" 
                accept=".csv"
                onChange={handleCsvUpload}
                className="hidden"
                id="csv-upload"
              />
              <label htmlFor="csv-upload" className="cursor-pointer">
                <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                <p className="font-medium">
                  {csvFile ? csvFile.name : 'Click to upload CSV'}
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Columns: company_name, thematic_sector, thematic_sector_description, company_count, median_growth_score, median_employee_cagr
                </p>
              </label>
            </div>

            {companies.length > 0 && (
              <div className="bg-muted p-4 rounded-lg">
                <p className="text-sm font-medium mb-2">Companies found:</p>
                <div className="flex flex-wrap gap-2">
                  {companies.map(c => (
                    <Badge key={c} variant="secondary">{c}</Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Step 2: HTML Graphs */}
        {csvContent && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-sm">2</span>
                Upload Graphs (Optional)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:bg-muted/50 transition-colors cursor-pointer">
                <input 
                  type="file" 
                  accept=".html,.htm"
                  onChange={handleHtmlUpload}
                  className="hidden"
                  id="html-upload"
                  multiple
                />
                <label htmlFor="html-upload" className="cursor-pointer">
                  <Plus className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm">Add HTML graph files</p>
                </label>
              </div>

              {sectors.length > 0 && (
                <div className="bg-muted p-4 rounded-lg">
                  <p className="text-sm font-medium mb-2">Sectors found (from 'sector' column):</p>
                  <div className="flex flex-wrap gap-2">
                    {sectors.map(s => (
                      <Badge key={s} variant="outline">{s}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {htmlFiles.length > 0 && (
                <div className="space-y-3">
                  <p className="text-sm font-medium">Assign each graph to a sector:</p>
                  {htmlFiles.map((item, idx) => (
                    <div key={idx} className="p-3 bg-muted rounded-lg space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="flex-1 text-sm truncate font-medium">{item.file.name}</span>
                        <Button variant="ghost" size="sm" onClick={() => removeHtmlFile(idx)}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <select
                        value={item.sector}
                        onChange={(e) => updateHtmlSector(idx, e.target.value)}
                        className="w-full px-3 py-1.5 rounded border bg-background text-sm"
                      >
                        <option value="">Select sector...</option>
                        {sectors.map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {message && (
          <div className={`p-4 rounded-lg ${isError ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
            {message}
          </div>
        )}

        <Button 
          className="w-full" 
          size="lg" 
          onClick={handleSubmit} 
          disabled={loading || !csvContent}
        >
          {loading ? 'Uploading...' : 'Upload'}
        </Button>
      </main>
    </div>
  );
}

// Company List (Index Page)
function CompanyList({ companies, onSelect, onUpload }: { 
  companies: Company[];
  onSelect: (c: Company) => void;
  onUpload: () => void;
}) {
  if (companies.length === 0) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <div className="text-center max-w-md">
          <Building2 className="h-16 w-16 mx-auto mb-6 text-muted-foreground" />
          <h1 className="text-2xl font-semibold mb-2">No Companies Yet</h1>
          <p className="text-muted-foreground mb-6">
            Upload your company data to get started.
          </p>
          <Button size="lg" onClick={onUpload}>
            <Upload className="h-5 w-5 mr-2" />
            Upload Data
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Building2 className="h-6 w-6" />
            <h1 className="text-xl font-semibold">Companies</h1>
          </div>
          <Button variant="outline" size="sm" onClick={onUpload}>
            <Upload className="h-4 w-4 mr-2" />
            Upload More
          </Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6">
        <div className="divide-y border rounded-lg">
          {companies.map((company) => (
            <div 
              key={company.name}
              className="flex items-center justify-between p-4 hover:bg-muted/50 cursor-pointer transition-colors"
              onClick={() => onSelect(company)}
            >
              <div>
                <h3 className="font-medium">{company.name}</h3>
                <p className="text-sm text-muted-foreground">{company.sectors.length} sectors</p>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </div>
          ))}
        </div>

        <div className="mt-4 text-sm text-muted-foreground text-center">
          {companies.length} companies
        </div>
      </main>
    </div>
  );
}

// Sector List (for a company)
function SectorList({ company, onBack, onSelect }: { 
  company: Company;
  onBack: () => void;
  onSelect: (s: Sector) => void;
}) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold">{company.name}</h1>
            <p className="text-sm text-muted-foreground">{company.sectors.length} sectors</p>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6 space-y-4">
        {company.sectors.map((sector) => (
          <Card 
            key={sector.name}
            className="cursor-pointer hover:border-primary transition-colors"
            onClick={() => onSelect(sector)}
          >
            <CardHeader>
              <div className="flex items-start justify-between">
                <CardTitle className="text-lg">{sector.name}</CardTitle>
                <Badge variant="secondary">{sector.companyCount} companies</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground line-clamp-2">{sector.description}</p>
              <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Growth Score</p>
                  <p className="font-medium">{(sector.medianGrowthScore * 100).toFixed(1)}%</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Employee CAGR</p>
                  <p className="font-medium">{sector.medianEmployeeCagr.toFixed(1)}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </main>
    </div>
  );
}

// Sector Detail with Graphs
function SectorDetail({ sector, onBack }: { 
  sector: Sector;
  onBack: () => void;
}) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold">{sector.name}</h1>
            <p className="text-sm text-muted-foreground">{sector.parentCompany}</p>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6 space-y-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">{sector.description}</p>
            <div className="grid grid-cols-3 gap-4 mt-6">
              <div className="p-4 bg-muted rounded-lg">
                <Users className="h-5 w-5 mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Companies</p>
                <p className="text-2xl font-semibold">{sector.companyCount}</p>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <TrendingUp className="h-5 w-5 mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Growth Score</p>
                <p className="text-2xl font-semibold">{(sector.medianGrowthScore * 100).toFixed(1)}%</p>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <BarChart3 className="h-5 w-5 mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Employee CAGR</p>
                <p className="text-2xl font-semibold">{sector.medianEmployeeCagr.toFixed(1)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {sector.graphs.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Analysis Graphs</h2>
            {sector.graphs.map((graph, idx) => (
              <Card key={idx}>
                <CardHeader>
                  <CardTitle className="text-base">{graph.filename}</CardTitle>
                </CardHeader>
                <CardContent>
                  <iframe 
                    srcDoc={graph.content}
                    className="w-full h-96 border-0 rounded bg-white"
                    title={graph.filename}
                  />
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

// Main App
function App() {
  const [view, setView] = useState<'list' | 'sectors' | 'detail' | 'upload'>('list');
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [selectedSector, setSelectedSector] = useState<Sector | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const response = await fetch('/api/data');
      if (response.ok) {
        const data = await response.json();
        setCompanies(data.companies || []);
      }
    } catch (e) {
      console.error('Failed to load:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <>
      {view === 'list' && (
        <CompanyList 
          companies={companies}
          onSelect={(c) => { setSelectedCompany(c); setView('sectors'); }}
          onUpload={() => setView('upload')}
        />
      )}
      {view === 'sectors' && selectedCompany && (
        <SectorList 
          company={selectedCompany}
          onBack={() => setView('list')}
          onSelect={(s) => { setSelectedSector(s); setView('detail'); }}
        />
      )}
      {view === 'detail' && selectedSector && (
        <SectorDetail 
          sector={selectedSector}
          onBack={() => setView('sectors')}
        />
      )}
      {view === 'upload' && (
        <AdminPanel 
          onClose={() => setView('list')}
          onRefresh={() => {
            loadData();
            setView('list');
          }}
        />
      )}
    </>
  );
}

export default App;
