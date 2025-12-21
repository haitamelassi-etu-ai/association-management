import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { API_URL } from '../utils/api';
import './PharmacyStock.css';

const PharmacyStock = () => {
  const { t } = useTranslation();
  const [medications, setMedications] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [expiringSoon, setExpiringSoon] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [message, setMessage] = useState({ text: '', type: '' });

  const [newMedication, setNewMedication] = useState({
    medicationName: '',
    genericName: '',
    category: 'other',
    dosageForm: 'tablet',
    strength: '',
    stock: 0,
    minStockLevel: 20,
    expiryDate: '',
    batchNumber: '',
    supplier: '',
    costPerUnit: 0,
    storageInstructions: ''
  });

  const categories = [
    { value: 'all', label: 'الكل', icon: '💊' },
    { value: 'antibiotics', label: 'مضادات حيوية', icon: '🦠' },
    { value: 'painkillers', label: 'مسكنات', icon: '💉' },
    { value: 'diabetes', label: 'السكري', icon: '🩸' },
    { value: 'hypertension', label: 'ضغط الدم', icon: '❤️' },
    { value: 'vitamins', label: 'فيتامينات', icon: '🌟' },
    { value: 'gastrointestinal', label: 'الجهاز الهضمي', icon: '🫃' },
    { value: 'respiratory', label: 'الجهاز التنفسي', icon: '🫁' },
    { value: 'cardiac', label: 'القلب', icon: '💗' },
    { value: 'psychiatric', label: 'نفسية', icon: '🧠' },
    { value: 'other', label: 'أخرى', icon: '📦' }
  ];

  const dosageForms = [
    { value: 'tablet', label: 'قرص' },
    { value: 'capsule', label: 'كبسولة' },
    { value: 'syrup', label: 'شراب' },
    { value: 'injection', label: 'حقنة' },
    { value: 'cream', label: 'كريم' },
    { value: 'drops', label: 'قطرة' },
    { value: 'inhaler', label: 'بخاخ' },
    { value: 'suppository', label: 'تحميلة' }
  ];

  const getToken = () => {
    const professionalUser = localStorage.getItem('professionalUser');
    if (professionalUser) {
      const userData = JSON.parse(professionalUser);
      return userData.token;
    }
    return localStorage.getItem('token');
  };

  const showMessage = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 5000);
  };

  useEffect(() => {
    fetchMedications();
    fetchAlerts();
  }, [selectedCategory]);

  const fetchMedications = async () => {
    setLoading(true);
    try {
      const token = getToken();
      let url = `${API_URL}/pharmacy?active=true`;
      if (selectedCategory !== 'all') {
        url += `&category=${selectedCategory}`;
      }
      if (searchTerm) {
        url += `&search=${searchTerm}`;
      }

      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const result = await response.json();
      if (result.success) {
        setMedications(result.data);
      }
    } catch (error) {
      console.error('Error fetching medications:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAlerts = async () => {
    try {
      const token = getToken();
      
      const [lowStockRes, expiringSoonRes] = await Promise.all([
        fetch(`${API_URL}/pharmacy/alerts/low-stock`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${API_URL}/pharmacy/alerts/expiring-soon`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      const lowStockData = await lowStockRes.json();
      const expiringData = await expiringSoonRes.json();

      if (lowStockData.success) setLowStock(lowStockData.data);
      if (expiringData.success) setExpiringSoon(expiringData.data);
    } catch (error) {
      console.error('Error fetching alerts:', error);
    }
  };

  const handleAddMedication = async (e) => {
    e.preventDefault();
    setLoading(true);

    console.log('📤 Envoi données médicament:', newMedication);

    try {
      const token = getToken();
      const response = await fetch(`${API_URL}/pharmacy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newMedication)
      });

      const result = await response.json();

      console.log('📥 Réponse serveur:', result);

      if (result.success) {
        showMessage('✅ تمت إضافة الدواء للصيدلية', 'success');
        setShowAddModal(false);
        setNewMedication({
          medicationName: '',
          genericName: '',
          category: 'other',
          dosageForm: 'tablet',
          strength: '',
          stock: 0,
          minStockLevel: 20,
          expiryDate: '',
          batchNumber: '',
          supplier: '',
          costPerUnit: 0,
          storageInstructions: ''
        });
        fetchMedications();
        fetchAlerts();
      } else {
        console.error('❌ Erreur serveur:', result);
        showMessage(`❌ ${result.message || 'خطأ في الإضافة'}`, 'error');
      }
    } catch (error) {
      console.error('Error adding medication:', error);
      showMessage('❌ ' + (error.message || 'حدث خطأ في إضافة الدواء'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStock = async (medicationId, operation, quantity) => {
    try {
      const token = getToken();
      console.log('📤 Updating stock:', { medicationId, operation, quantity });
      
      const response = await fetch(`${API_URL}/pharmacy/${medicationId}/stock`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          stock: quantity,
          operation // 'add', 'subtract', 'set'
        })
      });

      console.log('📥 Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Server error:', errorText);
        throw new Error(`Server error: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ Update result:', result);

      if (result.success) {
        showMessage('✅ تم تحديث المخزون', 'success');
        fetchMedications();
        fetchAlerts();
      } else {
        showMessage(`❌ ${result.message || 'خطأ في التحديث'}`, 'error');
      }
    } catch (error) {
      console.error('❌ Error updating stock:', error);
      showMessage(`❌ ${error.message || 'حدث خطأ في التحديث'}`, 'error');
    }
  };

  const getCategoryIcon = (category) => {
    const cat = categories.find(c => c.value === category);
    return cat ? cat.icon : '💊';
  };

  const isExpiringSoon = (expiryDate) => {
    if (!expiryDate) return false;
    const today = new Date();
    const expiry = new Date(expiryDate);
    const daysUntilExpiry = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry <= 30 && daysUntilExpiry > 0;
  };

  const isExpired = (expiryDate) => {
    if (!expiryDate) return false;
    return new Date() > new Date(expiryDate);
  };

  return (
    <div className="pharmacy-stock">
      <div className="pharmacy-header">
        <div>
          <h2>🏥 صيدلية المخزون</h2>
          <p className="pharmacy-subtitle">إدارة مخزون الأدوية المتوفرة</p>
        </div>
        <button className="btn-add" onClick={() => setShowAddModal(true)}>
          ➕ إضافة دواء للمخزون
        </button>
      </div>

      {message.text && (
        <div className={`pharmacy-message ${message.type}`}>
          {message.text}
        </div>
      )}

      {/* Alerts */}
      {(lowStock.length > 0 || expiringSoon.length > 0) && (
        <div className="alerts-section">
          {lowStock.length > 0 && (
            <div className="alert-box low-stock">
              <h4>⚠️ مخزون منخفض ({lowStock.length})</h4>
              <div className="alert-items">
                {lowStock.slice(0, 3).map(med => (
                  <div key={med._id} className="alert-item">
                    {med.medicationName} - المخزون: {med.stock}
                    <button
                      className="btn-quick-add"
                      onClick={() => handleUpdateStock(med._id, 'add', 50)}
                    >
                      + 50
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {expiringSoon.length > 0 && (
            <div className="alert-box expiring">
              <h4>📅 ينتهي قريباً ({expiringSoon.length})</h4>
              <div className="alert-items">
                {expiringSoon.slice(0, 3).map(med => (
                  <div key={med._id} className="alert-item">
                    {med.medicationName} - {new Date(med.expiryDate).toLocaleDateString('ar-MA')}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="pharmacy-filters">
        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="ابحث عن دواء..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              if (e.target.value.length > 2 || e.target.value.length === 0) {
                setTimeout(fetchMedications, 500);
              }
            }}
          />
        </div>

        <div className="category-filters">
          {categories.map(cat => (
            <button
              key={cat.value}
              className={`category-btn ${selectedCategory === cat.value ? 'active' : ''}`}
              onClick={() => setSelectedCategory(cat.value)}
            >
              {cat.icon} {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Medications Grid */}
      <div className="medications-grid">
        {loading ? (
          <div className="loading-spinner">جاري التحميل...</div>
        ) : medications.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🏥</div>
            <p>لا توجد أدوية في المخزون</p>
            <button className="btn-add" onClick={() => setShowAddModal(true)}>
              ➕ إضافة أول دواء
            </button>
          </div>
        ) : (
          medications.map(med => (
            <div key={med._id} className="medication-card-pharmacy">
              <div className="medication-card-header-pharmacy">
                <div className="med-icon">{getCategoryIcon(med.category)}</div>
                <div className="med-info">
                  <h3>{med.medicationName}</h3>
                  {med.genericName && <p className="generic-name">{med.genericName}</p>}
                </div>
              </div>

              <div className="medication-details-pharmacy">
                <div className="detail-item">
                  <span className="label">الشكل:</span>
                  <span className="value">{dosageForms.find(d => d.value === med.dosageForm)?.label}</span>
                </div>
                <div className="detail-item">
                  <span className="label">التركيز:</span>
                  <span className="value">{med.strength}</span>
                </div>
                <div className="detail-item">
                  <span className="label">المخزون:</span>
                  <span className={`value stock-value ${med.isLowStock ? 'low' : ''}`}>
                    {med.stock} وحدة
                  </span>
                </div>
                {med.expiryDate && (
                  <div className="detail-item">
                    <span className="label">الصلاحية:</span>
                    <span className={`value ${isExpired(med.expiryDate) ? 'expired' : isExpiringSoon(med.expiryDate) ? 'expiring' : ''}`}>
                      {new Date(med.expiryDate).toLocaleDateString('ar-MA')}
                    </span>
                  </div>
                )}
                {med.batchNumber && (
                  <div className="detail-item">
                    <span className="label">رقم الدفعة:</span>
                    <span className="value">{med.batchNumber}</span>
                  </div>
                )}
              </div>

              <div className="medication-actions">
                <button
                  className="btn-stock-add"
                  onClick={() => {
                    const qty = prompt('كم وحدة تريد إضافة؟', '50');
                    if (qty) handleUpdateStock(med._id, 'add', parseInt(qty));
                  }}
                >
                  ➕ إضافة
                </button>
                <button
                  className="btn-stock-subtract"
                  onClick={() => {
                    const qty = prompt('كم وحدة تريد إنقاص؟', '10');
                    if (qty) handleUpdateStock(med._id, 'subtract', parseInt(qty));
                  }}
                >
                  ➖ إنقاص
                </button>
                <button
                  className="btn-stock-set"
                  onClick={() => {
                    const qty = prompt('المخزون الجديد:', med.stock.toString());
                    if (qty) handleUpdateStock(med._id, 'set', parseInt(qty));
                  }}
                >
                  ⚙️ تعديل
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Medication Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>➕ إضافة دواء للصيدلية</h3>
              <button className="modal-close" onClick={() => setShowAddModal(false)}>✕</button>
            </div>

            <form onSubmit={handleAddMedication} className="pharmacy-form">
              <div className="form-row">
                <label>اسم الدواء التجاري *</label>
                <input
                  type="text"
                  value={newMedication.medicationName}
                  onChange={(e) => setNewMedication({ ...newMedication, medicationName: e.target.value })}
                  required
                  placeholder="مثال: Paracetamol"
                />
              </div>

              <div className="form-row">
                <label>الاسم العلمي</label>
                <input
                  type="text"
                  value={newMedication.genericName}
                  onChange={(e) => setNewMedication({ ...newMedication, genericName: e.target.value })}
                  placeholder="مثال: Acetaminophen"
                />
              </div>

              <div className="form-row">
                <label>الفئة *</label>
                <select
                  value={newMedication.category}
                  onChange={(e) => setNewMedication({ ...newMedication, category: e.target.value })}
                  required
                >
                  {categories.filter(c => c.value !== 'all').map(cat => (
                    <option key={cat.value} value={cat.value}>
                      {cat.icon} {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-row">
                <label>الشكل الدوائي *</label>
                <select
                  value={newMedication.dosageForm}
                  onChange={(e) => setNewMedication({ ...newMedication, dosageForm: e.target.value })}
                  required
                >
                  {dosageForms.map(form => (
                    <option key={form.value} value={form.value}>{form.label}</option>
                  ))}
                </select>
              </div>

              <div className="form-row">
                <label>التركيز *</label>
                <input
                  type="text"
                  value={newMedication.strength}
                  onChange={(e) => setNewMedication({ ...newMedication, strength: e.target.value })}
                  required
                  placeholder="مثال: 500mg"
                />
              </div>

              <div className="form-row">
                <label>الكمية الأولية *</label>
                <input
                  type="number"
                  value={newMedication.stock}
                  onChange={(e) => setNewMedication({ ...newMedication, stock: parseInt(e.target.value) })}
                  required
                  min="0"
                />
              </div>

              <div className="form-row">
                <label>حد التنبيه</label>
                <input
                  type="number"
                  value={newMedication.minStockLevel}
                  onChange={(e) => setNewMedication({ ...newMedication, minStockLevel: parseInt(e.target.value) })}
                  min="0"
                />
              </div>

              <div className="form-row">
                <label>تاريخ الانتهاء</label>
                <input
                  type="date"
                  value={newMedication.expiryDate}
                  onChange={(e) => setNewMedication({ ...newMedication, expiryDate: e.target.value })}
                />
              </div>

              <div className="form-row">
                <label>رقم الدفعة</label>
                <input
                  type="text"
                  value={newMedication.batchNumber}
                  onChange={(e) => setNewMedication({ ...newMedication, batchNumber: e.target.value })}
                />
              </div>

              <div className="form-row">
                <label>المورد</label>
                <input
                  type="text"
                  value={newMedication.supplier}
                  onChange={(e) => setNewMedication({ ...newMedication, supplier: e.target.value })}
                />
              </div>

              <div className="form-row">
                <label>التكلفة للوحدة (درهم)</label>
                <input
                  type="number"
                  step="0.01"
                  value={newMedication.costPerUnit}
                  onChange={(e) => setNewMedication({ ...newMedication, costPerUnit: parseFloat(e.target.value) })}
                  min="0"
                />
              </div>

              <div className="form-row">
                <label>تعليمات التخزين</label>
                <textarea
                  value={newMedication.storageInstructions}
                  onChange={(e) => setNewMedication({ ...newMedication, storageInstructions: e.target.value })}
                  rows="2"
                  placeholder="مثال: يحفظ في مكان بارد وجاف"
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowAddModal(false)}>
                  إلغاء
                </button>
                <button type="submit" className="btn-submit" disabled={loading}>
                  {loading ? 'جاري الحفظ...' : '💾 حفظ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PharmacyStock;
