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
  Eye,
  PlusCircle,
  Globe2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import './index.css';

function MetricBadge({ icon: Icon, label, value, color = "text-blue-500" }: any) {
  return (
    <div className="flex items-center gap-1 bg-muted/50 px-2 py-1 rounded text-[10px] sm:text-xs border border-border/50">
      <Icon className={`h-3 w-3 ${color}`} />
      <span className="text-muted-foreground">{label}:</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}

function openGraphInNewTab(filename: string) {
  window.open(`/data/graphs/${filename.replace(/[^a-zA-Z0-9.-]/g, '_')}`, '_blank');
}

function AdminPanel({ onClose, onRefresh }: any) {
  const [companyName, setCompanyName] = useState('');
  const [csvContent, setCsvContent] = useState('');
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [htmlFiles, setHtmlFiles] = useState<{file: File, type: 'sector' | 'thematic', target: string}[]>([]);
  const [sectors, setSectors] = useState<string[]>([]);
  const [thematicSectors, setThematicSectors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (csvContent) {
      const lines = csvContent.trim().split('\n');
      if (lines.length > 1) {
        const headers = lines[0].split(',');
        const sIdx = headers.indexOf('sector'), tIdx = headers.indexOf('thematic_sector');
        const s = new Set<string>(), t = new Set<string>();
        lines.slice(1).forEach(l => {
          const c = l.split(','); // Simplified for listing
          if(sIdx !== -1) s.add(c[sIdx]); if(tIdx !== -1) t.add(c[tIdx]);
        });
        setSectors(Array.from(s).filter(Boolean).sort());
        setThematicSectors(Array.from(t).filter(Boolean).sort());
      }
    }
  }, [csvContent]);

  const handleCsvUpload = (e: any) => {
    const f = e.target.files?.[0]; if (!f) return;
    setCsvFile(f); setCompanyName(f.name.replace(/\.csv$/i, ''));
    const r = new FileReader(); r.onload = (ev) => setCsvContent(ev.target?.result as string); r.readAsText(f);
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const hData = await Promise.all(htmlFiles.map(async f => ({ filename: f.file.name, type: f.type, target: f.target, content: await f.file.text() })));
      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csvContent, companyName, htmlFiles: hData })
      });
      if (res.ok) { onRefresh(); onClose(); }
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background overflow-y-auto">
      <header className="border-b px-6 py-4 flex justify-between sticky top-0 bg-background/80 backdrop-blur-md">
        <div className="flex items-center gap-4"><Button variant="ghost" size="icon" onClick={onClose}><ArrowLeft className="h-5 w-5"/></Button><h1 className="font-bold">Sync Data</h1></div>
      </header>
      <main className="max-w-xl mx-auto p-6 space-y-6">
        <Input placeholder="Name" value={companyName} onChange={e => setCompanyName(e.target.value)} />
        <div className="border-2 border-dashed rounded-xl p-6 text-center cursor-pointer" onClick={() => document.getElementById('c-i')?.click()}>
          <input id="c-i" type="file" accept=".csv" className="hidden" onChange={handleCsvUpload} />
          <Upload className="mx-auto mb-2 text-muted-foreground" /><p>{csvFile ? csvFile.name : 'Upload Industry CSV'}</p>
        </div>
        <div className="space-y-2">
          <Button variant="outline" size="sm" className="w-full" onClick={() => document.getElementById('h-i')?.click()}>
            <PlusCircle className="mr-2 h-4 w-4" /> Add Graphs
          </Button>
          <input id="h-i" type="file" accept=".html" multiple className="hidden" onChange={e => setHtmlFiles([...htmlFiles, ...Array.from(e.target.files || []).map(file => ({ file: file as File, type: 'sector' as any, target: '' }))])} />
          {htmlFiles.map((h, i) => (
            <div key={i} className="flex gap-2 bg-muted p-2 rounded text-xs">
              <span className="flex-1 truncate">{h.file.name}</span>
              <select className="border rounded" value={h.target} onChange={e => { const n = [...htmlFiles]; n[i].target = e.target.value; setHtmlFiles(n); }}>
                <option value="">Target...</option>
                {sectors.concat(thematicSectors).map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          ))}
        </div>
        <Button className="w-full" size="lg" onClick={handleSubmit} disabled={loading}>{loading ? 'Deploying...' : 'Deploy Changes'}</Button>
      </main>
    </div>
  );
}

function CompanyList({ companies, onSelect, onUpload, onDelete }: any) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b px-6 py-4 flex items-center justify-between sticky top-0 bg-background/80 backdrop-blur-md z-20">
        <div className="flex items-center gap-3"><Building2 className="h-6 w-6 text-primary" /><h1 className="text-xl font-bold">Thema Universe</h1></div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => openGraphInNewTab('all_thematic_sectors_datamap.html')}><Globe2 className="h-4 w-4 mr-2" />Universe Map</Button>
          <Button size="sm" onClick={onUpload}><PlusCircle className="h-4 w-4 mr-2" />Add Data</Button>
        </div>
      </header>
      <main className="max-w-5xl mx-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        {companies.map((c: any) => (
          <Card key={c.name} className="hover:border-primary/50 cursor-pointer group" onClick={() => onSelect(c)}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-bold">{c.name}</CardTitle>
              <Button variant="ghost" size="icon" className="hover:text-destructive md:opacity-0 group-hover:opacity-100" onClick={e => { e.stopPropagation(); onDelete(c.name); }}><Trash2 className="h-4 w-4" /></Button>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3 text-sm text-muted-foreground font-medium">
                <div className="flex items-center gap-1"><Building2 className="h-4 w-4" />{c.sectors?.length} Sectors</div>
              </div>
              <div className="mt-4 flex justify-end text-primary text-xs font-bold uppercase tracking-widest">Explore Sectors<ChevronRight className="h-4 w-4 ml-1" /></div>
            </CardContent>
          </Card>
        ))}
      </main>
    </div>
  );
}

