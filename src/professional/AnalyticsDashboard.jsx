import { useState, useEffect, useRef, cloneElement, createContext, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, AreaChart, Area
} from 'recharts';
import { API_URL } from '../utils/api';

// Context to pass printMode to chart wrapper without prop drilling
const PrintContext = createContext(false);

// Wrapper that bypasses ResponsiveContainer during print mode
// In print mode: renders chart with fixed pixel dimensions (no ResizeObserver)
// In normal mode: uses ResponsiveContainer for responsive sizing
const PrintChart = ({ height, children }) => {
  const isPrint = useContext(PrintContext);
  if (isPrint) {
    return (
      <div style={{ width: '100%', overflow: 'hidden' }}>
        {cloneElement(children, { width: 900, height })}
      </div>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={height}>
      {children}
    </ResponsiveContainer>
  );
};
import './AnalyticsDashboard.css';

const PALETTE = {
  primary: ['#0ea5e9', '#06b6d4', '#14b8a6', '#10b981', '#22c55e', '#84cc16'],
  maBaad: ['#06b6d4', '#f59e0b', '#22c55e', '#ef4444', '#a855f7', '#64748b'],
  health: ['#22c55e', '#ef4444', '#f59e0b', '#a855f7', '#06b6d4', '#ec4899', '#64748b', '#0ea5e9', '#14b8a6', '#e11d48'],
  age: ['#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#64748b'],
  lieu: ['#0ea5e9', '#14b8a6', '#f59e0b', '#ef4444', '#8b5cf6', '#64748b'],
};

const RADIAN = Math.PI / 180;

const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }) => {
  if (percent < 0.03) return null;
  const radius = innerRadius + (outerRadius - innerRadius) * 1.15;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="#374151" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize={12} fontWeight={500}>
      {name} ({(percent * 100).toFixed(0)}%)
    </text>
  );
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="analytics-tooltip">
      <p className="tooltip-label">{label || payload[0]?.name}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color || p.fill }}>
          {p.name || p.dataKey}: <strong>{p.value}</strong>
        </p>
      ))}
    </div>
  );
};

function AnalyticsDashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [printMode, setPrintMode] = useState(false);
  const printRef = useRef(null);

  const handlePrint = () => {
    setPrintMode(true);
  };

  // When printMode activates: wait for React to render all charts with fixed dimensions, then print
  useEffect(() => {
    if (!printMode) return;
    let cancelled = false;

    // Charts now use fixed pixel dimensions (no ResizeObserver), only need paint time
    const timer = setTimeout(() => {
      if (!cancelled) window.print();
    }, 800);

    const onAfterPrint = () => { setPrintMode(false); };
    window.addEventListener('afterprint', onAfterPrint);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      window.removeEventListener('afterprint', onAfterPrint);
    };
  }, [printMode]);

  useEffect(() => {
    const professionalUser = localStorage.getItem('professionalUser');
    if (!professionalUser) { navigate('/login'); return; }
    fetchData();
  }, [navigate]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const professionalUser = localStorage.getItem('professionalUser');
      if (!professionalUser) { setError('ÙŠØ±Ø¬Ù‰ ØªØ³Ø¬ÙŠÙ„ Ø§Ù„Ø¯Ø®ÙˆÙ„'); setLoading(false); return; }
      const { token } = JSON.parse(professionalUser);
      const res = await axios.get(`${API_URL}/analytics/beneficiaries/full`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) setData(res.data.data);
    } catch (err) {
      console.error('Analytics error:', err);
      setError(err.response?.data?.message || 'Ø®Ø·Ø£ ÙÙŠ ØªØ­Ù…ÙŠÙ„ Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div className="analytics-loading">
      <div className="spinner"></div>
      <p>Ø¬Ø§Ø±ÙŠ ØªØ­Ù…ÙŠÙ„ Ø§Ù„Ø¥Ø­ØµØ§Ø¦ÙŠØ§Øª...</p>
    </div>
  );

  if (error) return (
    <div className="analytics-error">
      <p>{error}</p>
      <button onClick={fetchData} className="btn-retry">Ø¥Ø¹Ø§Ø¯Ø© Ø§Ù„Ù…Ø­Ø§ÙˆÙ„Ø©</button>
    </div>
  );

  if (!data) return null;

  const { overview, maBaad, situation, health, lieuIntervention, entiteOrientatrice, birthPlace, age, entryTimeline, monthlyEntry, departTimeline, stayDuration, entryVsExit, cin } = data;

  const tabs = [
    { id: 'overview', label: 'Ù†Ø¸Ø±Ø© Ø¹Ø§Ù…Ø©', icon: 'ðŸ“Š' },
    { id: 'demographics', label: 'Ø§Ù„ÙØ¦Ø§Øª Ø§Ù„Ø¹Ù…Ø±ÙŠØ©', icon: 'ðŸ‘¥' },
    { id: 'status', label: 'Ø§Ù„Ø­Ø§Ù„Ø© ÙˆØ§Ù„ÙˆØ¶Ø¹ÙŠØ©', icon: 'ðŸ“‹' },
    { id: 'health', label: 'Ø§Ù„ØµØ­Ø©', icon: 'ðŸ¥' },
    { id: 'geography', label: 'Ø§Ù„ØªÙˆØ²ÙŠØ¹ Ø§Ù„Ø¬ØºØ±Ø§ÙÙŠ', icon: 'ðŸ—ºï¸' },
    { id: 'timeline', label: 'Ø§Ù„ØªØ·ÙˆØ± Ø§Ù„Ø²Ù…Ù†ÙŠ', icon: 'ðŸ“ˆ' },
  ];

  return (
    <PrintContext.Provider value={printMode}>
    <div className={`analytics-dashboard ${printMode ? 'print-mode' : ''}`} dir="rtl" ref={printRef}>
      {/* Header */}
      <div className="analytics-header">
        <div className="header-title">
          <h1>ðŸ“Š Ù„ÙˆØ­Ø© Ø§Ù„Ø¥Ø­ØµØ§Ø¦ÙŠØ§Øª ÙˆØ§Ù„ØªØ­Ù„ÙŠÙ„Ø§Øª</h1>
          <p className="header-subtitle">ØªØ­Ù„ÙŠÙ„ Ø´Ø§Ù…Ù„ Ù„Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ù…Ø³ØªÙÙŠØ¯ÙŠÙ†</p>
        </div>
        <div className="header-actions-analytics">
          <button onClick={handlePrint} className="btn-print">ðŸ–¨ï¸ Ø·Ø¨Ø§Ø¹Ø© Ø§Ù„ØªÙ‚Ø§Ø±ÙŠØ±</button>
          <button onClick={fetchData} className="btn-refresh">ðŸ”„ ØªØ­Ø¯ÙŠØ«</button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        <div className="kpi-card kpi-total">
          <div className="kpi-icon">ðŸ‘¥</div>
          <div className="kpi-info">
            <span className="kpi-label">Ø§Ù„Ù…Ø¬Ù…ÙˆØ¹ Ø§Ù„ÙƒÙ„ÙŠ</span>
            <span className="kpi-value">{overview.total}</span>
          </div>
        </div>
        <div className="kpi-card kpi-heberge">
          <div className="kpi-icon">ðŸ </div>
          <div className="kpi-info">
            <span className="kpi-label">Ù†Ø²Ù„Ø§Ø¡ Ø­Ø§Ù„ÙŠÙˆÙ†</span>
            <span className="kpi-value">{overview.heberge}</span>
          </div>
        </div>
        <div className="kpi-card kpi-sorti">
          <div className="kpi-icon">ðŸšª</div>
          <div className="kpi-info">
            <span className="kpi-label">Ø®Ø±Ø¬ÙˆØ§</span>
            <span className="kpi-value">{overview.sorti}</span>
          </div>
        </div>
        <div className="kpi-card kpi-cin">
          <div className="kpi-icon">ðŸªª</div>
          <div className="kpi-info">
            <span className="kpi-label">ÙŠØ­Ù…Ù„ÙˆÙ† Ø¨.Ùˆ.Øª</span>
            <span className="kpi-value">{overview.withCIN}</span>
          </div>
        </div>
        <div className="kpi-card kpi-stay">
          <div className="kpi-icon">ðŸ“…</div>
          <div className="kpi-info">
            <span className="kpi-label">Ù…ØªÙˆØ³Ø· Ø§Ù„Ø¥Ù‚Ø§Ù…Ø©</span>
            <span className="kpi-value">{overview.avgStayDays} <small>ÙŠÙˆÙ…</small></span>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      {!printMode && (
        <div className="analytics-tabs">
          {tabs.map(t => (
            <button key={t.id} className={`tab-btn ${activeTab === t.id ? 'active' : ''}`} onClick={() => setActiveTab(t.id)}>
              <span className="tab-icon">{t.icon}</span>
              <span className="tab-label">{t.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Tab Content */}
      <div className="tab-content">

        {/* ===== OVERVIEW ===== */}
        {(activeTab === 'overview' || printMode) && (
        <div className="tab-panel">
          {printMode && <h2 className="print-section-title">ðŸ“Š Ù†Ø¸Ø±Ø© Ø¹Ø§Ù…Ø©</h2>}
          <div className="charts-section">
            <div className="charts-row">
              <div className="chart-card">
                <div className="chart-header">
                  <h3>ðŸ  Ù…Ø§Ø¨Ø¹Ø¯ Ø§Ù„Ø§ÙŠÙˆØ§Ø¡</h3>
                  <span className="chart-badge">{maBaad.length} ÙØ¦Ø§Øª</span>
                </div>
                <PrintChart height={320}>
                  <PieChart>
                    <Pie data={maBaad} cx="50%" cy="50%" outerRadius={110} innerRadius={50} dataKey="value"
                      label={renderCustomLabel} labelLine={false}>
                      {maBaad.map((_, i) => <Cell key={i} fill={PALETTE.maBaad[i % PALETTE.maBaad.length]} />)}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </PrintChart>
                <div className="chart-legend-list">
                  {maBaad.map((d, i) => (
                    <div key={i} className="legend-item">
                      <span className="legend-dot" style={{ background: PALETTE.maBaad[i % PALETTE.maBaad.length] }}></span>
                      <span className="legend-name">{d.name}</span>
                      <span className="legend-val">{d.value} ({d.percent}%)</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="chart-card">
                <div className="chart-header">
                  <h3>ðŸ“‹ Ù†ÙˆØ¹ Ø§Ù„ÙˆØ¶Ø¹ÙŠØ©</h3>
                  <span className="chart-badge">{situation.length} Ø£Ù†ÙˆØ§Ø¹</span>
                </div>
                <PrintChart height={320}>
                  <PieChart>
                    <Pie data={situation} cx="50%" cy="50%" outerRadius={110} innerRadius={50} dataKey="value"
                      label={renderCustomLabel} labelLine={false}>
                      {situation.map((_, i) => <Cell key={i} fill={PALETTE.primary[i % PALETTE.primary.length]} />)}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </PrintChart>
                <div className="chart-legend-list">
                  {situation.map((d, i) => (
                    <div key={i} className="legend-item">
                      <span className="legend-dot" style={{ background: PALETTE.primary[i % PALETTE.primary.length] }}></span>
                      <span className="legend-name">{d.name}</span>
                      <span className="legend-val">{d.value} ({d.percent}%)</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="charts-row">
              <div className="chart-card chart-narrow">
                <div className="chart-header"><h3>ðŸªª Ø§Ù„Ø¨Ø·Ø§Ù‚Ø© Ø§Ù„ÙˆØ·Ù†ÙŠØ©</h3></div>
                <PrintChart height={250}>
                  <PieChart>
                    <Pie data={cin} cx="50%" cy="50%" outerRadius={90} innerRadius={40} dataKey="value"
                      label={renderCustomLabel} labelLine={false}>
                      <Cell fill="#22c55e" />
                      <Cell fill="#ef4444" />
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </PrintChart>
              </div>

              <div className="chart-card chart-wide">
                <div className="chart-header"><h3>ðŸ“ˆ Ø§Ù„Ø¯Ø®ÙˆÙ„ Ù…Ù‚Ø§Ø¨Ù„ Ø§Ù„Ø®Ø±ÙˆØ¬ Ø­Ø³Ø¨ Ø§Ù„Ø³Ù†Ø©</h3></div>
                <PrintChart height={280}>
                  <BarChart data={entryVsExit} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="name" stroke="#6b7280" fontSize={12} />
                    <YAxis stroke="#6b7280" fontSize={12} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Bar dataKey="entries" name="Ø§Ù„Ø¯Ø®ÙˆÙ„" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="exits" name="Ø§Ù„Ø®Ø±ÙˆØ¬" fill="#f97316" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </PrintChart>
              </div>
            </div>
          </div>
        </div>)}

        {/* ===== DEMOGRAPHICS ===== */}
        {(activeTab === 'demographics' || printMode) && (
        <div className="tab-panel">
          {printMode && <h2 className="print-section-title">ðŸ‘¥ Ø§Ù„ÙØ¦Ø§Øª Ø§Ù„Ø¹Ù…Ø±ÙŠØ©</h2>}
          <div className="charts-section">
            <div className="charts-row">
              <div className="chart-card chart-full">
                <div className="chart-header"><h3>ðŸŽ‚ Ø§Ù„ØªÙˆØ²ÙŠØ¹ Ø­Ø³Ø¨ Ø§Ù„ÙØ¦Ø§Øª Ø§Ù„Ø¹Ù…Ø±ÙŠØ©</h3></div>
                <PrintChart height={350}>
                  <BarChart data={age} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="name" stroke="#6b7280" fontSize={13} />
                    <YAxis stroke="#6b7280" fontSize={12} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="value" name="Ø§Ù„Ø¹Ø¯Ø¯" radius={[6, 6, 0, 0]}>
                      {age.map((_, i) => <Cell key={i} fill={PALETTE.age[i % PALETTE.age.length]} />)}
                    </Bar>
                  </BarChart>
                </PrintChart>
              </div>
            </div>
            <div className="charts-row">
              <div className="chart-card">
                <div className="chart-header"><h3>ðŸ“Š Ù†Ø³Ø¨ Ø§Ù„ÙØ¦Ø§Øª Ø§Ù„Ø¹Ù…Ø±ÙŠØ©</h3></div>
                <PrintChart height={320}>
                  <PieChart>
                    <Pie data={age} cx="50%" cy="50%" outerRadius={110} innerRadius={50} dataKey="value"
                      label={renderCustomLabel} labelLine={false}>
                      {age.map((_, i) => <Cell key={i} fill={PALETTE.age[i % PALETTE.age.length]} />)}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </PrintChart>
                <div className="chart-legend-list">
                  {age.map((d, i) => (
                    <div key={i} className="legend-item">
                      <span className="legend-dot" style={{ background: PALETTE.age[i % PALETTE.age.length] }}></span>
                      <span className="legend-name">{d.name}</span>
                      <span className="legend-val">{d.value} ({d.percent}%)</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="chart-card">
                <div className="chart-header"><h3>â±ï¸ Ù…Ø¯Ø© Ø§Ù„Ø¥Ù‚Ø§Ù…Ø©</h3></div>
                <PrintChart height={320}>
                  <BarChart data={stayDuration} layout="vertical" margin={{ top: 10, right: 30, left: 80, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis type="number" stroke="#6b7280" fontSize={12} />
                    <YAxis type="category" dataKey="name" stroke="#6b7280" fontSize={12} width={80} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="value" name="Ø§Ù„Ø¹Ø¯Ø¯" fill="#8b5cf6" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </PrintChart>
              </div>
            </div>
          </div>
        </div>)}

        {/* ===== STATUS ===== */}
        {(activeTab === 'status' || printMode) && (
        <div className="tab-panel">
          {printMode && <h2 className="print-section-title">ðŸ“‹ Ø§Ù„Ø­Ø§Ù„Ø© ÙˆØ§Ù„ÙˆØ¶Ø¹ÙŠØ©</h2>}
          <div className="charts-section">
            <div className="charts-row">
              <div className="chart-card">
                <div className="chart-header"><h3>ðŸ  Ù…Ø§Ø¨Ø¹Ø¯ Ø§Ù„Ø§ÙŠÙˆØ§Ø¡ - ØªÙØµÙŠÙ„</h3></div>
                <PrintChart height={350}>
                  <BarChart data={maBaad} layout="vertical" margin={{ top: 10, right: 30, left: 100, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis type="number" stroke="#6b7280" fontSize={12} />
                    <YAxis type="category" dataKey="name" stroke="#6b7280" fontSize={13} width={100} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="value" name="Ø§Ù„Ø¹Ø¯Ø¯" radius={[0, 6, 6, 0]}>
                      {maBaad.map((_, i) => <Cell key={i} fill={PALETTE.maBaad[i % PALETTE.maBaad.length]} />)}
                    </Bar>
                  </BarChart>
                </PrintChart>
              </div>

              <div className="chart-card">
                <div className="chart-header"><h3>ðŸ“‹ Ù†ÙˆØ¹ Ø§Ù„ÙˆØ¶Ø¹ÙŠØ© - ØªÙØµÙŠÙ„</h3></div>
                <PrintChart height={350}>
                  <BarChart data={situation} layout="vertical" margin={{ top: 10, right: 30, left: 120, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis type="number" stroke="#6b7280" fontSize={12} />
                    <YAxis type="category" dataKey="name" stroke="#6b7280" fontSize={13} width={120} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="value" name="Ø§Ù„Ø¹Ø¯Ø¯" radius={[0, 6, 6, 0]}>
                      {situation.map((_, i) => <Cell key={i} fill={PALETTE.primary[i % PALETTE.primary.length]} />)}
                    </Bar>
                  </BarChart>
                </PrintChart>
              </div>
            </div>

            <div className="charts-row">
              <div className="chart-card chart-full">
                <div className="chart-header"><h3>ðŸ“Š Ù…Ù„Ø®Øµ Ø§Ù„Ø­Ø§Ù„Ø§Øª</h3></div>
                <div className="data-cards-grid">
                  {maBaad.map((d, i) => (
                    <div key={i} className="data-stat-card" style={{ borderRightColor: PALETTE.maBaad[i % PALETTE.maBaad.length] }}>
                      <span className="data-stat-val">{d.value}</span>
                      <span className="data-stat-name">{d.name}</span>
                      <span className="data-stat-pct">{d.percent}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>)}

        {/* ===== HEALTH ===== */}
        {(activeTab === 'health' || printMode) && (
        <div className="tab-panel">
          {printMode && <h2 className="print-section-title">ðŸ¥ Ø§Ù„ØµØ­Ø©</h2>}
          <div className="charts-section">
            <div className="charts-row">
              <div className="chart-card chart-full">
                <div className="chart-header"><h3>ðŸ¥ ØªÙˆØ²ÙŠØ¹ Ø§Ù„Ø­Ø§Ù„Ø© Ø§Ù„ØµØ­ÙŠØ©</h3></div>
                <PrintChart height={400}>
                  <BarChart data={health} layout="vertical" margin={{ top: 10, right: 30, left: 120, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis type="number" stroke="#6b7280" fontSize={12} />
                    <YAxis type="category" dataKey="name" stroke="#6b7280" fontSize={13} width={120} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="value" name="Ø§Ù„Ø¹Ø¯Ø¯" radius={[0, 6, 6, 0]}>
                      {health.map((_, i) => <Cell key={i} fill={PALETTE.health[i % PALETTE.health.length]} />)}
                    </Bar>
                  </BarChart>
                </PrintChart>
              </div>
            </div>

            <div className="charts-row">
              <div className="chart-card">
                <div className="chart-header"><h3>ðŸ“Š Ù†Ø³Ø¨ Ø§Ù„Ø­Ø§Ù„Ø© Ø§Ù„ØµØ­ÙŠØ©</h3></div>
                <PrintChart height={350}>
                  <PieChart>
                    <Pie data={health.slice(0, 6)} cx="50%" cy="50%" outerRadius={120} innerRadius={50} dataKey="value"
                      label={renderCustomLabel} labelLine={false}>
                      {health.slice(0, 6).map((_, i) => <Cell key={i} fill={PALETTE.health[i]} />)}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </PrintChart>
              </div>

              <div className="chart-card">
                <div className="chart-header"><h3>ðŸ“‹ Ø¬Ø¯ÙˆÙ„ Ø§Ù„Ø­Ø§Ù„Ø© Ø§Ù„ØµØ­ÙŠØ©</h3></div>
                <div className="data-table-wrapper">
                  <table className="data-table">
                    <thead>
                      <tr><th>Ø§Ù„Ø­Ø§Ù„Ø©</th><th>Ø§Ù„Ø¹Ø¯Ø¯</th><th>Ø§Ù„Ù†Ø³Ø¨Ø©</th></tr>
                    </thead>
                    <tbody>
                      {health.map((d, i) => (
                        <tr key={i}>
                          <td>
                            <span className="legend-dot inline" style={{ background: PALETTE.health[i % PALETTE.health.length] }}></span>
                            {d.name}
                          </td>
                          <td className="num-cell">{d.value}</td>
                          <td className="num-cell">{d.percent}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>)}

        {/* ===== GEOGRAPHY ===== */}
        {(activeTab === 'geography' || printMode) && (
        <div className="tab-panel">
          {printMode && <h2 className="print-section-title">ðŸ—ºï¸ Ø§Ù„ØªÙˆØ²ÙŠØ¹ Ø§Ù„Ø¬ØºØ±Ø§ÙÙŠ</h2>}
          <div className="charts-section">
            <div className="charts-row">
              <div className="chart-card">
                <div className="chart-header"><h3>ðŸ—ºï¸ Ù…ÙƒØ§Ù† Ø§Ù„ØªØ¯Ø®Ù„</h3></div>
                <PrintChart height={350}>
                  <BarChart data={lieuIntervention} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="name" stroke="#6b7280" fontSize={12} />
                    <YAxis stroke="#6b7280" fontSize={12} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="value" name="Ø§Ù„Ø¹Ø¯Ø¯" radius={[6, 6, 0, 0]}>
                      {lieuIntervention.map((_, i) => <Cell key={i} fill={PALETTE.lieu[i % PALETTE.lieu.length]} />)}
                    </Bar>
                  </BarChart>
                </PrintChart>
                <div className="chart-legend-list">
                  {lieuIntervention.map((d, i) => (
                    <div key={i} className="legend-item">
                      <span className="legend-dot" style={{ background: PALETTE.lieu[i % PALETTE.lieu.length] }}></span>
                      <span className="legend-name">{d.name}</span>
                      <span className="legend-val">{d.value} ({d.percent}%)</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="chart-card">
                <div className="chart-header"><h3>ðŸ›ï¸ Ø§Ù„Ø¬Ù‡Ø© Ø§Ù„Ù…ÙˆØ¬Ù‡Ø©</h3></div>
                <PrintChart height={350}>
                  <BarChart data={entiteOrientatrice} layout="vertical" margin={{ top: 10, right: 30, left: 140, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis type="number" stroke="#6b7280" fontSize={12} />
                    <YAxis type="category" dataKey="name" stroke="#6b7280" fontSize={12} width={140} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="value" name="Ø§Ù„Ø¹Ø¯Ø¯" fill="#0ea5e9" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </PrintChart>
              </div>
            </div>

            <div className="charts-row">
              <div className="chart-card chart-full">
                <div className="chart-header"><h3>ðŸ™ï¸ Ø£Ù‡Ù… Ù…Ø¯Ù† Ø§Ù„Ø§Ø²Ø¯ÙŠØ§Ø¯ (Ø£Ø¹Ù„Ù‰ 20)</h3></div>
                <PrintChart height={400}>
                  <BarChart data={birthPlace} layout="vertical" margin={{ top: 10, right: 30, left: 120, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis type="number" stroke="#6b7280" fontSize={12} />
                    <YAxis type="category" dataKey="name" stroke="#6b7280" fontSize={12} width={120} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="value" name="Ø§Ù„Ø¹Ø¯Ø¯" fill="#14b8a6" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </PrintChart>
              </div>
            </div>
          </div>
        </div>)}

        {/* ===== TIMELINE ===== */}
        {(activeTab === 'timeline' || printMode) && (
        <div className="tab-panel">
          {printMode && <h2 className="print-section-title">ðŸ“ˆ Ø§Ù„ØªØ·ÙˆØ± Ø§Ù„Ø²Ù…Ù†ÙŠ</h2>}
          <div className="charts-section">
            <div className="charts-row">
              <div className="chart-card chart-full">
                <div className="chart-header"><h3>ðŸ“ˆ ØªØ·ÙˆØ± Ø§Ù„Ø¯Ø®ÙˆÙ„ Ø­Ø³Ø¨ Ø§Ù„Ø³Ù†Ø©</h3></div>
                <PrintChart height={300}>
                  <AreaChart data={entryTimeline} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorEntry" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="name" stroke="#6b7280" fontSize={12} />
                    <YAxis stroke="#6b7280" fontSize={12} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="value" name="Ø§Ù„Ø¯Ø®ÙˆÙ„" stroke="#0ea5e9" strokeWidth={3}
                      fill="url(#colorEntry)" dot={{ fill: '#0ea5e9', r: 4 }} activeDot={{ r: 6 }} />
                  </AreaChart>
                </PrintChart>
              </div>
            </div>

            <div className="charts-row">
              <div className="chart-card chart-full">
                <div className="chart-header"><h3>ðŸ“Š Ø§Ù„Ø¯Ø®ÙˆÙ„ Ù…Ù‚Ø§Ø¨Ù„ Ø§Ù„Ø®Ø±ÙˆØ¬ Ø­Ø³Ø¨ Ø§Ù„Ø³Ù†Ø©</h3></div>
                <PrintChart height={350}>
                  <BarChart data={entryVsExit} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="name" stroke="#6b7280" fontSize={13} />
                    <YAxis stroke="#6b7280" fontSize={12} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Bar dataKey="entries" name="Ø§Ù„Ø¯Ø®ÙˆÙ„" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="exits" name="Ø§Ù„Ø®Ø±ÙˆØ¬" fill="#f97316" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </PrintChart>
              </div>
            </div>

            {monthlyEntry.length > 0 && (
              <div className="charts-row">
                <div className="chart-card chart-full">
                  <div className="chart-header"><h3>ðŸ“… Ø§Ù„Ø¯Ø®ÙˆÙ„ Ø§Ù„Ø´Ù‡Ø±ÙŠ (Ø¢Ø®Ø± Ø³Ù†ØªÙŠÙ†)</h3></div>
                  <PrintChart height={300}>
                    <AreaChart data={monthlyEntry} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorMonthly" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#22c55e" stopOpacity={0.8} />
                          <stop offset="95%" stopColor="#22c55e" stopOpacity={0.05} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="name" stroke="#6b7280" fontSize={11} angle={-25} textAnchor="end" height={60} />
                      <YAxis stroke="#6b7280" fontSize={12} />
                      <Tooltip content={<CustomTooltip />} />
                      <Area type="monotone" dataKey="value" name="Ø§Ù„Ø¯Ø®ÙˆÙ„" stroke="#22c55e" strokeWidth={2}
                        fill="url(#colorMonthly)" dot={{ fill: '#22c55e', r: 3 }} />
                    </AreaChart>
                  </PrintChart>
                </div>
              </div>
            )}

            <div className="charts-row">
              <div className="chart-card">
                <div className="chart-header"><h3>ðŸšª ØªØ·ÙˆØ± Ø§Ù„Ø®Ø±ÙˆØ¬ Ø­Ø³Ø¨ Ø§Ù„Ø³Ù†Ø©</h3></div>
                <PrintChart height={300}>
                  <AreaChart data={departTimeline} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorDepart" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f97316" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#f97316" stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="name" stroke="#6b7280" fontSize={12} />
                    <YAxis stroke="#6b7280" fontSize={12} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="value" name="Ø§Ù„Ø®Ø±ÙˆØ¬" stroke="#f97316" strokeWidth={2}
                      fill="url(#colorDepart)" dot={{ fill: '#f97316', r: 4 }} />
                  </AreaChart>
                </PrintChart>
              </div>

              <div className="chart-card">
                <div className="chart-header"><h3>â±ï¸ Ù…Ø¯Ø© Ø§Ù„Ø¥Ù‚Ø§Ù…Ø©</h3></div>
                <PrintChart height={300}>
                  <BarChart data={stayDuration} layout="vertical" margin={{ top: 10, right: 30, left: 80, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis type="number" stroke="#6b7280" fontSize={12} />
                    <YAxis type="category" dataKey="name" stroke="#6b7280" fontSize={12} width={80} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="value" name="Ø§Ù„Ø¹Ø¯Ø¯" fill="#8b5cf6" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </PrintChart>
              </div>
            </div>
          </div>
        </div>)}
      </div>

      {/* Footer summary */}
      <div className="analytics-footer">
        <div className="footer-stat">
          <span className="footer-label">Ø§Ù„Ù…Ø¬Ù…ÙˆØ¹</span>
          <span className="footer-val">{overview.total}</span>
        </div>
        <div className="footer-stat">
          <span className="footer-label">Ù†Ø²Ù„Ø§Ø¡</span>
          <span className="footer-val">{overview.heberge}</span>
        </div>
        <div className="footer-stat">
          <span className="footer-label">Ø®Ø±Ø¬ÙˆØ§</span>
          <span className="footer-val">{overview.sorti}</span>
        </div>
        <div className="footer-stat">
          <span className="footer-label">Ù…ØªÙˆØ³Ø· Ø§Ù„Ø¥Ù‚Ø§Ù…Ø©</span>
          <span className="footer-val">{overview.avgStayDays} ÙŠÙˆÙ…</span>
        </div>
      </div>
    </div>
    </PrintContext.Provider>
  );
}

export default AnalyticsDashboard;
