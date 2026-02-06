import { useState, useEffect } from 'react';
import { 
  Building2, 
  ChevronRight, 
  ArrowLeft,
  Upload,
  Trash2,
  TrendingUp,
  Users,
  DollarSign,
  PieChart,
  Eye
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import './index.css';

function MetricBadge({ icon: Icon, label, value, color = "text-blue-500" }: any) {
  return (
    <div className="flex items-center gap-1 bg-muted/50 px-2 py-1 rounded text-[10px] sm:text-xs">
      <Icon className={`h-3 w-3 ${color}`} />
      <span className="text-muted-foreground">{label}:</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function openGraphInNewTab(filename: string) {
  const safeName = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
  window.open(`/data/graphs/${safeName}`, '_blank');
}

function CompanyList({ companies, onSelect, onUpload, onDelete }: any) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Building2 className="h-6 w-6" />
            <h1 className="text-xl font-semibold text-primary">Industries</h1>
          </div>
          <Button variant="outline" size="sm" onClick={onUpload}>
            <Upload className="h-4 w-4 mr-2" />
            Upload
          </Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6">
        <div className="grid gap-3">
          {companies.map((company: any) => (
            <div
              key={company.name}
              className="flex items-center justify-between p-4 bg-card border rounded-lg hover:border-primary/50 transition-all cursor-pointer group"
              onClick={() => onSelect(company)}
            >
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-lg">{company.name}</h3>
                <div className="flex flex-wrap gap-2 mt-2">
                  <MetricBadge icon={Building2} label="Sectors" value={company.sectors.length} />
                </div>
              </div>
              <div className="flex items-center gap-3 ml-4">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => { e.stopPropagation(); onDelete(company.name); }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
                <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

function SectorList({ company, onBack, onSelectSector }: any) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b px-6 py-4 sticky top-0 bg-background/80 backdrop-blur-md z-10">
        <div className="max-w-6xl mx-auto flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="h-5 w-5" /></Button>
          <div>
            <h1 className="text-xl font-bold">{company.name}</h1>
            <p className="text-xs text-muted-foreground uppercase tracking-widest">{company.sectors.length} Sectors Detected</p>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6 space-y-4">
        {company.sectors.map((sector: any) => (
          <Card key={sector.name} className="hover:border-primary/30 transition-colors cursor-pointer overflow-hidden" onClick={() => onSelectSector(sector)}>
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start gap-4">
                <div className="min-w-0 flex-1">
                  <CardTitle className="text-lg font-bold text-primary group-hover:underline">{sector.name}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{sector.description}</p>
                </div>
                <Badge variant="outline" className="bg-primary/5">{sector.thematicSectors.length} Clusters</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2 mb-3">
                <MetricBadge icon={Users} label="Companies" value={sector.companyCount} />
                <MetricBadge icon={TrendingUp} label="Growth" value={`${(sector.medianGrowthScore * 100).toFixed(1)}%`} color="text-emerald-500" />
                <MetricBadge icon={Users} label="Emp. CAGR" value={`${sector.medianEmployeeCagr.toFixed(1)}%`} color="text-orange-500" />
              </div>
              {sector.graphs && sector.graphs.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-3 border-t">
                  {sector.graphs.map((graph: any, idx: number) => (
                    <Button
                      key={idx}
                      variant="secondary"
                      size="sm"
                      onClick={(e) => { e.stopPropagation(); openGraphInNewTab(graph.filename); }}
                      className="rounded-full px-3 h-7 text-[10px] sm:text-xs"
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      <span className="truncate max-w-[100px]">{graph.filename}</span>
                    </Button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </main>
    </div>
  );
}

function ThematicList({ sector, onBack }: any) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b px-6 py-4 sticky top-0 bg-background/80 backdrop-blur-md z-10">
        <div className="max-w-6xl mx-auto flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="h-5 w-5" /></Button>
          <div>
            <h1 className="text-xl font-bold">{sector.name}</h1>
            <p className="text-xs text-muted-foreground uppercase tracking-widest">{sector.thematicSectors.length} Thematic Clusters</p>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6 space-y-4">
        {sector.thematicSectors.map((thematic: any) => (
          <Card key={thematic.name} className="border-l-4 border-l-primary/40">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold">{thematic.name}</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">{thematic.description}</p>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2 mb-3">
                <MetricBadge icon={Building2} label="Count" value={thematic.companyCount} />
                <MetricBadge icon={TrendingUp} label="Growth" value={`${(thematic.medianGrowthScore * 100).toFixed(1)}%`} color="text-emerald-500" />
                <MetricBadge icon={Users} label="Emp. CAGR" value={`${thematic.medianEmployeeCagr.toFixed(1)}%`} color="text-orange-500" />
                {thematic.medianRevenueCagr && (
                  <MetricBadge icon={DollarSign} label="Rev. CAGR" value={`${thematic.medianRevenueCagr.toFixed(1)}%`} color="text-purple-500" />
                )}
                {thematic.acquisitionPct > 0 && (
                  <MetricBadge icon={PieChart} label="Acq. Rate" value={`${thematic.acquisitionPct.toFixed(1)}%`} color="text-pink-500" />
                )}
              </div>
              {thematic.graphs && thematic.graphs.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-3 border-t">
                  {thematic.graphs.map((graph: any, idx: number) => (
                    <Button
                      key={idx}
                      variant="secondary"
                      size="sm"
                      onClick={(e) => { e.stopPropagation(); openGraphInNewTab(graph.filename); }}
                      className="rounded-full px-3 h-7 text-[10px] sm:text-xs"
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      <span className="truncate max-w-[100px]">{graph.filename}</span>
                    </Button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </main>
    </div>
  );
}

function App() {
  const [view, setView] = useState<'list' | 'sectors' | 'thematics' | 'upload'>('list');
  const [selectedCompany, setSelectedCompany] = useState<any>(null);
  const [selectedSector, setSelectedSector] = useState<any>(null);
  const [companies, setCompanies] = useState<any[]>([]);
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

  const deleteCompany = async (name: string) => {
    if (!confirm(`Delete ${name}?`)) return;
    try {
      const response = await fetch(`/api/company/${encodeURIComponent(name)}`, { method: 'DELETE' });
      if (response.ok) loadData();
    } catch (e) { console.error(e); }
  };

  useEffect(() => { loadData(); }, []);

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

  return (
    <>
      {view === 'list' && <CompanyList companies={companies} onSelect={(c: any) => { setSelectedCompany(c); setView('sectors'); }} onUpload={() => setView('upload')} onDelete={deleteCompany} />}
      {view === 'sectors' && selectedCompany && <SectorList company={selectedCompany} onBack={() => setView('list')} onSelectSector={(s: any) => { setSelectedSector(s); setView('thematics'); }} />}
      {view === 'thematics' && selectedSector && <ThematicList sector={selectedSector} onBack={() => setView('sectors')} />}
    </>
  );
}

export default App;
