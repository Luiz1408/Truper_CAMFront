import React, { useEffect, useMemo, useState } from 'react';
import DatePicker from 'react-datepicker';
import { useNavigate } from 'react-router-dom';
import MainNavbar from '../components/Layout/MainNavbar';
import Footer from '../components/Layout/Footer';
import { useAuth } from '../contexts/AuthContext';
import { useUserManagement } from '../contexts/UserManagementContext';
import { formatDateTime } from '../utils/date';
import {
  fetchTechnicalActivities,
  createTechnicalActivity,
  updateTechnicalActivity,
  fetchTechnicalActivitiesSummary,
  deleteTechnicalActivity,
} from '../services/technicalActivities';
import ModernModal from '../components/Common/ModernModal';
import '../components/Common/ModernModal.css';
import 'react-datepicker/dist/react-datepicker.css';
import './PlaneacionTecnica.css';

const STATUS_OPTIONS = [
  { value: 'Pendiente', label: 'Pendiente' },
  { value: 'No realizada', label: 'No realizada' },
  { value: 'Finalizada', label: 'Finalizada' },
];

const PlaneacionTecnica = () => {
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();
  const { openModal: openUserManagementModal } = useUserManagement();

  const [activities, setActivities] = useState([]);
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [notes, setNotes] = useState('');
  const [pageError, setPageError] = useState('');
  const [formError, setFormError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creatingActivity, setCreatingActivity] = useState(false);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({ total: 0, completed: 0, pending: 0 });

  const isAdmin = currentUser?.role === 'admin';
  const displayName = useMemo(() => {
    if (!currentUser) return '';
    const firstName = (currentUser.firstName || '').split(' ').map(part => part.trim()).filter(Boolean)[0];
    const lastName = (currentUser.lastName || '').split(' ').map(part => part.trim()).filter(Boolean)[0];
    if (firstName || lastName) return [firstName, lastName].filter(Boolean).join(' ');
    return currentUser.fullName || currentUser.username || '';
  }, [currentUser]);

  const loadActivities = async () => {
    try {
      setLoading(true);
      setPageError('');
      const activitiesData = await fetchTechnicalActivities();
      setActivities(activitiesData || []);
      
      const summaryData = await fetchTechnicalActivitiesSummary();
      setSummary(summaryData || { total: 0, completed: 0, pending: 0 });
    } catch (error) {
      console.error('Error loading activities:', error);
      setPageError('No se pudieron cargar las actividades técnicas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadActivities();
  }, []);

  const handleCreateActivity = async () => {
    if (!description.trim()) {
      setFormError('La descripción es requerida');
      return;
    }

    try {
      setCreatingActivity(true);
      setFormError('');

      const activityData = {
        description: description.trim(),
        startDate: startDate ? startDate.toISOString() : null,
        endDate: endDate ? endDate.toISOString() : null,
        notes: notes.trim(),
        status: 'Pendiente',
      };

      console.log('Enviando datos:', activityData);
      const result = await createTechnicalActivity(activityData);
      console.log('Respuesta:', result);
      
      // Reset form
      setDescription('');
      setStartDate(null);
      setEndDate(null);
      setNotes('');
      setShowCreateModal(false);
      
      // Reload activities
      await loadActivities();
    } catch (error) {
      console.error('Error creating activity:', error);
      const errorMessage = error.response?.data?.message || error.message || 'No se pudo crear la actividad';
      setFormError(`Error: ${errorMessage}`);
    } finally {
      setCreatingActivity(false);
    }
  };

  const handleUpdateActivityStatus = async (activityId, newStatus) => {
    try {
      await updateTechnicalActivity(activityId, { status: newStatus });
      await loadActivities();
    } catch (error) {
      console.error('Error updating activity:', error);
      setPageError('No se pudo actualizar el estatus de la actividad');
    }
  };

  const handleDeleteActivity = async (activityId) => {
    // Usar window.confirm para evitar el error de ESLint
    if (!window.confirm('¿Estás seguro de que deseas eliminar esta actividad?')) {
      return;
    }

    try {
      await deleteTechnicalActivity(activityId);
      await loadActivities();
    } catch (error) {
      console.error('Error deleting activity:', error);
      setPageError('No se pudo eliminar la actividad');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleManageUsers = () => {
    openUserManagementModal();
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Finalizada':
        return 'planeacion-badge--success';
      case 'No realizada':
        return 'planeacion-badge--danger';
      case 'Pendiente':
      default:
        return 'planeacion-badge--warning';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'Alta':
        return 'alta';
      case 'Media':
        return 'media';
      case 'Baja':
      default:
        return 'baja';
    }
  };

  return (
    <div className="planeacion-container">
      <MainNavbar
        displayName={displayName || currentUser?.username || ''}
        role={currentUser?.role}
        isAdmin={isAdmin}
        onManageUsers={isAdmin ? handleManageUsers : undefined}
        onLogout={handleLogout}
      />

      <main>
        {/* Header */}
        <div className="planeacion-header">
          <div>
            <h1 className="planeacion-title">Planeación técnica</h1>
            <p className="planeacion-subtitle">
              Registra actividades técnicas, define su estatus y dale seguimiento en un solo lugar.
            </p>
          </div>
          <div className="d-flex flex-wrap gap-2">
            <button
              type="button"
              className="btn-planeacion btn-planeacion--outline"
              onClick={loadActivities}
              disabled={loading}
            >
              {loading ? 'Actualizando…' : 'Refrescar'}
            </button>
            <button
              type="button"
              className="btn-planeacion btn-planeacion--primary"
              onClick={() => setShowCreateModal(true)}
            >
              Nueva actividad
            </button>
          </div>
        </div>

        {/* Estadísticas */}
        <div className="planeacion-stats-grid">
          <div className="planeacion-stat-card">
            <div className="planeacion-stat-value">{summary.total}</div>
            <div className="planeacion-stat-label">Total de actividades</div>
          </div>
          <div className="planeacion-stat-card">
            <div className="planeacion-stat-value">{summary.completed}</div>
            <div className="planeacion-stat-label">Completadas</div>
          </div>
          <div className="planeacion-stat-card">
            <div className="planeacion-stat-value">{summary.pending}</div>
            <div className="planeacion-stat-label">Pendientes</div>
          </div>
        </div>

        {/* Contenido principal */}
        <div className="planeacion-card">
          {pageError && (
            <div className="alert alert-danger" role="alert">
              {pageError}
            </div>
          )}

          {loading ? (
            <div className="planeacion-loading">
              <div className="planeacion-spinner"></div>
              Cargando actividades…
            </div>
          ) : activities.length === 0 ? (
            <div className="planeacion-empty">
              <div className="planeacion-empty-icon">🔧</div>
              <h3 className="planeacion-empty-title">No hay actividades registradas</h3>
              <p className="planeacion-empty-description">
                Crea una nueva actividad para comenzar a dar seguimiento a las tareas técnicas.
              </p>
            </div>
          ) : (
            <div className="planeacion-activities-grid">
              {activities.map((activity) => (
                <div key={activity.id} className={`planeacion-activity-card ${activity.status?.toLowerCase().replace(' ', '-')}`}>
                  <div className="planeacion-activity-header">
                    <h3 className="planeacion-activity-title">{activity.description}</h3>
                    <span className={`planeacion-activity-priority ${getPriorityColor(activity.priority)}`}>
                      {activity.priority || 'Media'}
                    </span>
                  </div>

                  <div className="planeacion-activity-description">
                    {activity.notes && (
                      <p>{activity.notes}</p>
                    )}
                  </div>

                  <div className="planeacion-activity-meta">
                    {activity.startDate && (
                      <div className="planeacion-activity-meta-item">
                        📅 Inicio: {formatDateTime(activity.startDate)}
                      </div>
                    )}
                    {activity.endDate && (
                      <div className="planeacion-activity-meta-item">
                        🏁 Fin: {formatDateTime(activity.endDate)}
                      </div>
                    )}
                    <div className="planeacion-activity-meta-item">
                      👤 Creado por: {activity.createdBy?.name || activity.createdBy?.username || '—'}
                    </div>
                  </div>

                  <div className="planeacion-activity-actions">
                    <select
                      className="planeacion-form-select"
                      value={activity.status || 'Pendiente'}
                      onChange={(e) => handleUpdateActivityStatus(activity.id, e.target.value)}
                    >
                      {STATUS_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>

                    {isAdmin && (
                      <button
                        type="button"
                        className="btn-planeacion btn-planeacion--danger btn-sm"
                        onClick={() => handleDeleteActivity(activity.id)}
                      >
                        Eliminar
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal para crear actividad */}
        <ModernModal
          show={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          title="Nueva actividad técnica"
          onSubmit={handleCreateActivity}
          submitText="Crear actividad"
          submitDisabled={!description.trim()}
          loading={creatingActivity}
        >
          {formError && (
            <div className="alert alert-danger" role="alert">
              {formError}
            </div>
          )}

          <div className="modern-form-group">
            <label className="modern-form-label">Descripción *</label>
            <textarea
              className="modern-form-textarea"
              rows={3}
              placeholder="Describe la actividad técnica a realizar..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={creatingActivity}
            />
          </div>

          <div className="modern-form-grid modern-form-grid--2">
            <div className="modern-form-group">
              <label className="modern-form-label">Fecha de inicio</label>
              <DatePicker
                selected={startDate}
                onChange={setStartDate}
                selectsStart
                startDate={startDate}
                endDate={endDate}
                dateFormat="dd/MM/yyyy"
                className="modern-form-input"
                placeholderText="Selecciona fecha de inicio"
                disabled={creatingActivity}
              />
            </div>

            <div className="modern-form-group">
              <label className="modern-form-label">Fecha de fin</label>
              <DatePicker
                selected={endDate}
                onChange={setEndDate}
                selectsEnd
                startDate={startDate}
                endDate={endDate}
                minDate={startDate}
                dateFormat="dd/MM/yyyy"
                className="modern-form-input"
                placeholderText="Selecciona fecha de fin"
                disabled={creatingActivity}
              />
            </div>
          </div>

          <div className="modern-form-group">
            <label className="modern-form-label">Notas adicionales</label>
            <textarea
              className="modern-form-textarea"
              rows={2}
              placeholder="Notas o comentarios adicionales..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={creatingActivity}
            />
          </div>
        </ModernModal>
      </main>
      <Footer />
    </div>
  );
};

export default PlaneacionTecnica;
