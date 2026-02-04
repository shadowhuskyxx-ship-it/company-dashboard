import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Papa from 'papaparse'
import Plot from 'react-plotly.js'
import './index.css'

// Types
interface ThematicSector {
  thematic_sector: string
  thematic_sector_description: string
  company_count: number
  median_growth_score: number
  median_employee_cagr: number
  median_revenue_cagr: number
}

interface Sector {
  name: string
  description: string
  companyCount: number
  thematics: ThematicSector[]
}

interface Company {
  id: string
  name: string
  sectors: Sector[]
  rawData: any[]
  uploadedAt: Date
}

interface CompanyData {
  company_name: string
  description: string
  founded_year: number
  employee_count: number
  employee_cagr: number
  growth_score: number
  thematic_sector: string
}

// Parse CSV data and group by sector
function parseCSV(data: any[]): Sector[] {
  const sectorMap = new Map<string, Sector>()

  data.forEach(row => {
    const sectorName = row.sector
    if (!sectorName) return

    if (!sectorMap.has(sectorName)) {
      sectorMap.set(sectorName, {
        name: sectorName,
        description: row.sector_description || '',
        companyCount: parseInt(row.sector_company_count) || 0,
        thematics: []
      })
    }

    sectorMap.get(sectorName)!.thematics.push({
      thematic_sector: row.thematic_sector || '',
      thematic_sector_description: row.thematic_sector_description || '',
      company_count: parseInt(row.company_count) || 0,
      median_growth_score: parseFloat(row.median_growth_score) || 0,
      median_employee_cagr: parseFloat(row.median_employee_cagr) || 0,
      median_revenue_cagr: parseFloat(row.median_revenue_cagr) || 0
    })
  })

  return Array.from(sectorMap.values()).sort((a, b) => b.companyCount - a.companyCount)
}

// Word wrap helper
function wrapText(text: string, maxLen: number = 45): string {
  const words = text.split(' ')
  const lines: string[] = []
  let currentLine = ''
  
  words.forEach(word => {
    if ((currentLine + ' ' + word).trim().length <= maxLen) {
      currentLine = (currentLine + ' ' + word).trim()
    } else {
      if (currentLine) lines.push(currentLine)
      currentLine = word
    }
  })
  if (currentLine) lines.push(currentLine)
  return lines.join('<br>')
}

// ============ VIEWS ============

