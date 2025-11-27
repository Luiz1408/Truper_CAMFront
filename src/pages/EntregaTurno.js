import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import MainNavbar from '../components/Layout/MainNavbar';
import Footer from '../components/Layout/Footer';
import { useAuth } from '../contexts/AuthContext';
import { useUserManagement } from '../contexts/UserManagementContext';
import { formatDateTime } from '../utils/date';
import api from '../services/api';
import ModernModal from '../components/Common/ModernModal';
import '../components/Common/ModernModal.css';
import './EntregaTurno.css';

// Función para formatear solo fecha sin hora
const formatDate = (dateString) => {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear().toString().slice(-2);
  
  return `${day}/${month}/${year}`;
};

const DEFAULT_STATUS = 'Pendiente';
const DELETE_MODAL_INITIAL_STATE = {
  isOpen: false,
  note: null,
  loading: false,
  error: '',
};

const STATUS_OPTIONS = [
  { value: 'Programado', label: 'Programado' },
  { value: 'Pendiente', label: 'Pendiente' },
  { value: 'En proceso', label: 'En proceso' },
  { value: 'Completado', label: 'Completado' },
  { value: 'Cancelado', label: 'Cancelado' },
];

const FINALIZADOS_STATUSES = ['Completado', 'Cancelado'];

