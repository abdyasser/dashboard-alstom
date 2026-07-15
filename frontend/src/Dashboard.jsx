import React from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'
import { Bar, Doughnut } from 'react-chartjs-2'
import { ArrowLeft, AlertCircle, CheckCircle2, Clock, Maximize, Minimize, RefreshCw } from 'lucide-react'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
)

function KPICard({ title, value, icon, color }) {
  return (
    <div className={`kpi-card border-top-${color}`}>
      <div className="kpi-header">
        <span className="kpi-title">{title}</span>
        {icon}
      </div>
      <div className={`kpi-value text-${color}`}>{value}</div>
    </div>
  )
}

export default function Dashboard({ items, onReset, onAddFiles, onRemoveFile, onRefresh, isSyncing, sharedFolder }) {
  const [selectedProject, setSelectedProject] = React.useState('All')
  const [selectedScope, setSelectedScope] = React.useState('All')
  const [selectedStatus, setSelectedStatus] = React.useState('All')
  const [selectedPriority, setSelectedPriority] = React.useState('All')
  const [presentationMode, setPresentationMode] = React.useState(false)
  
  // Toggle Presentation UI (without forcing native DOM Fullscreen which fails in pywebview)
  const togglePresentation = () => {
    setPresentationMode(!presentationMode)
  }
  
  // Listes uniques pour les filtres
  const projects = ['All', ...Array.from(new Set(items.map(i => i.source_file)))]
  const scopes = ['All', ...Array.from(new Set(items.map(i => i.scope))).filter(Boolean)]
  const statuses = ['All', 'Completed', 'In Progress', 'Not Started', 'On Track', 'At Risk', 'Blocked', 'Cancelled']
  const priorities = ['All', 'Critical', 'High', 'Medium', 'Low']
  
  // Filtrer les items selon les sélections
  const filteredItems = items.filter(i => {
    if (selectedProject !== 'All' && i.source_file !== selectedProject) return false
    if (selectedScope !== 'All' && i.scope !== selectedScope) return false
    if (selectedStatus !== 'All' && i.status !== selectedStatus) return false
    if (selectedPriority !== 'All' && i.priority !== selectedPriority) return false
    return true
  })

  // Calculations basés sur filteredItems
  const total = filteredItems.length
  const statusCounts = {
    'Completed': 0, 'In Progress': 0, 'Not Started': 0, 
    'On Track': 0, 'At Risk': 0, 'Blocked': 0, 'Cancelled': 0
  }
  const priorityCounts = { 'Critical': 0, 'High': 0, 'Medium': 0, 'Low': 0 }
  
  filteredItems.forEach(it => {
    if (statusCounts[it.status] !== undefined) statusCounts[it.status]++
    if (priorityCounts[it.priority] !== undefined) priorityCounts[it.priority]++
  })
  
  const completed = statusCounts['Completed']
  const blocked = statusCounts['Blocked'] + statusCounts['At Risk']
  const progress = total ? Math.round((completed / total) * 100) : 0
  
  const blockers = filteredItems.filter(it => it.status === 'Blocked' || it.status === 'At Risk')
  
  // Chart Data
  const statusData = {
    labels: ['Completed', 'On Track', 'In Progress', 'Not Started', 'At Risk', 'Blocked'],
    datasets: [
      {
        label: 'Items by status',
        data: [
          statusCounts['Completed'], statusCounts['On Track'], statusCounts['In Progress'], 
          statusCounts['Not Started'], statusCounts['At Risk'], statusCounts['Blocked']
        ],
        backgroundColor: ['#70AD47', '#A9D18E', '#4472C4', '#D9D9D9', '#ED7D31', '#C00000'],
      },
    ],
  }
  
  const priorityData = {
    labels: ['Critical', 'High', 'Medium', 'Low'],
    datasets: [
      {
        label: 'Items by priority',
        data: [priorityCounts['Critical'], priorityCounts['High'], priorityCounts['Medium'], priorityCounts['Low']],
        backgroundColor: ['#C00000', '#ED7D31', '#003366', '#D9D9D9'],
      }
    ]
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false }
    }
  }

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'right', labels: { boxWidth: 12, font: { size: 10 } } }
    },
    cutout: '60%'
  }

  // Scope Analysis
  const scopeMap = {}
  filteredItems.forEach(it => {
    const s = it.scope || 'Unknown'
    if (!scopeMap[s]) scopeMap[s] = { total: 0, completed: 0, blocked: 0 }
    scopeMap[s].total++
    if (it.status === 'Completed') scopeMap[s].completed++
    if (it.status === 'Blocked' || it.status === 'At Risk') scopeMap[s].blocked++
  })
  
  const scopeData = Object.entries(scopeMap)
    .map(([name, data]) => ({ name, ...data, progress: data.total ? Math.round((data.completed / data.total) * 100) : 0 }))
    .sort((a, b) => b.total - a.total)

  // Scope Chart Data
  const topScopes = scopeData
  const scopeChartData = {
    labels: topScopes.map(s => s.name.length > 15 ? s.name.substring(0, 15) + '...' : s.name),
    datasets: [
      {
        label: 'Completed',
        data: topScopes.map(s => s.completed),
        backgroundColor: '#70AD47', // green
      },
      {
        label: 'In Progress',
        data: topScopes.map(s => s.total - s.completed - s.blocked),
        backgroundColor: '#4472C4', // blue
      },
      {
        label: 'Blocked / At Risk',
        data: topScopes.map(s => s.blocked),
        backgroundColor: '#C00000', // red
      }
    ]
  }

  const scopeChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y',
    plugins: {
      legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 10 } } }
    },
    scales: {
      x: { stacked: true },
      y: { stacked: true }
    }
  }

  // Deadline Analysis
  const deadlineCounts = {
    'Overdue': 0,
    'Due Soon (< 7d)': 0,
    'On Track': 0,
    'No Date': 0
  }
  
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const nextWeek = new Date(today)
  nextWeek.setDate(nextWeek.getDate() + 7)
  
  filteredItems.forEach(it => {
    if (it.status !== 'Completed' && it.status !== 'Cancelled') {
      if (!it.target_date || it.target_date === '-') {
        deadlineCounts['No Date']++
      } else {
        const target = new Date(it.target_date)
        if (isNaN(target.getTime())) {
           deadlineCounts['No Date']++
        } else {
           if (target < today) {
             deadlineCounts['Overdue']++
           } else if (target <= nextWeek) {
             deadlineCounts['Due Soon (< 7d)']++
           } else {
             deadlineCounts['On Track']++
           }
        }
      }
    }
  })
  
  const deadlineData = {
    labels: ['Overdue', 'Due Soon (< 7d)', 'On Track', 'No Date'],
    datasets: [
      {
        label: 'Items (Not Completed)',
        data: [deadlineCounts['Overdue'], deadlineCounts['Due Soon (< 7d)'], deadlineCounts['On Track'], deadlineCounts['No Date']],
        backgroundColor: ['#C00000', '#ED7D31', '#70AD47', '#D9D9D9'],
      }
    ]
  }

  const deadlineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y',
    plugins: {
      legend: { display: false }
    }
  }

  // Priority vs Status Matrix
  const matrix = {
    'Critical': { 'Completed': 0, 'In Progress': 0, 'Blocked': 0 },
    'High': { 'Completed': 0, 'In Progress': 0, 'Blocked': 0 },
    'Medium': { 'Completed': 0, 'In Progress': 0, 'Blocked': 0 },
    'Low': { 'Completed': 0, 'In Progress': 0, 'Blocked': 0 }
  }
  
  filteredItems.forEach(it => {
    const st = it.status === 'Blocked' || it.status === 'At Risk' ? 'Blocked' : (it.status === 'Completed' ? 'Completed' : 'In Progress')
    if (matrix[it.priority]) {
       matrix[it.priority][st]++
    }
  })

  // Owner Analysis
  const ownerMap = {}
  filteredItems.forEach(it => {
    const o = it.owner && it.owner !== 'Unassigned' ? it.owner : 'Unassigned'
    if (!ownerMap[o]) ownerMap[o] = { total: 0, completed: 0, blocked: 0 }
    ownerMap[o].total++
    if (it.status === 'Completed') ownerMap[o].completed++
    if (it.status === 'Blocked' || it.status === 'At Risk') ownerMap[o].blocked++
  })
  
  const ownerData = Object.entries(ownerMap)
    .sort((a, b) => b[1].blocked - a[1].blocked)

  // Stacked Chart Data: Status by Owner
  const topOwners = ownerData
  const stackedData = {
    labels: topOwners.map(o => o[0].length > 15 ? o[0].substring(0, 15) + '...' : o[0]),
    datasets: [
      {
        label: 'Completed',
        data: topOwners.map(o => o[1].completed),
        backgroundColor: '#70AD47', // green
      },
      {
        label: 'In Progress',
        data: topOwners.map(o => o[1].total - o[1].completed - o[1].blocked),
        backgroundColor: '#4472C4', // blue
      },
      {
        label: 'Blocked / At Risk',
        data: topOwners.map(o => o[1].blocked),
        backgroundColor: '#C00000', // red
      },
    ],
  }

  const stackedOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 10 } } }
    },
    scales: {
      x: { stacked: true },
      y: { stacked: true }
    }
  }

  return (
    <div className={`dashboard-container ${presentationMode ? 'presentation-mode' : ''}`}>
      <div className="dash-header">
        <div className="dash-title-group">
          <button className="btn-back hide-in-presentation" onClick={onReset}><ArrowLeft size={16}/> New Analysis</button>
          
          {sharedFolder ? (
            <button className="btn-back hide-in-presentation" onClick={onRefresh} disabled={isSyncing} style={{marginLeft: '10px', padding: '0.6rem 1rem', background: 'var(--green)', color: 'white', border: 'none'}}>
              <RefreshCw size={16} className={isSyncing ? "spinner" : ""} /> {isSyncing ? 'Actualisation...' : 'Actualiser'}
            </button>
          ) : (
            <>
              <input type="file" multiple accept=".xlsx,.xls,.csv" onChange={onAddFiles} id="add-file-upload" style={{display: 'none'}} />
              <label htmlFor="add-file-upload" className="btn-back hide-in-presentation" style={{marginLeft: '10px', padding: '0.6rem 1rem', background: 'var(--blue)', color: 'white', border: 'none'}}>+ Add Files</label>
            </>
          )}

          <button className="btn-back btn-presentation" onClick={togglePresentation} style={{marginLeft: '10px', padding: '0.6rem 1rem', background: 'var(--navy)', color: 'white', border: 'none'}}>
            {presentationMode ? <Minimize size={16}/> : <Maximize size={16}/>} 
            {presentationMode ? 'Exit Presentation' : 'Presentation Mode'}
          </button>
          <h2 style={{marginLeft: '20px', transition: 'all 0.5s', display: 'flex', flexDirection: 'column'}}>
            <span>ALSTOM - IMFU Dashboard {selectedProject === 'All' ? '' : `- ${selectedProject.replace('.xlsx', '').replace('IMFU_', '')}`}</span>
            {sharedFolder && <span style={{fontSize: '0.7rem', color: '#94a3b8', fontWeight: 'normal', marginTop: '2px'}}>Dossier synchronisé : {sharedFolder}</span>}
          </h2>
        </div>
      </div>
      
      <div className="filters-bar hide-in-presentation stagger-1">
        <div className="filter-group">
          <label>Project</label>
          <select className="filter-select" value={selectedProject} onChange={e => setSelectedProject(e.target.value)}>
            {projects.map(p => <option key={p} value={p}>{p === 'All' ? 'All Projects' : p.replace('.xlsx', '').replace('IMFU_', '')}</option>)}
          </select>
        </div>
        
        <div className="filter-group">
          <label>Scope</label>
          <select className="filter-select" value={selectedScope} onChange={e => setSelectedScope(e.target.value)}>
            {scopes.map(s => <option key={s} value={s}>{s === 'All' ? 'All Scopes' : s}</option>)}
          </select>
        </div>

        <div className="filter-group">
          <label>Status</label>
          <select className="filter-select" value={selectedStatus} onChange={e => setSelectedStatus(e.target.value)}>
            {statuses.map(s => <option key={s} value={s}>{s === 'All' ? 'All Statuses' : s}</option>)}
          </select>
        </div>

        <div className="filter-group">
          <label>Priority</label>
          <select className="filter-select" value={selectedPriority} onChange={e => setSelectedPriority(e.target.value)}>
            {priorities.map(p => <option key={p} value={p}>{p === 'All' ? 'All Priorities' : p}</option>)}
          </select>
        </div>
      </div>

      <div style={{display: 'flex', gap: '10px', padding: '0 20px 15px 20px', flexWrap: 'wrap'}}>
        {projects.filter(p => p !== 'All').map(p => (
          <div key={p} style={{display: 'flex', alignItems: 'center', background: 'white', padding: '6px 12px', borderRadius: '20px', fontSize: '13px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.05)'}}>
            <span style={{color: '#475569', fontWeight: '500'}}>{p.replace('.xlsx', '').replace('IMFU_', '')}</span>
            <button 
              onClick={() => {
                onRemoveFile(p);
                if (selectedProject === p) setSelectedProject('All');
              }} 
              style={{background: '#fee2e2', border: 'none', color: '#dc2626', marginLeft: '8px', cursor: 'pointer', fontWeight: 'bold', width: '20px', height: '20px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px'}}
              title="Remove this file"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
      
      <div className="kpi-grid stagger-2">
        <KPICard title="Total Items" value={total} color="navy" icon={<Info size={20} color="#001F3F"/>} />
        <KPICard title="Overall Progress" value={`${progress}%`} color="blue" icon={<Clock size={20} color="#4472C4"/>} />
        <KPICard title="Completed Items" value={completed} color="green" icon={<CheckCircle2 size={20} color="#70AD47"/>} />
        <KPICard title="Blocked / At Risk" value={blocked} color="red" icon={<AlertCircle size={20} color="#C00000"/>} />
      </div>
      
      <div className="charts-grid stagger-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
        <div className="chart-box">
          <div className="box-header">STATUS DISTRIBUTION</div>
          <div className="chart-wrapper">
            <Doughnut options={doughnutOptions} data={statusData} />
          </div>
        </div>
        
        <div className="chart-box">
          <div className="box-header">HEALTH BY OWNER (LOAD VS BLOCKED)</div>
          <div className="chart-wrapper">
            <Bar options={stackedOptions} data={stackedData} />
          </div>
        </div>

        <div className="chart-box">
          <div className="box-header">PRIORITY DISTRIBUTION</div>
          <div className="chart-wrapper">
            <Doughnut options={doughnutOptions} data={priorityData} />
          </div>
        </div>
      </div>

      <div className="charts-grid stagger-4" style={{ marginBottom: '2.5rem', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))' }}>
        <div className="chart-box">
          <div className="box-header">SCOPE SUMMARY</div>
          <div className="chart-wrapper">
            <Bar options={scopeChartOptions} data={scopeChartData} />
          </div>
        </div>

        <div className="chart-box">
          <div className="box-header header-red">DEADLINES & TIMELINES (OPEN ITEMS)</div>
          <div className="chart-wrapper">
            <Bar options={deadlineOptions} data={deadlineData} />
          </div>
        </div>
      </div>

      <div className="charts-grid stagger-5" style={{ marginBottom: '2.5rem', gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))', alignItems: 'start' }}>
        <div className="chart-box">
          <div className="box-header">PRIORITY vs STATUS MATRIX</div>
          <div style={{ padding: '1rem' }} className="table-responsive">
            <table style={{ fontSize: '0.9rem' }}>
              <thead>
                <tr>
                  <th>Priorité</th>
                  <th>Completed</th>
                  <th>In Progress</th>
                  <th>Blocked / At Risk</th>
                </tr>
              </thead>
              <tbody>
                {['Critical', 'High', 'Medium', 'Low'].map(prio => (
                  <tr key={prio}>
                    <td><span className={`badge prio-${prio.toLowerCase()}`}>{prio}</span></td>
                    <td style={{ fontWeight: 'bold', color: 'var(--green)' }}>{matrix[prio]['Completed']}</td>
                    <td style={{ fontWeight: 'bold', color: 'var(--blue-acc)' }}>{matrix[prio]['In Progress']}</td>
                    <td style={{ fontWeight: 'bold', color: 'var(--red)' }}>{matrix[prio]['Blocked']}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="chart-box">
          <div className="box-header header-red">STATUS BY OWNER</div>
          <div style={{ padding: '1rem', maxHeight: '500px', overflowY: 'auto' }} className="table-responsive">
            <table style={{ fontSize: '0.9rem' }}>
              <thead>
                <tr>
                  <th>Owner</th>
                  <th>Completed</th>
                  <th>In Progress</th>
                  <th>Blocked</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {ownerData.map(([name, data]) => (
                  <tr key={name}>
                    <td className="desc-cell" style={{ maxWidth: '150px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</td>
                    <td style={{ fontWeight: 'bold', color: 'var(--green)' }}>{data.completed}</td>
                    <td style={{ color: 'var(--blue-acc)' }}>{data.total - data.blocked - data.completed}</td>
                    <td style={{ fontWeight: 'bold', color: 'var(--red)' }}>{data.blocked}</td>
                    <td>{data.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      
      <div className="blockers-section stagger-6">
        <div className="box-header header-red pulse-header">TOP BLOCKED OR AT RISK ITEMS ({blockers.length})</div>
        <div className="table-responsive">
          <table style={{ fontSize: '0.9rem' }}>
            <thead>
              <tr>
                <th>Item ID</th>
                <th>Description</th>
                <th>Owner</th>
                <th>Issue / Blocker</th>
                <th>Next Action</th>
                <th>Target Date</th>
                <th>Priorité</th>
              </tr>
            </thead>
            <tbody>
              {blockers.length > 0 ? blockers.map((b, i) => (
                <tr key={i}>
                  <td style={{ whiteSpace: 'nowrap' }}><span className="badge-source" style={{display:'block', marginBottom:'4px'}}>{b.source_file}</span>{b.item_id}</td>
                  <td className="desc-cell" style={{minWidth: '200px'}}>{b.name}</td>
                  <td style={{fontWeight: '600', color: 'var(--navy-med)'}}>{b.owner}</td>
                  <td style={{color: 'var(--red)', fontSize: '0.85rem'}}>{b.issue !== '-' ? b.issue : 'Not provided'}</td>
                  <td style={{fontSize: '0.85rem'}}>{b.next_action !== '-' ? b.next_action : 'No action'}</td>
                  <td style={{whiteSpace: 'nowrap', fontWeight: '500', color: 'var(--text-muted)'}}>{b.target_date || '-'}</td>
                  <td><span className={`badge prio-${b.priority.toLowerCase()}`}>{b.priority}</span></td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="6" className="empty-state">No blocked or at risk items.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Footer Signature */}
      <div style={{ textAlign: 'center', marginTop: '40px', padding: '20px 0', borderTop: '1px solid #e2e8f0', color: '#94a3b8', fontSize: '0.85rem' }}>
        &copy; {new Date().getFullYear()} ALSTOM - IMFU Dashboard. Developed by Yasser Abdelmoumen.
      </div>
    </div>
  )
}

function Info({size, color}) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
}