function SectorList({ company, onBack, onSelectSector }: any) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b px-6 py-4 sticky top-0 bg-background/80 backdrop-blur-md z-20 flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="h-5 w-5" /></Button>
        <h1 className="text-xl font-bold">{company.name}</h1>
      </header>
      <main className="max-w-5xl mx-auto p-6 space-y-4">
        {company.sectors.map((s: any) => (
          <Card key={s.name} className="hover:border-primary/30 cursor-pointer" onClick={() => onSelectSector(s)}>
            <CardHeader className="pb-3 border-b">
              <div className="flex justify-between items-start">
                <div className="space-y-1"><CardTitle className="text-xl font-bold text-primary">{s.name}</CardTitle><p className="text-sm text-muted-foreground line-clamp-2">{s.description}</p></div>
                <Badge variant="secondary" className="ml-4">{s.thematicSectors?.length} Clusters</Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-4 flex flex-wrap gap-2">
              <MetricBadge icon={Building2} label="Universe" value={s.companyCount} />
              <MetricBadge icon={TrendingUp} label="Growth" value={`${(s.medianGrowthScore * 100).toFixed(1)}%`} color="text-emerald-500" />
              <MetricBadge icon={Users} label="CAGR" value={`${s.medianEmployeeCagr?.toFixed(1)}%`} color="text-orange-500" />
              {s.graphs?.length > 0 && <Button variant="secondary" size="sm" className="h-7 text-[10px] rounded-full" onClick={e => { e.stopPropagation(); openGraphInNewTab(s.graphs[0].filename); }}><Eye className="h-3 w-3 mr-1" />View Map</Button>}
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
      <header className="border-b px-6 py-4 sticky top-0 bg-background/80 backdrop-blur-md z-20 flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="h-5 w-5" /></Button>
        <h1 className="text-xl font-bold">{sector.name} Clusters</h1>
      </header>
      <main className="max-w-4xl mx-auto p-6 space-y-4">
        {sector.thematicSectors.map((t: any) => (
          <Card key={t.name} className="border-l-4 border-l-primary/60 hover:bg-muted/30">
            <CardHeader className="pb-2"><div className="flex justify-between">{t.rank && <Badge variant="outline">Rank #{t.rank}</Badge>}<CardTitle className="text-lg font-bold">{t.name}</CardTitle></div></CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">{t.description}</p>
              <div className="flex flex-wrap gap-2">
                <MetricBadge icon={Building2} label="Companies" value={t.companyCount} />
                <MetricBadge icon={TrendingUp} label="Growth" value={`${(t.medianGrowthScore * 100).toFixed(1)}%`} color="text-emerald-500" />
                <MetricBadge icon={Users} label="CAGR" value={`${t.medianEmployeeCagr?.toFixed(1)}%`} color="text-orange-500" />
                {t.fiveYearCagr && <MetricBadge icon={TrendingUp} label="5y CAGR" value={`${t.fiveYearCagr.toFixed(1)}%`} color="text-blue-500" />}
                {t.medianRevenueCagr && <MetricBadge icon={DollarSign} label="Rev. CAGR" value={`${t.medianRevenueCagr.toFixed(1)}%`} color="text-purple-500" />}
                {t.acquisitionPct > 0 && <MetricBadge icon={PieChart} label="Acq. Rate" value={`${t.acquisitionPct.toFixed(1)}%`} color="text-pink-500" />}
                {t.entryRatePct > 0 && <MetricBadge icon={PlusCircle} label="Entry Rate" value={`${t.entryRatePct.toFixed(1)}%`} color="text-indigo-500" />}
              </div>
              {t.graphs?.map((g: any, i: number) => <Button key={i} variant="outline" size="sm" className="h-7 text-[10px] rounded-full" onClick={() => openGraphInNewTab(g.filename)}><Eye className="h-3 w-3 mr-1" />Cluster Map</Button>)}
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
      const res = await fetch('/api/data');
      if (res.ok) { const d = await res.json(); setCompanies(d.companies || []); }
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const deleteCompany = async (name: string) => {
    if (!confirm(`Delete ${name}?`)) return;
    try {
      const res = await fetch(`/api/company/${encodeURIComponent(name)}`, { method: 'DELETE' });
      if (res.ok) loadData();
    } catch (e) { console.error(e); }
  };

  useEffect(() => { loadData(); }, []);

  if (loading) return <div className="min-h-screen flex items-center justify-center font-mono animate-pulse">Initializing...</div>;

  return (
    <div className="dark">
      {view === 'list' && <CompanyList companies={companies} onSelect={(c: any) => { setSelectedCompany(c); setView('sectors'); }} onUpload={() => setView('upload')} onDelete={deleteCompany} />}
      {view === 'sectors' && selectedCompany && <SectorList company={selectedCompany} onBack={() => setView('list')} onSelectSector={(s: any) => { setSelectedSector(s); setView('thematics'); }} />}
      {view === 'thematics' && selectedSector && <ThematicList sector={selectedSector} onBack={() => setView('sectors')} />}
      {view === 'upload' && <AdminPanel onClose={() => setView('list')} onRefresh={loadData} />}
    </div>
  );
}

export default App;