const EntregaTurno = () => {
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();
  const { openModal: openUserManagementModal } = useUserManagement();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [coordinatorOptions, setCoordinatorOptions] = useState([]);
  const [ackLoadingKeys, setAckLoadingKeys] = useState(new Set());
  const [deletingNoteIds, setDeletingNoteIds] = useState(new Set());
  const [deleteModalState, setDeleteModalState] = useState(DELETE_MODAL_INITIAL_STATE);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creatingNote, setCreatingNote] = useState(false);
  const [activeTab, setActiveTab] = useState('activas'); // 'activas' o 'finalizadas'
  const [newNoteDescription, setNewNoteDescription] = useState('');
  const [newNoteType, setNewNoteType] = useState('informativo');
  const [createModalError, setCreateModalError] = useState('');

  const isAdmin = currentUser?.role === 'admin';
  const isCoordinator = currentUser?.role === 'coordinator';
  const normalizedCurrentUsername = currentUser?.username?.trim().toLowerCase() ?? '';

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

  const loadData = useCallback(async () => {
    try {
      setError('');
      setLoading(true);

      console.log('Cargando datos de entrega de turno...');
      
      const [notesResponse, coordinatorsResponse] = await Promise.all([
        api.get('/shiftHandOff'),
        api.get('/User/coordinators'),
      ]);

      console.log('Respuesta de notas:', notesResponse);
      console.log('Respuesta de coordinadores:', coordinatorsResponse);

      const notes = notesResponse?.data?.notes ?? notesResponse?.data?.data ?? notesResponse?.data ?? [];
      const coordinators = coordinatorsResponse?.data?.data ?? coordinatorsResponse?.data ?? [];

      console.log('Respuesta completa de notas:', notesResponse);
      console.log('Respuesta completa de coordinadores:', coordinatorsResponse);
      console.log('Notas extraídas:', notes);
      console.log('Coordinadores extraídos:', coordinators);
      console.log('Tipo de notas:', typeof notes);
      console.log('¿Es array notas?', Array.isArray(notes));

      // Asegurarnos de que notes sea un array
      const safeNotes = Array.isArray(notes) ? notes : [];
      const safeCoordinators = Array.isArray(coordinators) ? coordinators : [];

      const mappedRows = safeNotes.map((note) => ({
        ...note,
        status: note.status ?? DEFAULT_STATUS,
        description: note.description ?? '',
        type: note.type ?? 'informativo',
        acknowledgedBy: note.acknowledgedBy ?? {},
      }));

      setRows(mappedRows);
      setCoordinatorOptions(safeCoordinators);
    } catch (err) {
      console.error('Error detallado al cargar datos:', err);
      console.error('Status:', err.response?.status);
      console.error('Data:', err.response?.data);
      console.error('Message:', err.message);
      
      setError(`Error al cargar datos: ${err.message || 'No se pudieron cargar los datos de entrega de turno.'}`);
      setRows([]);
      setCoordinatorOptions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAddRow = useCallback(() => {
    // Permitir que cualquier usuario autenticado cree notas
    if (!currentUser) {
      setError('Debes estar autenticado para crear notas.');
      return;
    }

    setShowCreateModal(true);
    setNewNoteDescription('');
    setNewNoteType('informativo');
    setCreateModalError('');
  }, [currentUser]);

  const handleCreateNote = useCallback(async () => {
    if (!newNoteDescription.trim()) {
      setCreateModalError('La descripción de la nota es requerida.');
      return;
    }

    console.log('Creando nota con:', {
      description: newNoteDescription.trim(),
      type: newNoteType,
      currentUser: currentUser?.username,
      userRole: currentUser?.role
    });

    try {
      setCreatingNote(true);
      setCreateModalError('');

      const payload = {
        description: newNoteDescription.trim(),
        type: newNoteType,
        status: DEFAULT_STATUS,
        createdBy: currentUser,
        createdAt: new Date().toISOString()
      };

      console.log('Payload enviado:', payload);

      const response = await api.post('/shiftHandOff', payload);
      const newNote = response?.data?.data ?? response?.data;

      console.log('Respuesta del servidor:', newNote);

      if (newNote) {
        const processedNote = {
          ...newNote,
          status: newNote.status ?? DEFAULT_STATUS,
          description: newNote.description ?? newNoteDescription.trim(),
          type: newNote.type ?? newNoteType,
          acknowledgedBy: newNote.acknowledgedBy ?? {},
          createdBy: newNote.createdBy ?? currentUser,
          createdAt: newNote.createdAt ?? new Date().toISOString(),
        };

        console.log('Nota procesada para agregar:', processedNote);

        setRows((prev) => [processedNote, ...prev]);
      }

      setShowCreateModal(false);
      setNewNoteDescription('');
      setNewNoteType('informativo');
    } catch (err) {
      console.error('Error detallado al crear nota:', err);
      setCreateModalError('No se pudo crear la nota.');
    } finally {
      setCreatingNote(false);
    }
  }, [newNoteDescription, newNoteType, currentUser]);

  const handleDescriptionChange = useCallback((noteId, value) => {
    setRows((prev) =>
      prev.map((row) =>
        row.id === noteId ? { ...row, description: value, hasUnsavedChanges: true } : row
      )
    );
  }, []);

  const handleDescriptionBlur = useCallback(async (noteId, value) => {
    const row = rows.find((r) => r.id === noteId);
    if (!row || row.description === value) return;

    try {
      await api.put(`/shiftHandOff/${noteId}`, { description: value });
      setRows((prev) =>
        prev.map((r) => (r.id === noteId ? { ...r, description: value, hasUnsavedChanges: false } : r))
      );
    } catch (err) {
      setError('No se pudo actualizar la descripción.');
      setRows((prev) =>
        prev.map((r) => (r.id === noteId ? { ...r, description: row.description, hasUnsavedChanges: false } : r))
      );
    }
  }, [rows]);

  const handleStatusChange = useCallback(async (noteId, status) => {
    try {
      await api.put(`/shiftHandOff/${noteId}`, { status });
      setRows((prev) =>
        prev.map((row) =>
          row.id === noteId
            ? {
                ...row,
                status,
              }
            : row
        )
      );
    } catch (err) {
      setError('No se pudo actualizar el estatus.');
    }
  }, [currentUser]);

  const handleLogout = useCallback(() => {
    logout();
    navigate('/login');
  }, [logout, navigate]);

  const handleManageUsers = useCallback(() => {
    openUserManagementModal();
  }, [openUserManagementModal]);

  const acknowledgedSummary = useMemo(() => {
    if (rows.length === 0) {
      return { totalAcknowledged: 0, totalPossible: 0 };
    }

    const totalAcknowledged = rows.reduce((sum, row) => {
      const acknowledgements = Object.values(row.acknowledgedBy || {});
      return sum + acknowledgements.filter((ack) => ack?.checked).length;
    }, 0);

    const totalPossible = rows.reduce((sum, row) => {
      return sum + Object.keys(row.acknowledgedBy || {}).length;
    }, 0);

    return { totalAcknowledged, totalPossible };
  }, [rows]);

  // Filtrar tareas por pestaña activa
  const activeTasks = useMemo(() => {
    return rows.filter(row => !FINALIZADOS_STATUSES.includes(row.status));
  }, [rows]);

  const finalizedTasks = useMemo(() => {
    return rows.filter(row => FINALIZADOS_STATUSES.includes(row.status));
  }, [rows]);

  const currentTasks = activeTab === 'activas' ? activeTasks : finalizedTasks;

  // Verificar si todos los coordinadores han marcado la casilla
  const checkAllCoordinatorsAcknowledged = useCallback((noteId) => {
    const note = rows.find(row => row.id === noteId);
    if (!note || coordinatorOptions.length === 0) return false;

    const acknowledgements = Object.values(note.acknowledgedBy || {});
    const acknowledgedCount = acknowledgements.filter(ack => ack?.checked).length;
    
    return acknowledgedCount === coordinatorOptions.length;
  }, [rows, coordinatorOptions]);

  // Auto-mover a completado si todos los coordinadores marcaron (solo para notas informativas)
  const autoMoveToCompleted = useCallback(async (noteId) => {
    const note = rows.find(row => row.id === noteId);
    if (!note) return;
    
    // Solo auto-mover notas informativas
    if (note.type !== 'informativo') return;
    
    if (checkAllCoordinatorsAcknowledged(noteId)) {
      try {
        await api.put(`/shiftHandOff/${noteId}`, { status: 'Completado' });
        setRows(prev => prev.map(row => 
          row.id === noteId 
            ? { ...row, status: 'Completado', finalizedAt: new Date().toISOString(), finalizedBy: currentUser }
            : row
        ));
        console.log('Nota informativa movida automáticamente a completado:', noteId);
      } catch (err) {
        console.error('Error al auto-mover a completado:', err);
      }
    }
  }, [checkAllCoordinatorsAcknowledged, currentUser, rows]);

  // Función para eliminar notas
  const handleDeleteNote = useCallback(async (noteId) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar esta nota? Esta acción no se puede deshacer.')) {
      return;
    }

    try {
      await api.delete(`/shiftHandOff/${noteId}`);
      setRows(prev => prev.filter(row => row.id !== noteId));
      console.log('Nota eliminada:', noteId);
    } catch (err) {
      console.error('Error al eliminar nota:', err);
      setError('No se pudo eliminar la nota.');
    }
  }, []);
  const handleCoordinatorAcknowledge = useCallback(async (noteId, coordinatorId, checked) => {
    try {
      // Actualizar el acknowledgment en el backend
      await api.put(`/shiftHandOff/${noteId}/acknowledge`, { 
        coordinatorId, 
        checked,
        acknowledgedBy: currentUser
      });
      
      // Actualizar el estado local
      setRows(prev => prev.map(row => 
        row.id === noteId 
          ? { 
              ...row, 
              acknowledgedBy: {
                ...row.acknowledgedBy,
                [coordinatorId]: {
                  ...row.acknowledgedBy[coordinatorId],
                  checked,
                  timestamp: new Date().toISOString(),
                  acknowledgedBy: currentUser
                }
              }
            }
          : row
      ));
      
      // Verificar si hay que auto-mover a completado (solo para informativas)
      await autoMoveToCompleted(noteId);
      
    } catch (err) {
      console.error('Error al actualizar acknowledgment:', err);
      setError('No se pudo actualizar el estado de notificación.');
    }
  }, [currentUser, autoMoveToCompleted]);

  return (
    <div className="turno-container">
      <MainNavbar
        displayName={displayName || currentUser?.username || ''}
        role={currentUser?.role}
        isAdmin={isAdmin}
        onManageUsers={isAdmin ? handleManageUsers : undefined}
        onLogout={handleLogout}
      />

      <main>
        {/* Header */}
        <div className="turno-header">
          <div>
            <h1 className="turno-title">Entrega de turno</h1>
            <p className="turno-subtitle">
              Registra la información clave del turno y marca quién ha sido notificado.
            </p>
          </div>
          <div className="d-flex flex-wrap gap-2">
            <button
              type="button"
              className="btn-turno btn-turno--outline"
              onClick={loadData}
              disabled={loading}
            >
              {loading ? 'Actualizando…' : 'Actualizar tabla'}
            </button>
            <button
              type="button"
              className="btn-turno btn-turno--primary"
              onClick={handleAddRow}
              disabled={!currentUser || creatingNote || showCreateModal}
            >
              {creatingNote ? 'Creando…' : 'Nueva nota'}
            </button>
          </div>
        </div>

        {/* Contenido principal */}
        <div className="turno-card">
          {error && (
            <div className="alert alert-danger" role="alert">
              {error}
            </div>
          )}

          {/* Pestañas */}
          <div className="turno-tabs">
            <button
              className={`turno-tab ${activeTab === 'activas' ? 'turno-tab--active' : ''}`}
              onClick={() => setActiveTab('activas')}
            >
              Tareas Activas ({activeTasks.length})
            </button>
            <button
              className={`turno-tab ${activeTab === 'finalizadas' ? 'turno-tab--active' : ''}`}
              onClick={() => setActiveTab('finalizadas')}
            >
              Tareas Finalizadas ({finalizedTasks.length})
            </button>
          </div>

          {loading ? (
            <div className="turno-loading">
              <div className="turno-spinner"></div>
              Cargando datos…
            </div>
          ) : currentTasks.length === 0 ? (
            <div className="turno-empty">
              <div className="turno-empty-icon">
                {activeTab === 'activas' ? '📝' : '✅'}
              </div>
              <h3 className="turno-empty-title">
                {activeTab === 'activas' 
                  ? 'Aún no hay tareas activas' 
                  : 'Aún no hay tareas finalizadas'
                }
              </h3>
              <p className="turno-empty-description">
                {activeTab === 'activas'
                  ? 'Crea una nueva tarea desde el botón "Nueva nota" para comenzar.'
                  : 'Las tareas finalizadas aparecerán aquí cuando se completen o cancelen.'
                }
              </p>
            </div>
          ) : (
            <>
              <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-md-between gap-2 mb-3">
                <span className="text-muted">
                  {activeTab === 'activas' ? 'Tareas activas' : 'Tareas finalizadas'}: <strong>{currentTasks.length}</strong>
                </span>
                {activeTab === 'activas' && (
                  <span className="turno-badge turno-badge--info">
                    Enterados: {acknowledgedSummary.totalAcknowledged}
                    {acknowledgedSummary.totalPossible > 0 ? ` / ${acknowledgedSummary.totalPossible}` : ''}
                  </span>
                )}
              </div>

              <div className="turno-notes-container">
                {currentTasks.map((row) => (
                  <div key={row.id} className={`turno-note-card ${row.status?.toLowerCase().replace(' ', '-')}`}>
                    <div className="turno-note-header">
                      <div>
                        <h4 className="turno-note-title">Tarea #{row.id}</h4>
                        <div className="turno-note-time">
                          {formatDate(row.createdAt)}
                        </div>
                      </div>
                      <div>
                        {/* Admins siempre ven dropdown, otros usuarios según permisos */}
                        {(isAdmin || isCoordinator) ? (
                          <select
                            className="turno-form-select"
                            value={row.status || 'Pendiente'}
                            onChange={(e) => {
                              const userType = isAdmin ? 'Admin' : (isCoordinator ? 'Coordinator' : 'User');
                              console.log(`${userType} cambiando estatus de nota`, row.id, 'de', row.status, 'a', e.target.value);
                              handleStatusChange(row.id, e.target.value);
                            }}
                            style={{
                              padding: '6px 12px',
                              borderRadius: '20px',
                              border: isAdmin ? '2px solid #10b981' : '2px solid #3b82f6',
                              fontSize: '0.875rem',
                              fontWeight: '600',
                              cursor: 'pointer',
                              backgroundColor: 
                                row.status === 'Completado' ? '#d1fae5' : 
                                row.status === 'Cancelado' ? '#fee2e2' :
                                row.status === 'En proceso' ? '#dbeafe' :
                                row.status === 'Programado' ? '#e0e7ff' :
                                '#fef3c7',
                              color:
                                row.status === 'Completado' ? '#065f46' : 
                                row.status === 'Cancelado' ? '#991b1b' :
                                row.status === 'En proceso' ? '#1e40af' :
                                row.status === 'Programado' ? '#3730a3' :
                                '#92400e',
                              transition: 'all 0.2s ease',
                              boxShadow: isAdmin ? '0 1px 3px rgba(16, 185, 129, 0.2)' : '0 1px 3px rgba(0, 0, 0, 0.1)',
                              minWidth: '120px'
                            }}
                            onMouseEnter={(e) => {
                              e.target.style.borderColor = isAdmin ? '#059669' : '#1d4ed8';
                              e.target.style.transform = 'scale(1.02)';
                            }}
                            onMouseLeave={(e) => {
                              e.target.style.borderColor = isAdmin ? '#10b981' : '#3b82f6';
                              e.target.style.transform = 'scale(1)';
                            }}
                          >
                            {STATUS_OPTIONS.map(option => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className={`turno-badge ${
                            row.status === 'Completado' ? 'turno-badge--success' : 
                            row.status === 'Cancelado' ? 'turno-badge--danger' :
                            row.status === 'En proceso' ? 'turno-badge--info' :
                            row.status === 'Programado' ? 'turno-badge--primary' :
                            'turno-badge--warning'
                          }`}>
                            {row.status || 'Pendiente'}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="turno-note-content">
                      <textarea
                        className="turno-form-textarea"
                        rows={3}
                        placeholder="Describe la tarea o incidencia..."
                        value={row.description}
                        onChange={(event) => handleDescriptionChange(row.id, event.target.value)}
                        onBlur={(event) => handleDescriptionBlur(row.id, event.target.value)}
                        disabled={!isAdmin || FINALIZADOS_STATUSES.includes(row.status)}
                      />
                    </div>

                    <div className="turno-note-footer">
                      <div className="d-flex align-items-center gap-2">
                        <label className="turno-form-label">Tipo:</label>
                        <span className={`turno-badge ${
                          row.type === 'seguimiento' ? 'turno-badge--info' : 'turno-badge--warning'
                        }`}>
                          {row.type === 'seguimiento' ? 'Seguimiento' : 'Informativo'}
                        </span>
                      </div>

                      <div className="d-flex gap-2">
                        {/* Sección de acknowledgments para notas informativas */}
                        {row.type === 'informativo' && activeTab === 'activas' && !FINALIZADOS_STATUSES.includes(row.status) && (
                          <div className="turno-acknowledgments">
                            <div className="turno-acknowledgments-title">Notificación de coordinadores:</div>
                            <div className="turno-acknowledgments-list">
                              {coordinatorOptions.map(coordinator => (
                                <div key={coordinator.id} className="turno-acknowledgment-item">
                                  <input
                                    type="checkbox"
                                    id={`ack-${row.id}-${coordinator.id}`}
                                    checked={row.acknowledgedBy?.[coordinator.id]?.checked || false}
                                    onChange={(e) => handleCoordinatorAcknowledge(row.id, coordinator.id, e.target.checked)}
                                    disabled={false} // Admins pueden marcar TODO
                                    className="turno-acknowledgment-checkbox"
                                    style={{ 
                                      cursor: 'pointer',
                                      accentColor: isAdmin ? '#10b981' : '#3b82f6'
                                    }}
                                  />
                                  <label 
                                    htmlFor={`ack-${row.id}-${coordinator.id}`}
                                    className="turno-acknowledgment-label"
                                    style={{ cursor: 'pointer' }}
                                  >
                                    {coordinator.name || coordinator.username}
                                    {isAdmin && <span style={{ fontSize: '0.75rem', color: '#10b981', marginLeft: '4px' }}>👑</span>}
                                    {coordinator.role === 'admin' && <span style={{ fontSize: '0.75rem', color: '#ef4444', marginLeft: '4px' }}>🔧</span>}
                                  </label>
                                  {row.acknowledgedBy?.[coordinator.id]?.timestamp && (
                                    <span className="turno-acknowledgment-time">
                                      {formatDateTime(row.acknowledgedBy[coordinator.id].timestamp)}
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Botón de reactivar para tareas finalizadas */}
                        {activeTab === 'finalizadas' && isAdmin && FINALIZADOS_STATUSES.includes(row.status) && (
                          <button
                            type="button"
                            className="btn-turno btn-turno--primary btn-sm"
                            onClick={() => handleStatusChange(row.id, 'Pendiente')}
                          >
                            Reactivar
                          </button>
                        )}

                        {(isAdmin || true) && (
                          <button
                            type="button"
                            className="btn-turno btn-turno--danger btn-sm"
                            onClick={() => {
                              console.log('Botón eliminar clickeado por:', currentUser?.username, 'isAdmin:', isAdmin);
                              handleDeleteNote(row.id);
                            }}
                            title="Eliminar nota (solo administradores)"
                            style={{
                              opacity: isAdmin ? 1 : 0.5,
                              cursor: isAdmin ? 'pointer' : 'not-allowed'
                            }}
                          >
                            🗑️ Eliminar {isAdmin ? '(👑)' : '(🔒)'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Modal para crear nota */}
        <ModernModal
          show={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          title="Nueva nota de entrega de turno"
          onSubmit={handleCreateNote}
          submitText="Crear nota"
          submitDisabled={!newNoteDescription.trim()}
          loading={creatingNote}
        >
          {createModalError && (
            <div className="alert alert-danger" role="alert">
              {createModalError}
            </div>
          )}

          <div className="modern-form-group">
            <label className="modern-form-label">Descripción de la nota *</label>
            <textarea
              className="modern-form-textarea"
              rows={4}
              placeholder="Describe la incidencia, eventos importantes o información clave del turno..."
              value={newNoteDescription}
              onChange={(e) => setNewNoteDescription(e.target.value)}
              disabled={creatingNote}
            />
          </div>

          <div className="modern-form-group">
            <label className="modern-form-label">Tipo *</label>
            <select
              className="modern-form-select"
              value={newNoteType}
              onChange={(e) => setNewNoteType(e.target.value)}
              disabled={creatingNote}
            >
              <option value="informativo">Informativo</option>
              <option value="seguimiento">Seguimiento</option>
            </select>
          </div>
        </ModernModal>
      </main>
      <Footer />
    </div>
  );
};

export default EntregaTurno;
