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
  const [summary, setSummary] = useState({ total: 0, pending: 0, completed: 0, notCompleted: 0 });
  const [deleteModalState, setDeleteModalState] = useState({
    isOpen: false,
    activity: null,
    loading: false,
    error: '',
  });

  const roleRaw = (currentUser?.role || '').trim().toLowerCase();
  const normalizedRole = roleRaw.normalize('NFD').replace(/\p{Diacritic}/gu, '');
  const isAdmin = ['administrator', 'administrador', 'admin'].includes(normalizedRole);
  const isTecnico = normalizedRole.includes('tecnic');
  const canManageActivities = isAdmin || isTecnico;
  const canDeleteActivities = isAdmin;

  const displayName = useMemo(() => {
    if (!currentUser) {
      return '';
    }

    const firstName = (currentUser.firstName || '')
      .split(' ')
      .map((part) => part.trim())
      .filter(Boolean)[0];
    const lastName = (currentUser.lastName || '')
      .split(' ')
      .map((part) => part.trim())
      .filter(Boolean)[0];

    if (firstName || lastName) {
      return [firstName, lastName].filter(Boolean).join(' ');
    }

    return currentUser.fullName || currentUser.username || '';
  }, [currentUser]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleManageUsers = () => {
    openUserManagementModal();
  };

  const resetForm = () => {
    setDescription('');
    setStartDate(null);
    setEndDate(null);
    setNotes('');
    setFormError('');
  };

  const computeSummary = (list) => {
    const totals = list.reduce(
      (acc, activity) => {
        switch ((activity.status || '').toLowerCase()) {
          case 'pendiente':
            acc.pending += 1;
            break;
          case 'finalizada':
            acc.completed += 1;
            break;
          case 'no realizada':
            acc.notCompleted += 1;
            break;
          default:
            break;
        }
        acc.total += 1;
        return acc;
      },
      { total: 0, pending: 0, completed: 0, notCompleted: 0 }
    );

    return totals;
  };

  const resolveUserLabel = (user) => {
    if (!user) {
      return 'Usuario';
    }

    const fullName = `${user.fullName || ''}`.trim();
    if (fullName) {
      return fullName;
    }

    return user.username || 'Usuario';
  };

  const loadActivities = async () => {
    setLoading(true);
    setPageError('');

    try {
      const [activitiesResponse, summaryResponse] = await Promise.all([
        fetchTechnicalActivities(),
        fetchTechnicalActivitiesSummary(),
      ]);

      setActivities(activitiesResponse);
      setSummary(
        summaryResponse ?? computeSummary(activitiesResponse ?? [])
      );
    } catch (loadError) {
      const message =
        loadError?.response?.data?.message ||
        (typeof loadError?.response?.data === 'string' ? loadError.response.data : '') ||
        loadError?.message ||
        'No se pudieron cargar las actividades técnicas.';
      setPageError(message);
      setActivities([]);
      setSummary({ total: 0, pending: 0, completed: 0, notCompleted: 0 });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadActivities();
  }, []);

  const handleCreateActivity = async (event) => {
    event.preventDefault();

    const trimmed = description.trim();
    if (!trimmed) {
      setFormError('Describe la actividad a realizar.');
      return;
    }

    if (!startDate || !endDate) {
      setFormError('Selecciona fecha de inicio y fin.');
      return;
    }

    if (endDate < startDate) {
      setFormError('La fecha de fin no puede ser anterior a la de inicio.');
      return;
    }

    setCreatingActivity(true);

    try {
      const payload = {
        description: trimmed,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        notes: notes.trim() || undefined,
      };

      const created = await createTechnicalActivity(payload);
      if (created) {
        setActivities((prev) => {
          const next = [created, ...prev];
          setSummary(computeSummary(next));
          return next;
        });
      }

      resetForm();
      setShowCreateModal(false);
    } catch (createError) {
      const message =
        createError?.response?.data?.message ||
        (typeof createError?.response?.data === 'string' ? createError.response.data : '') ||
        createError?.message ||
        'No se pudo registrar la actividad.';
      setFormError(message);
    } finally {
      setCreatingActivity(false);
    }
  };

  const handleStatusChange = async (activityId, newStatus) => {
    if (!canManageActivities) {
      return;
    }

    try {
      const updated = await updateTechnicalActivity(activityId, { status: newStatus });
      if (!updated) {
        return;
      }

      setActivities((prev) => {
        const next = prev.map((activity) => (activity.id === activityId ? updated : activity));
        setSummary(computeSummary(next));
        return next;
      });
      setPageError('');
    } catch (updateError) {
      const message =
        updateError?.response?.data?.message ||
        (typeof updateError?.response?.data === 'string' ? updateError.response.data : '') ||
        updateError?.message ||
        'No se pudo actualizar el estatus.';
      setPageError(message);
    }
  };

  const handleNotesChange = async (activityId, value) => {
    if (!canManageActivities) {
      return;
    }

    const trimmed = value;

    setActivities((prev) =>
      prev.map((activity) =>
        activity.id === activityId ? { ...activity, notes: trimmed } : activity
      )
    );

    try {
      await updateTechnicalActivity(activityId, { notes: trimmed });
      setPageError('');
    } catch (notesError) {
      const message =
        notesError?.response?.data?.message ||
        (typeof notesError?.response?.data === 'string' ? notesError.response.data : '') ||
        notesError?.message ||
        'No se pudieron guardar las notas.';
      setPageError(message);
      loadActivities();
    }
  };

  const handleDeleteActivity = async (id) => {
    const activity = activities.find(a => a.id === id);
    if (!activity) return;

    setDeleteModalState({
      isOpen: true,
      activity,
      loading: false,
      error: '',
    });
  };

  const handleCloseDeleteModal = () => {
    if (deleteModalState.loading) return;
    setDeleteModalState({
      isOpen: false,
      activity: null,
      loading: false,
      error: '',
    });
  };

  const handleConfirmDelete = async () => {
    if (!deleteModalState.activity?.id) return;

    setDeleteModalState(prev => ({ ...prev, loading: true, error: '' }));

    try {
      await deleteTechnicalActivity(deleteModalState.activity.id);
      setActivities((prev) => {
        const next = prev.filter((activity) => activity.id !== deleteModalState.activity.id);
        setSummary(computeSummary(next));
        return next;
      });
      setDeleteModalState({
        isOpen: false,
        activity: null,
        loading: false,
        error: '',
      });
    } catch (deleteError) {
      const message =
        deleteError?.response?.data?.message ||
        (typeof deleteError?.response?.data === 'string' ? deleteError.response.data : '') ||
        deleteError?.message ||
        'No se pudo eliminar la actividad.';
      setDeleteModalState(prev => ({ ...prev, loading: false, error: message }));
    }
  };

  return (
    <div className="dashboard-wrapper min-vh-100">
      <MainNavbar
        displayName={displayName || currentUser?.username || ''}
        role={currentUser?.role}
        isAdmin={isAdmin}
        onManageUsers={isAdmin ? handleManageUsers : undefined}
        onLogout={handleLogout}
      />

      <main className="container py-5">
        <div className="d-flex flex-column flex-xl-row align-items-start align-items-xl-center justify-content-between gap-3 mb-4">
          <div>
            <h1 className="h3 mb-2">Planeación técnica</h1>
            <p className="text-muted mb-0">
              Registra actividades técnicas, define su estatus y dale seguimiento en un solo lugar.
            </p>
          </div>
          <div className="d-flex flex-wrap gap-2">
            <button
              type="button"
              className="btn btn-outline-primary dashboard-action-button"
              onClick={loadActivities}
              disabled={loading}
            >
              {loading ? 'Actualizando…' : 'Refrescar'}
            </button>
            <button
              type="button"
              className="btn btn-primary dashboard-action-button"
              onClick={() => {
                if (!canManageActivities) {
                  return;
                }
                setShowCreateModal(true);
                setTimeout(() => {
                  const textarea = document.getElementById('modal-activity-description');
                  textarea?.focus();
                }, 100);
              }}
              disabled={!canManageActivities}
            >
              Nueva actividad
            </button>
          </div>
        </div>

        {pageError && (
          <div className="alert alert-danger" role="alert">
            {pageError}
          </div>
        )}

        <div className="card border-0 shadow-lg mb-4">
          <div className="card-body p-4 p-md-5">
            <div className="d-flex flex-column flex-lg-row align-items-lg-center justify-content-between gap-4">
              <div>
                <h2 className="h5 mb-2">Actividades técnicas</h2>
                <p className="text-muted small mb-0">
                  Registra tareas desde el botón "Nueva actividad" y da seguimiento a su estatus.
                </p>
              </div>
              <div className="d-flex flex-wrap gap-3 text-center">
                <div>
                  <span className="d-block text-muted small">Totales</span>
                  <span className="fs-4 fw-semibold">{summary.total}</span>
                </div>
                <div>
                  <span className="d-block text-muted small">Pendientes</span>
                  <span className="fs-5 fw-semibold">
                    {summary.pending}
                  </span>
                </div>
                <div>
                  <span className="d-block text-muted small">Finalizadas</span>
                  <span className="fs-5 fw-semibold text-success">
                    {summary.completed}
                  </span>
                </div>
                <div>
                  <span className="d-block text-muted small">No realizadas</span>
                  <span className="fs-5 fw-semibold text-danger">
                    {summary.notCompleted}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="card border-0 shadow-lg">
          <div className="card-body p-4 p-md-5">
            <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-md-between gap-2 mb-4">
              <h2 className="h5 mb-0">Actividades registradas</h2>
              <span className="text-muted small">
                Total de actividades: <strong>{summary.total}</strong>
              </span>
            </div>

            {loading ? (
              <div className="text-center py-5 text-muted">
                <div className="spinner-border text-secondary mb-3" role="status" aria-hidden="true" />
                <p className="mb-0">Cargando actividades…</p>
              </div>
            ) : activities.length === 0 ? (
              <div className="text-center py-5 text-muted">
                <h3 className="h6">Aún no hay actividades registradas</h3>
                <p className="mb-0">
                  Añade la primera actividad técnica con el formulario superior.
                </p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table align-middle data-table">
                  <thead>
                    <tr>
                      <th scope="col" style={{ minWidth: '200px' }}>Actividad</th>
                      <th scope="col" style={{ minWidth: '160px' }}>Estatus</th>
                      <th scope="col" style={{ minWidth: '220px' }}>Notas</th>
                      <th scope="col" style={{ minWidth: '180px' }}>Registrada</th>
                      <th scope="col" style={{ minWidth: '140px' }}>Fechas</th>
                      {canDeleteActivities && <th scope="col" style={{ minWidth: '80px' }}>Acciones</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {activities.map((activity) => (
                      <tr key={activity.id}>
                        <td>
                          <div className="d-flex flex-column gap-1">
                            <span className="fw-semibold">{activity.description}</span>
                            <small className="text-muted">Creado por {resolveUserLabel(activity.createdBy)}</small>
                          </div>
                        </td>
                        <td>
                          <select
                            className="form-select"
                            value={activity.status}
                            onChange={(event) => handleStatusChange(activity.id, event.target.value)}
                            disabled={!canManageActivities || (activity.status === 'Finalizada' && !isAdmin)}
                          >
                            {STATUS_OPTIONS.map((option) => (
                              <option key={`${activity.id}-${option.value}`} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td style={{ minWidth: '220px' }}>
                          <textarea
                            className="form-control"
                            rows={2}
                            placeholder="Notas o comentarios sobre la actividad"
                            value={activity.notes || ''}
                            onChange={(event) => handleNotesChange(activity.id, event.target.value)}
                            disabled={!canManageActivities || (activity.status === 'Finalizada' && !isAdmin)}
                          />
                        </td>
                        <td>
                          <div className="d-flex flex-column">
                            <small className="text-muted">Creada: {formatDateTime(activity.createdAt)}</small>
                            {activity.completedAt && (
                              <span className="fw-semibold">Finalizada: {formatDateTime(activity.completedAt)}</span>
                            )}
                          </div>
                        </td>
                        <td>
                          <div className="d-flex flex-column">
                            {activity.startDate && (
                              <small className="text-muted">Inicio: {new Date(activity.startDate).toLocaleDateString()}</small>
                            )}
                            {activity.endDate && (
                              <small className="text-muted">Fin: {new Date(activity.endDate).toLocaleDateString()}</small>
                            )}
                          </div>
                        </td>
                        {canDeleteActivities && (
                          <td className="text-end">
                            <button
                              type="button"
                              className="btn btn-outline-danger btn-sm"
                              onClick={() => handleDeleteActivity(activity.id)}
                              title="Eliminar actividad"
                              disabled={!canDeleteActivities || (activity.status === 'Finalizada' && !isAdmin)}
                            >
                              Eliminar
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {showCreateModal && (
          <>
            <div className="modal-backdrop fade show" />
            <div className="modal fade show d-block" role="dialog" aria-modal="true">
              <div className="modal-dialog modal-dialog-centered">
                <div className="modal-content">
                  <div className="modal-header">
                    <h5 className="modal-title">Registrar nueva actividad técnica</h5>
                    <button
                      type="button"
                      className="btn-close"
                      onClick={() => {
                        if (creatingActivity) {
                          return;
                        }
                        setShowCreateModal(false);
                        setFormError('');
                        resetForm();
                      }}
                      aria-label="Cerrar"
                      disabled={creatingActivity}
                    />
                  </div>
                  <form
                    onSubmit={(event) => {
                      handleCreateActivity(event);
                    }}
                  >
                    <div className="modal-body">
                      <div className="mb-3">
                        <label htmlFor="modal-activity-description" className="form-label fw-semibold">
                          Descripción de la actividad
                        </label>
                        <textarea
                          id="modal-activity-description"
                          className="form-control"
                          rows={4}
                          placeholder="Ej. Revisar calibración de equipos en almacén principal"
                          value={description}
                          onChange={(event) => setDescription(event.target.value)}
                          disabled={creatingActivity}
                          required
                        />
                      </div>
                      <div className="row">
                        <div className="col-md-6 mb-3">
                          <label className="form-label fw-semibold">Fecha de inicio</label>
                          <DatePicker
                            selected={startDate}
                            onChange={(date) => setStartDate(date)}
                            selectsStart
                            startDate={startDate}
                            endDate={endDate}
                            className="form-control"
                            placeholderText="Selecciona fecha de inicio"
                            dateFormat="dd/MM/yyyy"
                            disabled={creatingActivity}
                            required
                          />
                        </div>
                        <div className="col-md-6 mb-3">
                          <label className="form-label fw-semibold">Fecha de fin</label>
                          <DatePicker
                            selected={endDate}
                            onChange={(date) => setEndDate(date)}
                            selectsEnd
                            startDate={startDate}
                            endDate={endDate}
                            minDate={startDate}
                            className="form-control"
                            placeholderText="Selecciona fecha de fin"
                            dateFormat="dd/MM/yyyy"
                            disabled={creatingActivity}
                            required
                          />
                        </div>
                      </div>
                      <div className="mb-3">
                        <label htmlFor="modal-activity-notes" className="form-label fw-semibold">
                          Notas adicionales (opcional)
                        </label>
                        <textarea
                          id="modal-activity-notes"
                          className="form-control"
                          rows={3}
                          placeholder="Notas de seguimiento, recursos necesarios, contactos, etc."
                          value={notes}
                          onChange={(event) => setNotes(event.target.value)}
                          disabled={creatingActivity}
                        />
                        <small className="text-muted">Estas notas se mostrarán cuando la actividad esté pendiente o no realizada.</small>
                      </div>
                      {formError && (
                        <div className="alert alert-danger" role="alert">
                          {formError}
                        </div>
                      )}
                    </div>
                    <div className="modal-footer">
                      <button
                        type="button"
                        className="btn btn-outline-secondary"
                        onClick={() => {
                          if (creatingActivity) {
                            return;
                          }
                          setShowCreateModal(false);
                          setFormError('');
                          resetForm();
                        }}
                        disabled={creatingActivity}
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={creatingActivity}
                      >
                        {creatingActivity ? 'Registrando…' : 'Registrar actividad'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </>
        )}
      {deleteModalState.isOpen && (
          <>
            <div className="modal-backdrop fade show" />
            <div className="modal fade show d-block" role="dialog" aria-modal="true">
              <div className="modal-dialog modal-dialog-centered">
                <div className="modal-content">
                  <div className="modal-header">
                    <h5 className="modal-title">Eliminar actividad técnica</h5>
                    <button
                      type="button"
                      className="btn-close"
                      onClick={handleCloseDeleteModal}
                      aria-label="Cerrar"
                      disabled={deleteModalState.loading}
                    />
                  </div>
                  <div className="modal-body">
                    <p className="mb-3">
                      ¿Deseas eliminar la actividad registrada el{' '}
                      <strong>
                        {deleteModalState.activity?.createdAt
                          ? formatDateTime(deleteModalState.activity.createdAt)
                          : '—'}
                      </strong>
                      ? Esta acción no se puede deshacer.
                    </p>
                    {deleteModalState.activity?.description && (
                      <div className="bg-light rounded p-3 mb-3">
                        <p className="small text-muted mb-1">Actividad:</p>
                        <p className="small mb-0">{deleteModalState.activity.description}</p>
                      </div>
                    )}
                    {deleteModalState.error && (
                      <div className="alert alert-danger" role="alert">
                        {deleteModalState.error}
                      </div>
                    )}
                  </div>
                  <div className="modal-footer">
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={handleCloseDeleteModal}
                      disabled={deleteModalState.loading}
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      className="btn btn-danger"
                      onClick={handleConfirmDelete}
                      disabled={deleteModalState.loading}
                    >
                      {deleteModalState.loading ? 'Eliminando…' : 'Eliminar actividad'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default PlaneacionTecnica;
