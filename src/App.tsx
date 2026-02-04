import { useState, useEffect } from 'react';
import { 
  Building2, 
  ChevronRight, 
  ArrowLeft,
  Upload,
  X,
  FileText,
  Eye
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
  thematicSectors: ThematicSector[];
  graphs: Graph[];
}

interface ThematicSector {
  name: string;
  description: string;
  companyCount: number;
  medianGrowthScore: number;
  medianEmployeeCagr: number;
  graphs: Graph[];
}

interface Graph {
  filename: string;
  content: string;
}

/*
function parseCompaniesFromCSV(csv: string, companyNameOverride?: string): Company[] {
  const lines = csv.trim().split('\n');
  if (lines.length < 2) return [];
  
  const headers = lines[0].split(',');
  const companyIdx = headers.indexOf('company_name');
  const sectorIdx = headers.indexOf('sector');
  const sectorDescIdx = headers.indexOf('sector_description');
  const thematicIdx = headers.indexOf('thematic_sector');
  const thematicDescIdx = headers.indexOf('thematic_sector_description');
  const countIdx = headers.indexOf('company_count');
  const growthIdx = headers.indexOf('median_growth_score');
  const cagrIdx = headers.indexOf('median_employee_cagr');
  
  const companyMap = new Map<string, Map<string, Sector>>();
  
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    if (cols.length < 5) continue;
    
    const companyName = companyNameOverride || cols[companyIdx];
    const sectorName = cols[sectorIdx];
    const thematicName = cols[thematicIdx];
    
    if (!companyMap.has(companyName)) {
      companyMap.set(companyName, new Map());
    }
    
    const sectorMap = companyMap.get(companyName)!;
    
    if (!sectorMap.has(sectorName)) {
      sectorMap.set(sectorName, {
        name: sectorName,
        description: cols[sectorDescIdx] || '',
        companyCount: 0,
        medianGrowthScore: 0,
        medianEmployeeCagr: 0,
        thematicSectors: [],
        graphs: []
      });
    }
    
    const sector = sectorMap.get(sectorName)!;
    
    // Add thematic sector
    sector.thematicSectors.push({
      name: thematicName,
      description: cols[thematicDescIdx] || '',
      companyCount: parseInt(cols[countIdx]) || 0,
      medianGrowthScore: parseFloat(cols[growthIdx]) || 0,
      medianEmployeeCagr: parseFloat(cols[cagrIdx]) || 0,
      graphs: []
    });
  }
  
  return Array.from(companyMap.entries()).map(([name, sectorMap]) => ({
    name,
    sectors: Array.from(sectorMap.values())
  }));
}
*/

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

// Parse unique sectors from CSV (for dropdown)
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

// Parse unique thematic sectors from CSV (for dropdown)
function parseUniqueThematicSectors(csv: string): string[] {
  const lines = csv.trim().split('\n');
  if (lines.length < 2) return [];
  
  const headers = lines[0].split(',');
  const thematicIdx = headers.indexOf('thematic_sector');
  
  if (thematicIdx === -1) return [];
  
  const thematics = new Set<string>();
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    if (cols[thematicIdx]) {
      thematics.add(cols[thematicIdx]);
    }
  }
  return Array.from(thematics).sort();
}

