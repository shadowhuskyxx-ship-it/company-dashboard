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
  Calendar,
  Search,
  Plus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import './index.css';

// Types
interface Company {
  name: string;
  description: string;
  foundedYear: number;
  employeeCount: number;
  employeeCagr: number;
  growthScore: number;
  sector: string;
}

interface Graph {
  filename: string;
  sector: string;
  content: string;
}

// Parse company CSV - extract unique sectors from 'sector' column
function parseSectorsFromCSV(csv: string): string[] {
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

function parseCompanies(csv: string): Company[] {
  const lines = csv.trim().split('\n');
  if (lines.length < 2) return [];
  
  const headers = lines[0].split(',');
  const nameIdx = headers.indexOf('company_name');
  const descIdx = headers.indexOf('description');
  const yearIdx = headers.indexOf('founded_year');
  const empIdx = headers.indexOf('employee_count');
  const cagrIdx = headers.indexOf('employee_cagr');
  const growthIdx = headers.indexOf('growth_score');
  const sectorIdx = headers.indexOf('sector');
  
  const companies: Company[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    if (cols.length >= 7) {
      companies.push({
        name: cols[nameIdx],
        description: cols[descIdx],
        foundedYear: parseInt(cols[yearIdx]) || 0,
        employeeCount: parseInt(cols[empIdx]) || 0,
        employeeCagr: parseFloat(cols[cagrIdx]) || 0,
        growthScore: parseFloat(cols[growthIdx]) || 0,
        sector: cols[sectorIdx]
      });
    }
  }
  return companies;
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
  const [sectors, setSectors] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [loading, setLoading] = useState(false);

  // Parse sectors when CSV is loaded
  useEffect(() => {
    if (csvContent) {
      const parsedSectors = parseSectorsFromCSV(csvContent);
      setSectors(parsedSectors);
    }
  }, [csvContent]);

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setCsvFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setCsvContent(content);
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
        throw new Error('Please upload a company CSV file');
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
        setMessage(`Uploaded successfully`);
        setCsvContent('');
        setCsvFile(null);
        setHtmlFiles([]);
        setSectors([]);
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
              Upload Company CSV
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
                  {csvFile ? csvFile.name : 'Click to upload company CSV'}
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Required columns: company_name, description, founded_year, employee_count, employee_cagr, growth_score, <strong>sector</strong>
                </p>
              </label>
            </div>

            {sectors.length > 0 && (
              <div className="bg-muted p-4 rounded-lg">
                <p className="text-sm font-medium mb-2">Sectors found in CSV:</p>
                <div className="flex flex-wrap gap-2">
                  {sectors.map(s => (
                    <Badge key={s} variant="secondary">{s}</Badge>
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
                Upload Sector Graphs (Optional)
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

              {htmlFiles.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Assign each graph to a sector:</p>
                  {htmlFiles.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                      <span className="flex-1 text-sm truncate">{item.file.name}</span>
                      <select
                        value={item.sector}
                        onChange={(e) => updateHtmlSector(idx, e.target.value)}
                        className="px-3 py-1.5 rounded border bg-background text-sm"
                      >
                        <option value="">Select sector...</option>
                        {sectors.map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                      <Button variant="ghost" size="sm" onClick={() => removeHtmlFile(idx)}>
                        <X className="h-4 w-4" />
                      </Button>
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

// Empty State
function EmptyState({ onUpload }: { onUpload: () => void }) {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="text-center max-w-md">
        <Building2 className="h-16 w-16 mx-auto mb-6 text-muted-foreground" />
        <h1 className="text-2xl font-semibold mb-2">No Companies Yet</h1>
        <p className="text-muted-foreground mb-6">
          Upload your company data and sector graphs to get started.
        </p>
        <Button size="lg" onClick={onUpload}>
          <Upload className="h-5 w-5 mr-2" />
          Upload Data
        </Button>
      </div>
    </div>
  );
}

// Company List
function CompanyList({ companies, onSelect, onUpload }: { 
  companies: Company[];
  onSelect: (c: Company) => void;
  onUpload: () => void;
}) {
  const [search, setSearch] = useState('');

  const filtered = companies.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.sector.toLowerCase().includes(search.toLowerCase())
  );

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
            Upload
          </Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6">
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search companies or sectors..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="divide-y border rounded-lg">
          {filtered.map((company) => (
            <div 
              key={company.name}
              className="flex items-center justify-between p-4 hover:bg-muted/50 cursor-pointer transition-colors"
              onClick={() => onSelect(company)}
            >
              <div>
                <h3 className="font-medium">{company.name}</h3>
                <p className="text-sm text-muted-foreground">{company.sector}</p>
              </div>
              <div className="flex items-center gap-4">
                <Badge variant="secondary">{company.employeeCount} employees</Badge>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            No companies found
          </div>
        )}

        <div className="mt-4 text-sm text-muted-foreground text-center">
          {companies.length} companies
        </div>
      </main>
    </div>
  );
}

// Company Detail
function CompanyDetail({ company, onBack }: { 
  company: Company;
  onBack: () => void;
}) {
  const [graphs, setGraphs] = useState<Graph[]>([]);

  useEffect(() => {
    fetch('/api/graphs')
      .then(r => r.json())
      .then((data: Graph[]) => {
        setGraphs(data.filter(g => g.sector === company.sector));
      });
  }, [company]);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold">{company.name}</h1>
            <p className="text-sm text-muted-foreground">{company.sector}</p>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6 space-y-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">{company.description}</p>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
              <div className="p-4 bg-muted rounded-lg">
                <Calendar className="h-5 w-5 mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Founded</p>
                <p className="text-lg font-semibold">{company.foundedYear}</p>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <Users className="h-5 w-5 mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Employees</p>
                <p className="text-lg font-semibold">{company.employeeCount}</p>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <TrendingUp className="h-5 w-5 mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Growth Score</p>
                <p className="text-lg font-semibold">{(company.growthScore * 100).toFixed(1)}%</p>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <BarChart3 className="h-5 w-5 mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Employee CAGR</p>
                <p className="text-lg font-semibold">{company.employeeCagr.toFixed(1)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {graphs.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Sector Analysis: {company.sector}</h2>
            {graphs.map((graph, idx) => (
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
  const [view, setView] = useState<'empty' | 'list' | 'detail' | 'upload'>('empty');
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const response = await fetch('/data/companies.csv');
      if (response.ok) {
        const csv = await response.text();
        const parsed = parseCompanies(csv);
        setCompanies(parsed);
        setView(parsed.length > 0 ? 'list' : 'empty');
      } else {
        setView('empty');
      }
    } catch (e) {
      setView('empty');
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
      {view === 'empty' && (
        <EmptyState onUpload={() => setView('upload')} />
      )}
      {view === 'list' && (
        <CompanyList 
          companies={companies}
          onSelect={(c) => { setSelectedCompany(c); setView('detail'); }}
          onUpload={() => setView('upload')}
        />
      )}
      {view === 'detail' && selectedCompany && (
        <CompanyDetail 
          company={selectedCompany}
          onBack={() => setView('list')}
        />
      )}
      {view === 'upload' && (
        <AdminPanel 
          onClose={() => setView(companies.length > 0 ? 'list' : 'empty')}
          onRefresh={() => {
            loadData();
          }}
        />
      )}
    </>
  );
}

export default App;
