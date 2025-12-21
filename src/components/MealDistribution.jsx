import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { API_URL } from '../utils/api';
import './MealDistribution.css';

const MealDistribution = () => {
  const { t } = useTranslation();
  const [meals, setMeals] = useState([]);
  const [beneficiaries, setBeneficiaries] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedMealType, setSelectedMealType] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  const [newMeal, setNewMeal] = useState({
    beneficiaryId: '',
    mealType: 'lunch',
    quantity: 1,
    menuItems: '',
    specialDiet: 'none',
    cost: 0,
    notes: ''
  });

  const mealTypes = [
    { value: 'breakfast', label: t('meals.breakfast'), icon: '🌅', time: '7:00-9:00' },
    { value: 'lunch', label: t('meals.lunch'), icon: '☀️', time: '12:00-14:00' },
    { value: 'dinner', label: t('meals.dinner'), icon: '🌙', time: '19:00-21:00' },
    { value: 'snack', label: t('meals.snack'), icon: '🍪', time: '15:00-17:00' }
  ];

  const dietTypes = [
    { value: 'none', label: t('meals.noDiet') },
    { value: 'vegetarian', label: t('meals.vegetarian') },
    { value: 'vegan', label: t('meals.vegan') },
    { value: 'halal', label: t('meals.halal') },
    { value: 'gluten-free', label: t('meals.glutenFree') },
    { value: 'diabetic', label: t('meals.diabetic') }
  ];

  const showMessage = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 5000);
  };

  const fetchMeals = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      let url = `${API_URL}/meals?date=${selectedDate}`;
      if (selectedMealType !== 'all') {
        url += `&mealType=${selectedMealType}`;
      }

      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const result = await response.json();
      if (result.success) {
        setMeals(result.data);
      }
    } catch (error) {
      console.error('Error fetching meals:', error);
      showMessage(t('common.error'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/meals/stats/daily?date=${selectedDate}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const result = await response.json();
      if (result.success) {
        setStats(result);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchBeneficiaries = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/beneficiaries`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const result = await response.json();
      if (result.success) {
        setBeneficiaries(result.data.filter(b => b.statutHebergement === 'heberge'));
      }
    } catch (error) {
      console.error('Error fetching beneficiaries:', error);
    }
  };

  useEffect(() => {
    fetchMeals();
    fetchStats();
    fetchBeneficiaries();
  }, [selectedDate, selectedMealType]);

  const handleAddMeal = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const menuItemsArray = newMeal.menuItems.split(',').map(item => item.trim()).filter(item => item);

      const response = await fetch(`${API_URL}/meals`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...newMeal,
          menuItems: menuItemsArray,
          date: selectedDate
        })
      });

      const result = await response.json();

      if (result.success) {
        showMessage(t('meals.addSuccess'), 'success');
        setShowAddModal(false);
        setNewMeal({
          beneficiaryId: '',
          mealType: 'lunch',
          quantity: 1,
          menuItems: '',
          specialDiet: 'none',
          cost: 0,
          notes: ''
        });
        fetchMeals();
        fetchStats();
      } else {
        showMessage(result.message, 'error');
      }
    } catch (error) {
      console.error('Error adding meal:', error);
      showMessage(t('common.error'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkCreate = async (mealType) => {
    if (!confirm(t('meals.bulkConfirm'))) return;

    setLoading(true);
    try {
      const token = getToken();
      const response = await fetch(`${API_URL}/meals/bulk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          mealType,
          date: selectedDate,
          cost: 0
        })
      });

      const result = await response.json();

      if (result.success) {
        showMessage(`✅ ${result.count} ${t('meals.mealsCreated')}`, 'success');
        fetchMeals();
        fetchStats();
      } else {
        showMessage(result.message, 'error');
      }
    } catch (error) {
      console.error('Error bulk creating:', error);
      showMessage(t('common.error'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDailyPlan = async () => {
    const confirmed = confirm(
      `هل تريد إنشاء خطة يومية كاملة؟\n` +
      `سيتم إنشاء 4 وجبات (فطور، غداء، وجبة خفيفة، عشاء) لجميع المستفيدين\n` +
      `التاريخ: ${selectedDate}`
    );
    
    if (!confirmed) return;

    setLoading(true);
    try {
      const token = getToken();
      const response = await fetch(`${API_URL}/meals/daily-plan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ date: selectedDate })
      });

      const result = await response.json();

      if (result.success) {
        showMessage(
          `✅ ${result.stats.totalMeals} وجبة تم إنشاؤها لـ ${result.stats.beneficiariesCount} مستفيد\n` +
          `التكلفة الإجمالية: ${result.stats.totalCost} درهم`,
          'success'
        );
        fetchMeals();
        fetchStats();
      } else {
        showMessage(result.message, 'error');
      }
    } catch (error) {
      console.error('Error creating daily plan:', error);
      showMessage(t('common.error'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkServed = async (mealId) => {
    try {
      const token = getToken();
      const response = await fetch(`${API_URL}/meals/${mealId}/serve`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const result = await response.json();

      if (result.success) {
        showMessage(t('meals.servedSuccess'), 'success');
        fetchMeals();
        fetchStats();
      } else {
        showMessage(result.message, 'error');
      }
    } catch (error) {
      console.error('Error marking served:', error);
      showMessage(t('common.error'), 'error');
    }
  };

  return (
    <div className="meal-distribution">
      <div className="meal-header">
        <div>
          <h2>🍽️ {t('meals.title')}</h2>
          <p className="meal-subtitle">{t('meals.subtitle')}</p>
        </div>
        <div className="meal-header-actions">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="date-input"
          />
          <select
            value={selectedMealType}
            onChange={(e) => setSelectedMealType(e.target.value)}
            className="meal-type-select"
          >
            <option value="all">{t('meals.allMeals')}</option>
            {mealTypes.map(type => (
              <option key={type.value} value={type.value}>
                {type.icon} {type.label}
              </option>
            ))}
          </select>
          <button className="btn-add" onClick={() => setShowAddModal(true)}>
            ➕ {t('meals.addMeal')}
          </button>
        </div>
      </div>

      {message.text && (
        <div className={`meal-message ${message.type}`}>
          {message.text}
        </div>
      )}

      {/* Statistics */}
      {stats && (
        <div className="meal-stats">
          <div className="stat-card-mini total">
            <div className="stat-icon">🍽️</div>
            <div>
              <div className="stat-value">{stats.totals.total}</div>
              <div className="stat-label">{t('meals.totalMeals')}</div>
            </div>
          </div>
          <div className="stat-card-mini served">
            <div className="stat-icon">✅</div>
            <div>
              <div className="stat-value">{stats.totals.served}</div>
              <div className="stat-label">{t('meals.served')}</div>
            </div>
          </div>
          <div className="stat-card-mini pending">
            <div className="stat-icon">⏳</div>
            <div>
              <div className="stat-value">{stats.totals.pending}</div>
              <div className="stat-label">{t('meals.pending')}</div>
            </div>
          </div>
          <div className="stat-card-mini cost">
            <div className="stat-icon">💰</div>
            <div>
              <div className="stat-value">{stats.totals.totalCost.toFixed(2)} DH</div>
              <div className="stat-label">{t('meals.totalCost')}</div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="quick-actions">
        <h3>{t('meals.quickActions')}</h3>
        <div className="action-buttons">
          <button
            className="action-btn daily-plan"
            onClick={handleCreateDailyPlan}
            disabled={loading}
            title="إنشاء 4 وجبات كاملة (فطور، غداء، وجبة خفيفة، عشاء) مع القوائم المعدّة"
          >
            📋 إنشاء خطة يومية كاملة
          </button>
          {mealTypes.map(type => (
            <button
              key={type.value}
              className="action-btn"
              onClick={() => handleBulkCreate(type.value)}
              disabled={loading}
            >
              {type.icon} {t('meals.createAllFor')} {type.label}
            </button>
          ))}
        </div>
      </div>

      {/* Meals List */}
      <div className="meals-list">
        {loading && <div className="loading-spinner">⏳ {t('common.loading')}</div>}
        
        {!loading && meals.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">🍽️</div>
            <p>{t('meals.noMeals')}</p>
          </div>
        )}

        <div className="meals-grid">
          {meals.map(meal => (
            <div key={meal._id} className={`meal-card ${meal.served ? 'served' : 'pending'}`}>
              <div className="meal-card-header">
                <div className="meal-type-badge">
                  {mealTypes.find(t => t.value === meal.mealType)?.icon}
                  {mealTypes.find(t => t.value === meal.mealType)?.label}
                </div>
                <div className={`status-badge ${meal.served ? 'served' : 'pending'}`}>
                  {meal.served ? '✅ ' + t('meals.served') : '⏳ ' + t('meals.pending')}
                </div>
              </div>

              <div className="meal-card-body">
                <div className="beneficiary-info">
                  <div className="beneficiary-avatar">
                    {meal.beneficiary?.prenom?.[0]}{meal.beneficiary?.nom?.[0]}
                  </div>
                  <div>
                    <div className="beneficiary-name">
                      {meal.beneficiary?.prenom} {meal.beneficiary?.nom}
                    </div>
                    <div className="beneficiary-cin">{meal.beneficiary?.cin}</div>
                  </div>
                </div>

                {meal.menuItems && meal.menuItems.length > 0 && (
                  <div className="menu-items">
                    <strong>{t('meals.menu')}:</strong> {meal.menuItems.join(', ')}
                  </div>
                )}

                {meal.specialDiet && meal.specialDiet !== 'none' && (
                  <div className="special-diet">
                    🥗 {dietTypes.find(d => d.value === meal.specialDiet)?.label}
                  </div>
                )}

                <div className="meal-meta">
                  <span>📊 Qté: {meal.quantity}</span>
                  <span>💰 {meal.cost} DH</span>
                </div>

                {meal.served && meal.servedBy && (
                  <div className="served-info">
                    <small>
                      {t('meals.servedBy')}: {meal.servedBy.name} 
                      <br />
                      {new Date(meal.servedAt).toLocaleTimeString()}
                    </small>
                  </div>
                )}
              </div>

              {!meal.served && (
                <div className="meal-card-footer">
                  <button
                    className="btn-serve"
                    onClick={() => handleMarkServed(meal._id)}
                  >
                    ✅ {t('meals.markServed')}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Add Meal Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{t('meals.addMeal')}</h3>
              <button className="modal-close" onClick={() => setShowAddModal(false)}>✕</button>
            </div>

            <form onSubmit={handleAddMeal} className="meal-form">
              <div className="form-group">
                <label>{t('beneficiaries.beneficiary')}</label>
                <select
                  value={newMeal.beneficiaryId}
                  onChange={(e) => setNewMeal({...newMeal, beneficiaryId: e.target.value})}
                  required
                >
                  <option value="">{t('common.select')}</option>
                  {beneficiaries.map(b => (
                    <option key={b._id} value={b._id}>
                      {b.prenom} {b.nom} - {b.cin}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>{t('meals.mealType')}</label>
                  <select
                    value={newMeal.mealType}
                    onChange={(e) => setNewMeal({...newMeal, mealType: e.target.value})}
                  >
                    {mealTypes.map(type => (
                      <option key={type.value} value={type.value}>
                        {type.icon} {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>{t('meals.quantity')}</label>
                  <input
                    type="number"
                    min="1"
                    value={newMeal.quantity}
                    onChange={(e) => setNewMeal({...newMeal, quantity: parseInt(e.target.value)})}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>{t('meals.menu')} ({t('meals.commaSeparated')})</label>
                <input
                  type="text"
                  placeholder="Couscous, Salade, Pain"
                  value={newMeal.menuItems}
                  onChange={(e) => setNewMeal({...newMeal, menuItems: e.target.value})}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>{t('meals.specialDiet')}</label>
                  <select
                    value={newMeal.specialDiet}
                    onChange={(e) => setNewMeal({...newMeal, specialDiet: e.target.value})}
                  >
                    {dietTypes.map(diet => (
                      <option key={diet.value} value={diet.value}>{diet.label}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>{t('meals.cost')} (DH)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={newMeal.cost}
                    onChange={(e) => setNewMeal({...newMeal, cost: parseFloat(e.target.value)})}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>{t('meals.notes')}</label>
                <textarea
                  rows="3"
                  placeholder={t('meals.notesPlaceholder')}
                  value={newMeal.notes}
                  onChange={(e) => setNewMeal({...newMeal, notes: e.target.value})}
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowAddModal(false)}>
                  {t('common.cancel')}
                </button>
                <button type="submit" className="btn-submit" disabled={loading}>
                  {loading ? t('common.loading') : t('common.save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MealDistribution;