// Admin Panel
function AdminPanel({ onClose, onRefresh, existingCompanies }: {
  onClose: () => void;
  onRefresh: () => void;
  existingCompanies: Company[];
}) {
  const [mode, setMode] = useState<'new' | 'add-graphs'>('new');
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [companyName, setCompanyName] = useState('');
  const [csvContent, setCsvContent] = useState('');
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [htmlFiles, setHtmlFiles] = useState<{file: File, type: 'sector' | 'thematic', target: string}[]>([]);
  const [sectors, setSectors] = useState<string[]>([]);
  const [thematicSectors, setThematicSectors] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (csvContent) {
      setSectors(parseUniqueSectors(csvContent));
      setThematicSectors(parseUniqueThematicSectors(csvContent));
    }
  }, [csvContent]);

  useEffect(() => {
    if (selectedCompany) {
      setCompanyName(selectedCompany.name);
      const allSectors = selectedCompany.sectors.map(s => s.name);
      const allThematics = selectedCompany.sectors.flatMap(s => s.thematicSectors.map(t => t.name));
      setSectors(allSectors);
      setThematicSectors([...new Set(allThematics)]);
    }
  }, [selectedCompany]);

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setCsvFile(file);
    
    // Auto-fill company name from filename if not already set
    if (!companyName) {
      const fileNameWithoutExt = file.name.replace(/\.csv$/i, '').replace(/[-_]/g, ' ');
      setCompanyName(fileNameWithoutExt);
    }
    
    const reader = new FileReader();
    reader.onload = (event) => {
      setCsvContent(event.target?.result as string);
    };
    reader.readAsText(file);
  };

  const handleHtmlUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newFiles = files.map(file => ({ file, type: 'sector' as const, target: '' }));
    setHtmlFiles([...htmlFiles, ...newFiles]);
  };

  const updateHtmlTarget = (index: number, type: 'sector' | 'thematic', target: string) => {
    const updated = [...htmlFiles];
    updated[index].type = type;
    updated[index].target = target;
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
      if (mode === 'new' && !csvContent) {
        throw new Error('Please upload a CSV file');
      }
      if (mode === 'add-graphs' && !selectedCompany) {
        throw new Error('Please select a company');
      }
      if (htmlFiles.length === 0) {
        throw new Error('Please upload at least one HTML file');
      }

      const htmlData = await Promise.all(
        htmlFiles.map(async ({ file, type, target }) => ({
          filename: file.name,
          type,
          target,
          content: await file.text()
        }))
      );

      const response = await fetch('/api/admin/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          csvContent: mode === 'new' ? csvContent : null,
          companyName,
          htmlFiles: htmlData
        })
      });

      if (response.ok) {
        setMessage(mode === 'new' ? 'Upload successful' : 'Graphs added successfully');
        setCsvContent('');
        setCsvFile(null);
        setCompanyName('');
        setHtmlFiles([]);
        setSelectedCompany(null);
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
        {/* Mode Selector */}
        <div className="flex gap-2 p-1 bg-muted rounded-lg">
          <button
            onClick={() => setMode('new')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
              mode === 'new'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            New Company
          </button>
          <button
            onClick={() => setMode('add-graphs')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
              mode === 'add-graphs'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Add Graphs to Existing
          </button>
        </div>

        {/* Step 1: Company Selection */}
        {mode === 'new' ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-sm">1</span>
                Company Details & CSV
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Company Name</label>
                <Input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Enter company name..."
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Auto-filled from filename. Edit if needed.
                </p>
              </div>

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
                    Columns: company_name, sector, thematic_sector, descriptions, company_count, median_growth_score, median_employee_cagr
                  </p>
                </label>
              </div>

              {sectors.length > 0 && (
                <div className="bg-muted p-4 rounded-lg">
                  <p className="text-sm font-medium mb-2">Sectors found: {sectors.length}</p>
                  <p className="text-sm font-medium mb-2">Thematic sectors found: {thematicSectors.length}</p>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-sm">1</span>
                Select Company
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {existingCompanies.length === 0 ? (
                <p className="text-muted-foreground">No companies exist yet. Create one first.</p>
              ) : (
                <>
                  <select
                    value={selectedCompany?.name || ''}
                    onChange={(e) => {
                      const company = existingCompanies.find(c => c.name === e.target.value);
                      setSelectedCompany(company || null);
                    }}
                    className="w-full px-3 py-2 rounded-md border bg-background"
                  >
                    <option value="">Select a company...</option>
                    {existingCompanies.map(c => (
                      <option key={c.name} value={c.name}>{c.name}</option>
                    ))}
                  </select>

                  {selectedCompany && (
                    <div className="bg-muted p-4 rounded-lg">
                      <p className="text-sm font-medium mb-2">Available sectors: {sectors.length}</p>
                      <p className="text-sm font-medium">Available thematic sectors: {thematicSectors.length}</p>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Step 2: HTML Graphs */}
        {(mode === 'add-graphs' ? selectedCompany : csvContent) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-sm">2</span>
                {mode === 'new' ? 'Upload Graphs (Optional)' : 'Upload Graphs'}
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
                  <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm">Add HTML graph files</p>
                </label>
              </div>

              {htmlFiles.length > 0 && (
                <div className="space-y-3">
                  <p className="text-sm font-medium">Assign each graph to sector or thematic sector:</p>
                  {htmlFiles.map((item, idx) => (
                    <div key={idx} className="p-3 bg-muted rounded-lg space-y-2">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="flex-1 text-sm truncate font-medium">{item.file.name}</span>
                        <Button variant="ghost" size="sm" onClick={() => removeHtmlFile(idx)}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex gap-2">
                        <select
                          value={item.type}
                          onChange={(e) => updateHtmlTarget(idx, e.target.value as 'sector' | 'thematic', '')}
                          className="px-3 py-1.5 rounded border bg-background text-sm"
                        >
                          <option value="sector">Sector</option>
                          <option value="thematic">Thematic Sector</option>
                        </select>
                        <select
                          value={item.target}
                          onChange={(e) => updateHtmlTarget(idx, item.type, e.target.value)}
                          className="flex-1 px-3 py-1.5 rounded border bg-background text-sm"
                        >
                          <option value="">Select {item.type}...</option>
                          {(item.type === 'sector' ? sectors : thematicSectors).map(s => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </div>
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
          disabled={loading || (mode === 'new' ? !csvContent : !selectedCompany) || htmlFiles.length === 0}
        >
          {loading ? (mode === 'new' ? 'Uploading...' : 'Adding Graphs...') : (mode === 'new' ? 'Upload' : 'Add Graphs')}
        </Button>
      </main>
    </div>
  );
}

// Open graph in new tab
function openGraphInNewTab(filename: string) {
  const safeName = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
  window.open(`/data/graphs/${safeName}`, '_blank');
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
              className="flex items-center justify-between p-3 sm:p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer transition-all duration-200 rounded-lg group"
              onClick={() => onSelect(company)}
            >
              <div className="min-w-0 flex-1 mr-3">
                <h3 className="font-medium text-sm sm:text-base truncate group-hover:text-accent-foreground">{company.name}</h3>
                <p className="text-xs sm:text-sm text-muted-foreground group-hover:text-accent-foreground/70">{company.sectors.length} sectors</p>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0 group-hover:text-accent-foreground transition-transform group-hover:translate-x-1" />
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
function SectorList({ company, onBack, onSelectSector }: { 
  company: Company;
  onBack: () => void;
  onSelectSector: (s: Sector) => void;
}) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b px-3 sm:px-6 py-3 sm:py-4">
        <div className="max-w-6xl mx-auto flex items-center gap-2 sm:gap-4">
          <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8 sm:h-10 sm:w-10">
            <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
          </Button>
          <div className="min-w-0">
            <h1 className="text-base sm:text-xl font-semibold truncate">{company.name}</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">{company.sectors.length} sectors</p>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-3 sm:p-6 space-y-3 sm:space-y-4">
        {company.sectors.map((sector) => (
          <Card key={sector.name}>
            <CardHeader className="pb-3 sm:pb-6">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-4">
                <div className="flex-1 min-w-0 cursor-pointer group/sector" onClick={() => onSelectSector(sector)}>
                  <CardTitle className="text-base sm:text-lg cursor-pointer hover:text-primary transition-colors line-clamp-2 group-hover/sector:text-primary">{sector.name}</CardTitle>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1 line-clamp-2">{sector.description}</p>
                </div>
                <Badge variant="secondary" className="self-start sm:self-auto text-xs whitespace-nowrap">
                  {sector.thematicSectors.length} thematic
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-4">
                <div className="flex sm:block items-center justify-between sm:justify-start">
                  <p className="text-xs sm:text-sm text-muted-foreground">Companies</p>
                  <p className="font-semibold text-sm sm:text-base">{sector.thematicSectors.reduce((a, t) => a + t.companyCount, 0)}</p>
                </div>
                <div className="flex sm:block items-center justify-between sm:justify-start">
                  <p className="text-xs sm:text-sm text-muted-foreground">Avg Growth</p>
                  <p className="font-semibold text-sm sm:text-base">{(sector.thematicSectors.reduce((a, t) => a + t.medianGrowthScore, 0) / sector.thematicSectors.length * 100).toFixed(1)}%</p>
                </div>
                <div className="flex sm:block items-center justify-between sm:justify-start">
                  <p className="text-xs sm:text-sm text-muted-foreground">Avg CAGR</p>
                  <p className="font-semibold text-sm sm:text-base">{(sector.thematicSectors.reduce((a, t) => a + t.medianEmployeeCagr, 0) / sector.thematicSectors.length).toFixed(1)}%</p>
                </div>
              </div>
              
              {sector.graphs.length > 0 && (
                <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t">
                  <p className="text-xs sm:text-sm font-medium mb-2 sm:mb-3 text-muted-foreground">Graphs:</p>
                  <div className="flex flex-wrap gap-2">
                    {sector.graphs.map((graph, idx) => (
                      <Button
                        key={idx}
                        variant="secondary"
                        size="sm"
                        onClick={() => openGraphInNewTab(graph.filename)}
                        className="rounded-full px-3 sm:px-4 text-xs sm:text-sm cursor-pointer hover:bg-primary hover:text-primary-foreground transition-all duration-200 hover:shadow-md"
                      >
                        <Eye className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                        <span className="truncate max-w-[150px] sm:max-w-[200px]">{graph.filename}</span>
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </main>
    </div>
  );
}

// Thematic Sector List (for a sector)
function ThematicList({ sector, onBack }: { 
  sector: Sector;
  onBack: () => void;
}) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b px-3 sm:px-6 py-3 sm:py-4">
        <div className="max-w-6xl mx-auto flex items-center gap-2 sm:gap-4">
          <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8 sm:h-10 sm:w-10">
            <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
          </Button>
          <div className="min-w-0">
            <h1 className="text-base sm:text-xl font-semibold truncate">{sector.name}</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">{sector.thematicSectors.length} thematic</p>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-3 sm:p-6 space-y-3 sm:space-y-4">
        {sector.thematicSectors.map((thematic) => (
          <Card key={thematic.name}>
            <CardHeader className="pb-3 sm:pb-6">
              <div className="min-w-0">
                <CardTitle className="text-base sm:text-lg line-clamp-2">{thematic.name}</CardTitle>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1 line-clamp-2">{thematic.description}</p>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-4">
                <div className="flex sm:block items-center justify-between sm:justify-start">
                  <p className="text-xs sm:text-sm text-muted-foreground">Companies</p>
                  <p className="font-semibold text-sm sm:text-base">{thematic.companyCount}</p>
                </div>
                <div className="flex sm:block items-center justify-between sm:justify-start">
                  <p className="text-xs sm:text-sm text-muted-foreground">Growth</p>
                  <p className="font-semibold text-sm sm:text-base">{(thematic.medianGrowthScore * 100).toFixed(1)}%</p>
                </div>
                <div className="flex sm:block items-center justify-between sm:justify-start">
                  <p className="text-xs sm:text-sm text-muted-foreground">CAGR</p>
                  <p className="font-semibold text-sm sm:text-base">{thematic.medianEmployeeCagr.toFixed(1)}%</p>
                </div>
              </div>
              
              {thematic.graphs.length > 0 && (
                <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t">
                  <p className="text-xs sm:text-sm font-medium mb-2 sm:mb-3 text-muted-foreground">Graphs:</p>
                  <div className="flex flex-wrap gap-2">
                    {thematic.graphs.map((graph, idx) => (
                      <Button
                        key={idx}
                        variant="secondary"
                        size="sm"
                        onClick={() => openGraphInNewTab(graph.filename)}
                        className="rounded-full px-3 sm:px-4 text-xs sm:text-sm cursor-pointer hover:bg-primary hover:text-primary-foreground transition-all duration-200 hover:shadow-md"
                      >
                        <Eye className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                        <span className="truncate max-w-[150px] sm:max-w-[200px]">{graph.filename}</span>
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </main>
    </div>
  );
}

// Main App
function App() {
  const [view, setView] = useState<'list' | 'sectors' | 'thematics' | 'upload'>('list');
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
          onSelectSector={(s) => { setSelectedSector(s); setView('thematics'); }}
        />
      )}
      {view === 'thematics' && selectedSector && (
        <ThematicList 
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
          existingCompanies={companies}
        />
      )}
    </>
  );
}

export default App;