// Company List View
function CompanyListView({ 
  companies, 
  onSelect, 
  onUpload, 
  onDelete,
  onViewScatter 
}: { 
  companies: Company[]
  onSelect: (c: Company) => void
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
  onDelete: (id: string) => void
  onViewScatter: () => void
}) {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-slate-900">Company Analytics</h1>
          <div className="flex gap-3">
            <button
              onClick={onViewScatter}
              className="px-4 py-2 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-700 transition-colors"
            >
              📊 Scatter View
            </button>
            <label className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg cursor-pointer hover:bg-indigo-700 transition-colors">
              <input type="file" accept=".csv" className="hidden" onChange={onUpload} />
              + Add Company CSV
            </label>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {companies.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-xl border-2 border-dashed border-slate-200">
            <div className="text-4xl mb-4">📊</div>
            <h2 className="text-lg font-medium text-slate-900 mb-2">No companies yet</h2>
            <p className="text-slate-500 mb-6">Upload a CSV file to get started</p>
            <label className="inline-block px-6 py-3 bg-indigo-600 text-white font-medium rounded-lg cursor-pointer hover:bg-indigo-700 transition-colors">
              <input type="file" accept=".csv" className="hidden" onChange={onUpload} />
              Upload CSV
            </label>
          </div>
        ) : (
          <div className="grid gap-4">
            {companies.map((company, idx) => (
              <motion.div
                key={company.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                onClick={() => onSelect(company)}
                className="bg-white rounded-xl border border-slate-200 p-5 cursor-pointer hover:border-indigo-300 hover:shadow-md transition-all group"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">
                      {company.name}
                    </h3>
                    <p className="text-sm text-slate-500 mt-1">
                      {company.sectors.length} sectors · {company.rawData.length} data points
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={(e) => { e.stopPropagation(); onDelete(company.id) }}
                      className="text-slate-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      ✕
                    </button>
                    <span className="text-slate-400 group-hover:text-indigo-600 transition-colors">→</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

// Sector List View
function SectorListView({ 
  company, 
  onBack, 
  onSelect 
}: { 
  company: Company
  onBack: () => void
  onSelect: (s: Sector) => void
}) {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <button onClick={onBack} className="text-sm text-slate-500 hover:text-slate-900 mb-2 flex items-center gap-1">
            ← Back to Companies
          </button>
          <h1 className="text-xl font-semibold text-slate-900">{company.name}</h1>
          <p className="text-sm text-slate-500 mt-1">Select a sector to view analysis</p>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="grid gap-4">
          {company.sectors.map((sector, idx) => (
            <motion.div
              key={sector.name}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.03 }}
              onClick={() => onSelect(sector)}
              className="bg-white rounded-xl border border-slate-200 p-5 cursor-pointer hover:border-indigo-300 hover:shadow-md transition-all group"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">
                    {sector.name}
                  </h3>
                  <p className="text-sm text-slate-500 mt-1 line-clamp-1">{sector.description}</p>
                  <div className="flex gap-4 mt-2 text-xs text-slate-500">
                    <span>{sector.thematics.length} thematic sectors</span>
                    <span>{sector.companyCount.toLocaleString()} companies</span>
                  </div>
                </div>
                <span className="text-slate-400 group-hover:text-indigo-600 transition-colors">→</span>
              </div>
            </motion.div>
          ))}
        </div>
      </main>
    </div>
  )
}

// Sector Detail View with Plotly Chart
function SectorDetailView({ 
  company, 
  sector, 
  onBack 
}: { 
  company: Company
  sector: Sector
  onBack: () => void
}) {
  // Prepare chart data - sorted by company count
  const chartData = useMemo(() => {
    const sorted = [...sector.thematics].sort((a, b) => a.company_count - b.company_count)
    return {
      x: sorted.map(t => t.company_count),
      y: sorted.map(t => t.thematic_sector),
      text: sorted.map(t => t.thematic_sector_description),
      customdata: sorted.map(t => ({
        growth: (t.median_growth_score * 100).toFixed(1),
        cagr: t.median_employee_cagr.toFixed(1)
      }))
    }
  }, [sector])

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <button onClick={onBack} className="text-sm text-slate-500 hover:text-slate-900 mb-2 flex items-center gap-1">
            ← Back to {company.name}
          </button>
          <h1 className="text-xl font-semibold text-slate-900">{sector.name}</h1>
          <p className="text-sm text-slate-500 mt-1">{sector.description}</p>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Plotly Chart */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">
            Thematic Sectors by Company Count
          </h2>
          <div style={{ height: Math.max(400, sector.thematics.length * 25) }}>
            <Plot
              data={[
                {
                  type: 'bar',
                  orientation: 'h',
                  x: chartData.x,
                  y: chartData.y,
                  text: chartData.x.map(v => v.toLocaleString()),
                  textposition: 'inside',
                  insidetextanchor: 'end',
                  textfont: {
                    color: 'white',
                    size: 11,
                    family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                  },
                  hovertemplate: '<b>%{y}</b><br>Companies: %{x:,}<extra></extra>',
                  marker: {
                    color: '#a78bfa',
                    line: {
                      color: 'rgba(0,0,0,0.05)',
                      width: 1
                    }
                  }
                }
              ]}
              layout={{
                autosize: true,
                margin: { l: 280, r: 60, t: 20, b: 40 },
                xaxis: {
                  title: { text: 'Company Count' },
                  gridcolor: '#f1f5f9',
                  zeroline: false
                },
                yaxis: {
                  automargin: true,
                  tickfont: { size: 11 }
                },
                paper_bgcolor: 'transparent',
                plot_bgcolor: 'transparent',
                font: {
                  family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                },
                hoverlabel: {
                  bgcolor: 'white',
                  bordercolor: '#e2e8f0',
                  font: { size: 12 }
                }
              }}
              config={{
                displayModeBar: false,
                responsive: true
              }}
              style={{ width: '100%', height: '100%' }}
            />
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-white rounded-xl border border-slate-200 mt-6 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200">
            <h2 className="font-semibold text-slate-900">All Thematic Sectors</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600 text-left">
                <tr>
                  <th className="px-6 py-3 font-medium">Thematic Sector</th>
                  <th className="px-6 py-3 font-medium text-right">Companies</th>
                  <th className="px-6 py-3 font-medium text-right">Growth Score</th>
                  <th className="px-6 py-3 font-medium text-right">Employee CAGR</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {[...sector.thematics]
                  .sort((a, b) => b.company_count - a.company_count)
                  .map((t, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="px-6 py-3">
                        <div className="font-medium text-slate-900">{t.thematic_sector}</div>
                        <div className="text-xs text-slate-500 line-clamp-1">{t.thematic_sector_description}</div>
                      </td>
                      <td className="px-6 py-3 text-right font-medium">{t.company_count.toLocaleString()}</td>
                      <td className="px-6 py-3 text-right">{(t.median_growth_score * 100).toFixed(1)}%</td>
                      <td className="px-6 py-3 text-right">{t.median_employee_cagr.toFixed(1)}%</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  )
}

// Scatter Plot View (New!)
function ScatterPlotView({ 
  onBack 
}: { 
  onBack: () => void
}) {
  const [companies, setCompanies] = useState<CompanyData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/data/companies.csv')
      .then(res => res.text())
      .then(text => {
        Papa.parse(text, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            const data = results.data.map((row: any) => ({
              company_name: row.company_name,
              description: row.description,
              founded_year: parseInt(row.founded_year) || 0,
              employee_count: parseInt(row.employee_count) || 0,
              employee_cagr: parseFloat(row.employee_cagr) || 0,
              growth_score: parseFloat(row.growth_score) || 0,
              thematic_sector: row.thematic_sector
            }))
            setCompanies(data)
            setLoading(false)
          }
        })
      })
      .catch(() => setLoading(false))
  }, [])

  // Calculate positions using UMAP-like distribution (simplified scatter)
  const plotData = useMemo(() => {
    if (companies.length === 0) return null

    // Create somewhat random but reproducible positions based on growth metrics
    const positions = companies.map((c, i) => {
      const angle = (i / companies.length) * Math.PI * 2 + (c.growth_score * 10)
      const radius = 2 + c.employee_cagr / 30 + Math.sin(i * 0.5) * 1.5
      return {
        x: Math.cos(angle) * radius + (c.growth_score - 0.1) * 15,
        y: Math.sin(angle) * radius + c.employee_cagr / 3
      }
    })

    return {
      x: positions.map(p => p.x),
      y: positions.map(p => p.y),
      text: companies.map(c => c.company_name),
      hovertext: companies.map(c => 
        `<b>${c.company_name}</b><br>` +
        `${wrapText(c.description)}<br>` +
        `Founded Year: ${c.founded_year}<br>` +
        `Employee Count: ${c.employee_count}<br>` +
        `Employee CAGR: ${c.employee_cagr.toFixed(1)}%<br>` +
        `Growth Score: ${c.growth_score.toFixed(3)}`
      ),
      marker: {
        size: companies.map(c => Math.max(12, Math.sqrt(c.employee_count) * 1.5)),
        color: companies.map(c => c.employee_cagr),
        colorscale: [
          [0, 'rgb(5,48,97)'],
          [0.1, 'rgb(33,102,172)'],
          [0.2, 'rgb(67,147,195)'],
          [0.3, 'rgb(146,197,222)'],
          [0.4, 'rgb(209,229,240)'],
          [0.5, 'rgb(247,247,247)'],
          [0.6, 'rgb(253,219,199)'],
          [0.7, 'rgb(244,165,130)'],
          [0.8, 'rgb(214,96,77)'],
          [0.9, 'rgb(178,24,43)'],
          [1, 'rgb(103,0,31)']
        ],
        colorbar: {
          title: { text: 'Employee CAGR' },
          thickness: 15,
          len: 0.7
        },
        showscale: true,
        line: { color: 'white', width: 1 }
      }
    }
  }, [companies])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-500">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <button onClick={onBack} className="text-sm text-slate-500 hover:text-slate-900 mb-2 flex items-center gap-1">
            ← Back to Companies
          </button>
          <h1 className="text-xl font-semibold text-slate-900">Smart Energy Storage & Grid Flexibility Solutions</h1>
          <p className="text-sm text-slate-500 mt-1">Size = Number of Employees, Colour = 3-year Employee CAGR</p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          {plotData ? (
            <Plot
              data={[
                {
                  type: 'scatter',
                  mode: 'text+markers' as const,
                  x: plotData.x,
                  y: plotData.y,
                  text: plotData.text,
                  hovertext: plotData.hovertext,
                  hoverinfo: 'text',
                  textposition: 'top center',
                  textfont: { size: 8 },
                  marker: plotData.marker as any,
                  name: 'Companies'
                }
              ]}
              layout={{
                autosize: true,
                title: {
                  text: 'Smart Energy Storage & Grid Flexibility Solutions<br><sup>Size = Number of Employees, Colour = 3-year Employee CAGR</sup>',
                  font: { size: 16 }
                },
                xaxis: {
                  title: { text: '' },
                  showgrid: true,
                  zeroline: false,
                  showticklabels: false
                },
                yaxis: {
                  title: { text: '' },
                  showgrid: true,
                  zeroline: false,
                  showticklabels: false
                },
                hovermode: 'closest',
                paper_bgcolor: 'transparent',
                plot_bgcolor: 'transparent',
                font: {
                  family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                  size: 12
                },
                margin: { l: 40, r: 40, t: 80, b: 40 }
              }}
              config={{
                displayModeBar: true,
                responsive: true
              }}
              style={{ width: '100%', height: '700px' }}
            />
          ) : (
            <div className="text-center py-20 text-slate-500">
              No company data available. Add companies.csv to /public/data/
            </div>
          )}
        </div>

        {/* Company Table */}
        <div className="bg-white rounded-xl border border-slate-200 mt-6 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200">
            <h2 className="font-semibold text-slate-900">All Companies ({companies.length})</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600 text-left">
                <tr>
                  <th className="px-6 py-3 font-medium">Company</th>
                  <th className="px-6 py-3 font-medium text-right">Founded</th>
                  <th className="px-6 py-3 font-medium text-right">Employees</th>
                  <th className="px-6 py-3 font-medium text-right">Employee CAGR</th>
                  <th className="px-6 py-3 font-medium text-right">Growth Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {[...companies]
                  .sort((a, b) => b.employee_cagr - a.employee_cagr)
                  .map((c, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="px-6 py-3">
                        <div className="font-medium text-slate-900">{c.company_name}</div>
                        <div className="text-xs text-slate-500 line-clamp-1 max-w-md">{c.description}</div>
                      </td>
                      <td className="px-6 py-3 text-right">{c.founded_year}</td>
                      <td className="px-6 py-3 text-right font-medium">{c.employee_count.toLocaleString()}</td>
                      <td className="px-6 py-3 text-right">
                        <span className={c.employee_cagr >= 0 ? 'text-green-600' : 'text-red-600'}>
                          {c.employee_cagr >= 0 ? '+' : ''}{c.employee_cagr.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-6 py-3 text-right">{(c.growth_score * 100).toFixed(1)}%</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  )
}

// ============ MAIN APP ============

function App() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null)
  const [selectedSector, setSelectedSector] = useState<Sector | null>(null)
  const [view, setView] = useState<'companies' | 'sectors' | 'detail' | 'scatter'>('companies')

  // Load sample data on mount
  useEffect(() => {
    fetch('/data/sample.csv')
      .then(res => res.text())
      .then(text => {
        Papa.parse(text, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            const sectors = parseCSV(results.data)
            setCompanies([{
              id: 'sample',
              name: 'Sample Company',
              sectors,
              rawData: results.data,
              uploadedAt: new Date()
            }])
          }
        })
      })
      .catch(() => console.log('No sample data'))
  }, [])

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const sectors = parseCSV(results.data)
        setCompanies(prev => [...prev, {
          id: Date.now().toString(),
          name: file.name.replace('.csv', ''),
          sectors,
          rawData: results.data,
          uploadedAt: new Date()
        }])
      }
    })
    e.target.value = ''
  }

  const handleDelete = (id: string) => {
    setCompanies(prev => prev.filter(c => c.id !== id))
  }

  const selectCompany = (company: Company) => {
    setSelectedCompany(company)
    setView('sectors')
  }

  const selectSector = (sector: Sector) => {
    setSelectedSector(sector)
    setView('detail')
  }

  const goBack = () => {
    if (view === 'detail') {
      setSelectedSector(null)
      setView('sectors')
    } else if (view === 'sectors') {
      setSelectedCompany(null)
      setView('companies')
    } else if (view === 'scatter') {
      setView('companies')
    }
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={view}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
      >
        {view === 'companies' && (
          <CompanyListView
            companies={companies}
            onSelect={selectCompany}
            onUpload={handleUpload}
            onDelete={handleDelete}
            onViewScatter={() => setView('scatter')}
          />
        )}
        {view === 'sectors' && selectedCompany && (
          <SectorListView
            company={selectedCompany}
            onBack={goBack}
            onSelect={selectSector}
          />
        )}
        {view === 'detail' && selectedCompany && selectedSector && (
          <SectorDetailView
            company={selectedCompany}
            sector={selectedSector}
            onBack={goBack}
          />
        )}
        {view === 'scatter' && (
          <ScatterPlotView onBack={goBack} />
        )}
      </motion.div>
    </AnimatePresence>
  )
}

export default App
