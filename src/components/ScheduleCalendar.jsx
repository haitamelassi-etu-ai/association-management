import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import './ScheduleCalendar.css'

function ScheduleCalendar({ schedules = [], onAddSchedule, onEditSchedule, onDeleteSchedule }) {
  const { t, i18n } = useTranslation()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [view, setView] = useState('month') // month, week, day
  const [showModal, setShowModal] = useState(false)
  const [selectedSchedule, setSelectedSchedule] = useState(null)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'meeting',
    startDate: '',
    startTime: '',
    endDate: '',
    endTime: '',
    allDay: false,
    location: '',
    color: '#3498db'
  })

  const scheduleTypes = [
    { value: 'appointment', label: 'Rendez-vous', icon: '📅', color: '#3498db' },
    { value: 'shift', label: 'Shift de travail', icon: '⏰', color: '#27ae60' },
    { value: 'meeting', label: 'Réunion', icon: '👥', color: '#9b59b6' },
    { value: 'event', label: 'Événement', icon: '🎉', color: '#e67e22' },
    { value: 'task', label: 'Tâche', icon: '✅', color: '#e74c3c' }
  ]

  const getDaysInMonth = (date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDay = firstDay.getDay()
    
    const days = []
    
    // Previous month days
    const prevMonthLastDay = new Date(year, month, 0).getDate()
    for (let i = startingDay - 1; i >= 0; i--) {
      days.push({
        date: new Date(year, month - 1, prevMonthLastDay - i),
        isCurrentMonth: false
      })
    }
    
    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        date: new Date(year, month, i),
        isCurrentMonth: true
      })
    }
    
    // Next month days
    const remainingDays = 42 - days.length
    for (let i = 1; i <= remainingDays; i++) {
      days.push({
        date: new Date(year, month + 1, i),
        isCurrentMonth: false
      })
    }
    
    return days
  }

  const getSchedulesForDate = (date) => {
    return schedules.filter(schedule => {
      const scheduleDate = new Date(schedule.startDate)
      return scheduleDate.toDateString() === date.toDateString()
    })
  }

  const formatDate = (date) => {
    return date.toLocaleDateString(i18n.language === 'ar' ? 'ar-MA' : 'fr-FR', {
      month: 'long',
      year: 'numeric'
    })
  }

  const navigate = (direction) => {
    const newDate = new Date(currentDate)
    if (view === 'month') {
      newDate.setMonth(newDate.getMonth() + direction)
    } else if (view === 'week') {
      newDate.setDate(newDate.getDate() + (direction * 7))
    } else {
      newDate.setDate(newDate.getDate() + direction)
    }
    setCurrentDate(newDate)
  }

  const goToToday = () => {
    setCurrentDate(new Date())
  }

  const handleOpenModal = (date = null, schedule = null) => {
    if (schedule) {
      setSelectedSchedule(schedule)
      const start = new Date(schedule.startDate)
      const end = new Date(schedule.endDate)
      setFormData({
        title: schedule.title,
        description: schedule.description || '',
        type: schedule.type,
        startDate: start.toISOString().split('T')[0],
        startTime: start.toTimeString().slice(0, 5),
        endDate: end.toISOString().split('T')[0],
        endTime: end.toTimeString().slice(0, 5),
        allDay: schedule.allDay || false,
        location: schedule.location || '',
        color: schedule.color || '#3498db'
      })
    } else {
      setSelectedSchedule(null)
      const dateStr = date ? date.toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
      setFormData({
        title: '',
        description: '',
        type: 'meeting',
        startDate: dateStr,
        startTime: '09:00',
        endDate: dateStr,
        endTime: '10:00',
        allDay: false,
        location: '',
        color: '#3498db'
      })
    }
    setShowModal(true)
  }

  const handleSave = () => {
    const startDateTime = new Date(`${formData.startDate}T${formData.startTime}`)
    const endDateTime = new Date(`${formData.endDate}T${formData.endTime}`)

    const scheduleData = {
      title: formData.title,
      description: formData.description,
      type: formData.type,
      startDate: startDateTime,
      endDate: endDateTime,
      allDay: formData.allDay,
      location: formData.location,
      color: formData.color
    }

    if (selectedSchedule) {
      onEditSchedule({ ...scheduleData, _id: selectedSchedule._id })
    } else {
      onAddSchedule(scheduleData)
    }

    setShowModal(false)
  }

  const days = getDaysInMonth(currentDate)
  const weekDays = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']

  return (
    <div className="schedule-calendar">
      <div className="calendar-header">
        <div className="calendar-title">
          <h2>📅 Planning</h2>
          <span className="current-date">{formatDate(currentDate)}</span>
        </div>
        
        <div className="calendar-controls">
          <div className="view-switcher">
            <button 
              className={view === 'month' ? 'active' : ''} 
              onClick={() => setView('month')}
            >
              Mois
            </button>
            <button 
              className={view === 'week' ? 'active' : ''} 
              onClick={() => setView('week')}
            >
              Semaine
            </button>
            <button 
              className={view === 'day' ? 'active' : ''} 
              onClick={() => setView('day')}
            >
              Jour
            </button>
          </div>

          <div className="nav-buttons">
            <button onClick={() => navigate(-1)}>←</button>
            <button onClick={goToToday}>Aujourd'hui</button>
            <button onClick={() => navigate(1)}>→</button>
          </div>

          <button className="add-schedule-btn" onClick={() => handleOpenModal()}>
            ➕ Ajouter
          </button>
        </div>
      </div>

      <div className="calendar-grid">
        <div className="weekday-headers">
          {weekDays.map(day => (
            <div key={day} className="weekday-header">{day}</div>
          ))}
        </div>

        <div className="calendar-days">
          {days.map((day, index) => {
            const daySchedules = getSchedulesForDate(day.date)
            const isToday = day.date.toDateString() === new Date().toDateString()

            return (
              <div 
                key={index}
                className={`calendar-day ${!day.isCurrentMonth ? 'other-month' : ''} ${isToday ? 'today' : ''}`}
                onClick={() => handleOpenModal(day.date)}
              >
                <span className="day-number">{day.date.getDate()}</span>
                
                <div className="day-schedules">
                  {daySchedules.slice(0, 3).map(schedule => {
                    const typeInfo = scheduleTypes.find(t => t.value === schedule.type)
                    return (
                      <div 
                        key={schedule._id}
                        className="schedule-item"
                        style={{ backgroundColor: schedule.color || typeInfo?.color }}
                        onClick={(e) => {
                          e.stopPropagation()
                          handleOpenModal(null, schedule)
                        }}
                      >
                        <span className="schedule-icon">{typeInfo?.icon}</span>
                        <span className="schedule-title">{schedule.title}</span>
                      </div>
                    )
                  })}
                  {daySchedules.length > 3 && (
                    <div className="more-schedules">
                      +{daySchedules.length - 3} autres
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Schedule Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="schedule-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{selectedSchedule ? '✏️ Modifier' : '➕ Nouveau'} Planning</h3>
              <button className="close-btn" onClick={() => setShowModal(false)}>✕</button>
            </div>

            <div className="modal-body">
              <div className="form-group">
                <label>Titre *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Ex: Réunion d'équipe"
                />
              </div>

              <div className="form-group">
                <label>Type</label>
                <div className="type-selector">
                  {scheduleTypes.map(type => (
                    <button
                      key={type.value}
                      className={`type-btn ${formData.type === type.value ? 'active' : ''}`}
                      style={{ '--type-color': type.color }}
                      onClick={() => setFormData({ ...formData, type: type.value, color: type.color })}
                    >
                      <span>{type.icon}</span>
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Date début</label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Heure début</label>
                  <input
                    type="time"
                    value={formData.startTime}
                    onChange={e => setFormData({ ...formData, startTime: e.target.value })}
                    disabled={formData.allDay}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Date fin</label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Heure fin</label>
                  <input
                    type="time"
                    value={formData.endTime}
                    onChange={e => setFormData({ ...formData, endTime: e.target.value })}
                    disabled={formData.allDay}
                  />
                </div>
              </div>

              <div className="form-group checkbox-group">
                <label>
                  <input
                    type="checkbox"
                    checked={formData.allDay}
                    onChange={e => setFormData({ ...formData, allDay: e.target.checked })}
                  />
                  Toute la journée
                </label>
              </div>

              <div className="form-group">
                <label>Lieu</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={e => setFormData({ ...formData, location: e.target.value })}
                  placeholder="Ex: Salle de réunion A"
                />
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Détails supplémentaires..."
                  rows={3}
                />
              </div>
            </div>

            <div className="modal-footer">
              {selectedSchedule && (
                <button 
                  className="delete-btn"
                  onClick={() => {
                    onDeleteSchedule(selectedSchedule._id)
                    setShowModal(false)
                  }}
                >
                  🗑️ Supprimer
                </button>
              )}
              <button className="cancel-btn" onClick={() => setShowModal(false)}>
                Annuler
              </button>
              <button className="save-btn" onClick={handleSave} disabled={!formData.title}>
                💾 Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ScheduleCalendar
