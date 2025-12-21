import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import './AdvancedReports.css';
import { API_URL } from '../utils/api';

const AdvancedReports = () => {
  const { t } = useTranslation();
  const [activeReport, setActiveReport] = useState('financial');
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [loading, setLoading] = useState(false);
  const [financialData, setFinancialData] = useState(null);
  const [servicesData, setServicesData] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [message, setMessage] = useState({ text: '', type: '' });

  const COLORS = ['#667eea', '#f093fb', '#4ade80', '#fbbf24', '#f87171', '#a78bfa'];

  const showMessage = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 5000);
  };

  const fetchFinancialReport = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${API_URL}/reports/advanced/financial?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );

      const result = await response.json();
      if (result.success) {
        setFinancialData(result.data);
      }
    } catch (error) {
      console.error('Error fetching financial report:', error);
      showMessage(t('common.error'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchServicesReport = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${API_URL}/reports/advanced/services?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );

      const result = await response.json();
      if (result.success) {
        setServicesData(result.data);
      }
    } catch (error) {
      console.error('Error fetching services report:', error);
      showMessage(t('common.error'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchDashboardReport = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${API_URL}/reports/advanced/dashboard`,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );

      const result = await response.json();
      if (result.success) {
        setDashboardData(result.data);
      }
    } catch (error) {
      console.error('Error fetching dashboard report:', error);
      showMessage(t('common.error'), 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeReport === 'financial') {
      fetchFinancialReport();
    } else if (activeReport === 'services') {
      fetchServicesReport();
    } else if (activeReport === 'dashboard') {
      fetchDashboardReport();
    }
  }, [activeReport, dateRange]);

  const handleExport = (type) => {
    if (type === 'financial' && financialData) {
      downloadJSON(financialData, `financial_report_${Date.now()}.json`);
      showMessage(t('reports.exportSuccess'), 'success');
    } else if (type === 'services' && servicesData) {
      downloadJSON(servicesData, `services_report_${Date.now()}.json`);
      showMessage(t('reports.exportSuccess'), 'success');
    }
  };

  const downloadJSON = (data, filename) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="advanced-reports">
      <div className="reports-header">
        <div>
          <h2>📊 {t('reports.advancedReports')}</h2>
          <p className="reports-subtitle">{t('reports.subtitle')}</p>
        </div>
      </div>

      {message.text && (
        <div className={`report-message ${message.type}`}>
          {message.text}
        </div>
      )}

      {/* Report Type Selector */}
      <div className="report-tabs">
        <button
          className={`tab ${activeReport === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveReport('dashboard')}
        >
          📈 {t('reports.dashboard')}
        </button>
        <button
          className={`tab ${activeReport === 'financial' ? 'active' : ''}`}
          onClick={() => setActiveReport('financial')}
        >
          💰 {t('reports.financial')}
        </button>
        <button
          className={`tab ${activeReport === 'services' ? 'active' : ''}`}
          onClick={() => setActiveReport('services')}
        >
          🛎️ {t('reports.services')}
        </button>
      </div>

      {/* Date Range Selector */}
      {activeReport !== 'dashboard' && (
        <div className="date-range-selector">
          <div className="date-inputs">
            <div className="date-group">
              <label>{t('reports.startDate')}</label>
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
              />
            </div>
            <div className="date-group">
              <label>{t('reports.endDate')}</label>
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
              />
            </div>
          </div>
          <button className="btn-export" onClick={() => handleExport(activeReport)}>
            📥 {t('reports.export')}
          </button>
        </div>
      )}

      {loading && (
        <div className="loading-container">
          <div className="spinner"></div>
          <p>{t('common.loading')}</p>
        </div>
      )}

      {/* Dashboard Report */}
      {activeReport === 'dashboard' && dashboardData && !loading && (
        <div className="report-content">
          <div className="stats-overview">
            <div className="stat-box blue">
              <div className="stat-icon">👥</div>
              <div className="stat-info">
                <div className="stat-value">{dashboardData.current.totalBeneficiaries}</div>
                <div className="stat-label">{t('reports.totalBeneficiaries')}</div>
              </div>
            </div>
            <div className="stat-box green">
              <div className="stat-icon">🏠</div>
              <div className="stat-info">
                <div className="stat-value">{dashboardData.current.activeBeneficiaries}</div>
                <div className="stat-label">{t('reports.active')}</div>
              </div>
            </div>
            <div className="stat-box orange">
              <div className="stat-icon">➕</div>
              <div className="stat-info">
                <div className="stat-value">{dashboardData.current.newThisMonth}</div>
                <div className="stat-label">{t('reports.newThisMonth')}</div>
              </div>
            </div>
            <div className="stat-box purple">
              <div className="stat-icon">🍽️</div>
              <div className="stat-info">
                <div className="stat-value">{dashboardData.current.todayMeals}</div>
                <div className="stat-label">{t('reports.todayMeals')}</div>
              </div>
            </div>
          </div>

          {/* Trends Charts */}
          <div className="charts-grid">
            <div className="chart-card">
              <h3>{t('reports.beneficiariesTrend')}</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={dashboardData.trends.beneficiaries}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="_id" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="count" stroke="#667eea" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-card">
              <h3>{t('reports.mealsTrend')}</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={dashboardData.trends.meals}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="_id" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="count" stroke="#4ade80" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Financial Report */}
      {activeReport === 'financial' && financialData && !loading && (
        <div className="report-content">
          <div className="financial-summary">
            <div className="summary-card">
              <h3>💰 {t('reports.financialSummary')}</h3>
              <div className="summary-items">
                <div className="summary-item">
                  <span>{t('reports.mealsCost')}</span>
                  <strong>{financialData.summary.totalMealCost.toFixed(2)} DH</strong>
                </div>
                <div className="summary-item">
                  <span>{t('reports.accommodationCost')}</span>
                  <strong>{financialData.summary.totalAccommodationCost.toFixed(2)} DH</strong>
                </div>
                <div className="summary-item total">
                  <span>{t('reports.grandTotal')}</span>
                  <strong>{financialData.summary.grandTotal.toFixed(2)} DH</strong>
                </div>
              </div>
            </div>

            <div className="summary-card">
              <h3>🍽️ {t('reports.mealsBreakdown')}</h3>
              <div className="summary-items">
                <div className="summary-item">
                  <span>{t('reports.totalMeals')}</span>
                  <strong>{financialData.meals.totalMeals}</strong>
                </div>
                <div className="summary-item">
                  <span>{t('reports.averageCost')}</span>
                  <strong>{financialData.meals.averageCostPerMeal?.toFixed(2) || 0} DH</strong>
                </div>
                <div className="summary-item">
                  <span>{t('reports.totalCost')}</span>
                  <strong>{financialData.meals.totalMealCost.toFixed(2)} DH</strong>
                </div>
              </div>
            </div>

            <div className="summary-card">
              <h3>🏠 {t('reports.accommodation')}</h3>
              <div className="summary-items">
                <div className="summary-item">
                  <span>{t('reports.activeBeneficiaries')}</span>
                  <strong>{financialData.accommodation.activeBeneficiaries}</strong>
                </div>
                <div className="summary-item">
                  <span>{t('reports.costPerPerson')}</span>
                  <strong>{financialData.accommodation.costPerPerson} DH</strong>
                </div>
                <div className="summary-item">
                  <span>{t('reports.totalCost')}</span>
                  <strong>{financialData.accommodation.totalCost.toFixed(2)} DH</strong>
                </div>
              </div>
            </div>
          </div>

          <div className="chart-card full-width">
            <h3>{t('reports.costDistribution')}</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={[
                    { name: t('reports.meals'), value: financialData.summary.totalMealCost },
                    { name: t('reports.accommodation'), value: financialData.summary.totalAccommodationCost }
                  ]}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {[0, 1].map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Services Report */}
      {activeReport === 'services' && servicesData && !loading && (
        <div className="report-content">
          <div className="services-overview">
            <div className="overview-card">
              <h3>🍽️ {t('reports.mealsService')}</h3>
              <div className="overview-stats">
                <div className="stat-item">
                  <span>{t('reports.total')}</span>
                  <strong>{servicesData.meals.total}</strong>
                </div>
                <div className="stat-item">
                  <span>{t('reports.served')}</span>
                  <strong className="green">{servicesData.meals.totalServed}</strong>
                </div>
                <div className="stat-item">
                  <span>{t('reports.pending')}</span>
                  <strong className="orange">{servicesData.meals.totalPending}</strong>
                </div>
              </div>
            </div>

            <div className="overview-card">
              <h3>⏰ {t('reports.attendance')}</h3>
              <div className="overview-stats">
                <div className="stat-item">
                  <span>{t('reports.totalCheckIns')}</span>
                  <strong>{servicesData.attendance.totalCheckIns}</strong>
                </div>
                <div className="stat-item">
                  <span>{t('reports.avgHours')}</span>
                  <strong>{servicesData.attendance.averageHoursWorked?.toFixed(1) || 0}h</strong>
                </div>
              </div>
            </div>

            <div className="overview-card">
              <h3>👥 {t('reports.beneficiariesStats')}</h3>
              <div className="overview-stats">
                <div className="stat-item">
                  <span>{t('reports.total')}</span>
                  <strong>{servicesData.beneficiaries.total}</strong>
                </div>
                <div className="stat-item">
                  <span>{t('reports.newInPeriod')}</span>
                  <strong className="blue">{servicesData.beneficiaries.newInPeriod}</strong>
                </div>
              </div>
            </div>
          </div>

          <div className="charts-grid">
            <div className="chart-card">
              <h3>{t('reports.mealsByType')}</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={servicesData.meals.byType}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="_id" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="total" fill="#667eea" name={t('reports.total')} />
                  <Bar dataKey="served" fill="#4ade80" name={t('reports.served')} />
                  <Bar dataKey="pending" fill="#fbbf24" name={t('reports.pending')} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-card">
              <h3>{t('reports.beneficiariesByStatus')}</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={servicesData.beneficiaries.byStatus}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ _id, count }) => `${_id}: ${count}`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {servicesData.beneficiaries.byStatus.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdvancedReports;
