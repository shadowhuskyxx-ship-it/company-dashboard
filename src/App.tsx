import { useState, useEffect } from 'react';
import { 
  Building2, 
  ChevronRight, 
  ArrowLeft,
  Upload,
  Settings,
  X,
  BarChart3,
  TrendingUp,
  Users
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import './index.css';

// Types
interface Sector {
  name: string;
  description: string;
  companyCount: number;
  medianGrowthScore: number;
  medianEmployeeCagr: number;
}

interface ThematicSector {
  name: string;
  description: string;
  companyCount: number;
  medianGrowthScore: number;
  medianEmployeeCagr: number;
  parentSector: string;
}

// Parse CSV
function parseSectors(csv: string): { sectors: Sector[], thematics: ThematicSector[] } {
  const lines = csv.trim().split('\n');
  if (lines.length < 2) return { sectors: [], thematics: [] };
  
  const headers = lines[0].split(',');
  const sectorIdx = headers.indexOf('sector');
  const sectorDescIdx = headers.indexOf('sector_description');
  const sectorCountIdx = headers.indexOf('sector_company_count');
  const sectorGrowthIdx = headers.indexOf('sector_median_growth_score');
  const sectorCagrIdx = headers.indexOf('sector_median_employee_cagr');
  const thematicIdx = headers.indexOf('thematic_sector');
  const thematicDescIdx = headers.indexOf('thematic_sector_description');
  const thematicCountIdx = headers.indexOf('company_count');
  const thematicGrowthIdx = headers.indexOf('median_growth_score');
  const thematicCagrIdx = headers.indexOf('median_employee_cagr');
  
  const sectorMap = new Map<string, Sector>();
  const thematics: ThematicSector[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    if (cols.length < 10) continue;
    
    const sectorName = cols[sectorIdx];
    const thematicName = cols[thematicIdx];
    
    // Add/update sector
    if (!sectorMap.has(sectorName)) {
      sectorMap.set(sectorName, {
        name: sectorName,
        description: cols[sectorDescIdx],
        companyCount: parseInt(cols[sectorCountIdx]) || 0,
        medianGrowthScore: parseFloat(cols[sectorGrowthIdx]) || 0,
        medianEmployeeCagr: parseFloat(cols[sectorCagrIdx]) || 0
      });
    }
    
    // Add thematic sector
    thematics.push({
      name: thematicName,
      description: cols[thematicDescIdx],
      companyCount: parseInt(cols[thematicCountIdx]) || 0,
      medianGrowthScore: parseFloat(cols[thematicGrowthIdx]) || 0,
      medianEmployeeCagr: parseFloat(cols[thematicCagrIdx]) || 0,
      parentSector: sectorName
    });
  }
  
  return { 
    sectors: Array.from(sectorMap.values()), 
    thematics 
  };
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
  const [htmlFiles, setHtmlFiles] = useState<{file: File, sector: string}[]>([]);
  const [sectors, setSectors] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [loading, setLoading] = useState(false);

  // Parse sectors from CSV for dropdown
  useEffect(() => {
    if (csvContent) {
      const { sectors: parsedSectors, thematics } = parseSectors(csvContent);
      const allSectors = [...parsedSectors.map(s => s.name), ...thematics.map(t => t.name)];
      setSectors([...new Set(allSectors)]);
    }
  }, [csvContent]);

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
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

      const response = await fetch('/api/admin/upload-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          csvContent,
          htmlFiles: htmlData
        })
      });
      
      if (response.ok) {
        setMessage('Data uploaded successfully');
        setCsvContent('');
        setHtmlFiles([]);
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
            <X className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-semibold">Admin Panel</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Step 1: Upload Sector Data CSV</CardTitle>
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
                  {csvContent ? 'CSV loaded ✓' : 'Click to upload sector CSV'}
                </p>
              </label>
            </div>
          </CardContent>
        </Card>

        {csvContent && (
          <Card>
            <CardHeader>
              <CardTitle>Step 2: Upload Graph HTML Files (Optional)</CardTitle>
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
                <div className="space-y-2">
                  <p className="text-sm font-medium">Assign to sector/thematic:</p>
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

        <Button className="w-full" size="lg" onClick={handleSubmit} disabled={loading || !csvContent}>
          {loading ? 'Processing...' : 'Upload Data'}
        </Button>
      </main>
    </div>
  );
}

// Sector List
function SectorList({ sectors, onSelect, onAdmin }: { 
  sectors: Sector[];
  onSelect: (s: Sector) => void;
  onAdmin: () => void;
}) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Building2 className="h-6 w-6" />
            <h1 className="text-xl font-semibold">Sectors</h1>
          </div>
          <Button variant="outline" size="sm" onClick={onAdmin}>
            <Settings className="h-4 w-4 mr-2" />
            Admin
          </Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sectors.map((sector) => (
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
                    <p className="text-muted-foreground">Growth</p>
                    <p className="font-medium">{(sector.medianGrowthScore * 100).toFixed(1)}%</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">CAGR</p>
                    <p className="font-medium">{sector.medianEmployeeCagr.toFixed(1)}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}

// Thematic Sectors View
function ThematicList({ sector, thematics, onBack, onSelect }: { 
  sector: Sector;
  thematics: ThematicSector[];
  onBack: () => void;
  onSelect: (t: ThematicSector) => void;
}) {
  const filtered = thematics.filter(t => t.parentSector === sector.name);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold">{sector.name}</h1>
            <p className="text-sm text-muted-foreground">{filtered.length} thematic sectors</p>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6 space-y-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">{sector.description}</p>
            <div className="grid grid-cols-3 gap-4 mt-4">
              <div>
                <p className="text-sm text-muted-foreground">Total Companies</p>
                <p className="text-2xl font-semibold">{sector.companyCount}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Median Growth</p>
                <p className="text-2xl font-semibold">{(sector.medianGrowthScore * 100).toFixed(1)}%</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Median CAGR</p>
                <p className="text-2xl font-semibold">{sector.medianEmployeeCagr.toFixed(1)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4">
          {filtered.map((thematic) => (
            <Card 
              key={thematic.name}
              className="cursor-pointer hover:border-primary transition-colors"
              onClick={() => onSelect(thematic)}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{thematic.name}</CardTitle>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-2">{thematic.description}</p>
                <div className="flex gap-4 mt-4">
                  <Badge variant="secondary">{thematic.companyCount} companies</Badge>
                  <Badge variant="outline">Growth: {(thematic.medianGrowthScore * 100).toFixed(1)}%</Badge>
                  <Badge variant="outline">CAGR: {thematic.medianEmployeeCagr.toFixed(1)}%</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}

// Thematic Detail with Graphs
function ThematicDetail({ thematic, onBack }: { 
  thematic: ThematicSector;
  onBack: () => void;
}) {
  const [graphs, setGraphs] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/graphs')
      .then(r => r.json())
      .then(data => {
        setGraphs(data.filter((g: any) => g.sector === thematic.name));
      });
  }, [thematic]);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold">{thematic.name}</h1>
            <p className="text-sm text-muted-foreground">{thematic.parentSector}</p>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6 space-y-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">{thematic.description}</p>
            <div className="grid grid-cols-3 gap-4 mt-6">
              <div className="p-4 bg-muted rounded-lg">
                <Users className="h-5 w-5 mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Companies</p>
                <p className="text-2xl font-semibold">{thematic.companyCount}</p>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <TrendingUp className="h-5 w-5 mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Growth Score</p>
                <p className="text-2xl font-semibold">{(thematic.medianGrowthScore * 100).toFixed(1)}%</p>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <BarChart3 className="h-5 w-5 mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Employee CAGR</p>
                <p className="text-2xl font-semibold">{thematic.medianEmployeeCagr.toFixed(1)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {graphs.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Analysis Graphs</h2>
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
  const [view, setView] = useState<'list' | 'thematic' | 'detail' | 'admin'>('list');
  const [selectedSector, setSelectedSector] = useState<Sector | null>(null);
  const [selectedThematic, setSelectedThematic] = useState<ThematicSector | null>(null);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [thematics, setThematics] = useState<ThematicSector[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const response = await fetch('/data/sectors.csv');
      if (response.ok) {
        const csv = await response.text();
        const { sectors: parsedSectors, thematics: parsedThematics } = parseSectors(csv);
        setSectors(parsedSectors);
        setThematics(parsedThematics);
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
        <SectorList 
          sectors={sectors}
          onSelect={(s) => { setSelectedSector(s); setView('thematic'); }}
          onAdmin={() => setView('admin')}
        />
      )}
      {view === 'thematic' && selectedSector && (
        <ThematicList 
          sector={selectedSector}
          thematics={thematics}
          onBack={() => setView('list')}
          onSelect={(t) => { setSelectedThematic(t); setView('detail'); }}
        />
      )}
      {view === 'detail' && selectedThematic && (
        <ThematicDetail 
          thematic={selectedThematic}
          onBack={() => setView('thematic')}
        />
      )}
      {view === 'admin' && (
        <AdminPanel 
          onClose={() => setView('list')}
          onRefresh={loadData}
        />
      )}
    </>
  );
}

export default App;
