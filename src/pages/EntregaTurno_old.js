import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useUserManagement } from '../contexts/UserManagementContext';
import { formatDateTime } from '../utils/date';
import './EntregaTurno.css';
import MainNavbar from '../components/Layout/MainNavbar';
import Footer from '../components/Layout/Footer';

const DEFAULT_STATUS = 'Pendiente';
const DELETE_MODAL_INITIAL_STATE = {
  isOpen: false,
  note: null,
  loading: false,
  error: '',
};

const normalizeCoordinatorOption = (raw) => {
  const id = raw?.id ?? raw?.Id;
  if (id == null) {
    return null;
  }

  const username = (raw?.username ?? raw?.Username ?? '').trim();
  const firstName = (raw?.firstName ?? raw?.FirstName ?? '').trim();
  const lastName = (raw?.lastName ?? raw?.LastName ?? '').trim();
  const fullNameRaw = (raw?.fullName ?? raw?.FullName ?? '').trim();
  const fullName = fullNameRaw || `${firstName} ${lastName}`.trim();

  return {
    id,
    username,
    name: fullName || username || `Coordinador ${id}`,
  };
};

const mapNoteToRow = (note, coordinatorOptions) => {
  const noteId = note?.id ?? note?.Id;
  if (noteId == null) {
    return null;
  }

  const optionMap = new Map(
    (coordinatorOptions ?? []).map((coord) => [String(coord.id), coord])
  );

  const acknowledgements = Array.isArray(note?.acknowledgements)
    ? note.acknowledgements
    : Array.isArray(note?.Acknowledgements)
      ? note.Acknowledgements
      : [];

  const acknowledgedBy = {};

  acknowledgements.forEach((ack) => {
    const coordinatorId = ack?.coordinatorUserId ?? ack?.CoordinatorUserId;
    if (coordinatorId == null) {
      return;
    }

    const key = String(coordinatorId);
    const option = optionMap.get(key);
    const name = (
      ack?.coordinatorName ??
      ack?.CoordinatorName ??
      option?.name ??
      ''
    ).trim();
    const username = (
      ack?.coordinatorUsername ??
      ack?.CoordinatorUsername ??
      option?.username ??
      ''
    ).trim();

    acknowledgedBy[key] = {
      checked: Boolean(ack?.isAcknowledged ?? ack?.IsAcknowledged),
      acknowledgedAt: ack?.acknowledgedAt ?? ack?.AcknowledgedAt ?? null,
      name: name || option?.name || username || `Coordinador ${key}`,
      username,
    };
  });

  optionMap.forEach((coord, key) => {
    if (!acknowledgedBy[key]) {
      acknowledgedBy[key] = {
        checked: false,
        acknowledgedAt: null,
        name: coord.name,
        username: coord.username,
      };
    }
  });

  const createdByRaw = note?.createdBy ?? note?.CreatedBy;
  const createdBy = createdByRaw
    ? {
        id: createdByRaw?.id ?? createdByRaw?.Id ?? null,
        name:
          (createdByRaw?.fullName ?? createdByRaw?.FullName ?? '').trim() ||
          `${(createdByRaw?.firstName ?? createdByRaw?.FirstName ?? '').trim()} ${(createdByRaw?.lastName ?? createdByRaw?.LastName ?? '').trim()}`.trim(),
        username: (createdByRaw?.username ?? createdByRaw?.Username ?? '').trim() || null,
      }
    : null;

  const finalizedByRaw = note?.finalizedBy ?? note?.FinalizedBy;
  const finalizedBy = finalizedByRaw
    ? {
        id: finalizedByRaw?.id ?? finalizedByRaw?.Id ?? null,
        name:
          (finalizedByRaw?.fullName ?? finalizedByRaw?.FullName ?? '').trim() ||
          `${(finalizedByRaw?.firstName ?? finalizedByRaw?.FirstName ?? '').trim()} ${(finalizedByRaw?.lastName ?? finalizedByRaw?.LastName ?? '').trim()}`.trim(),
        username: (finalizedByRaw?.username ?? finalizedByRaw?.Username ?? '').trim() || null,
      }
    : null;

  return {
    id: noteId,
    description: note?.description ?? note?.Description ?? '',
    status: note?.status ?? note?.Status ?? DEFAULT_STATUS,
    assignedCoordinatorId:
      note?.assignedCoordinatorId ?? note?.AssignedCoordinatorId ?? null,
    acknowledgedBy,
    createdAt: note?.createdAt ?? note?.CreatedAt ?? null,
    updatedAt: note?.updatedAt ?? note?.UpdatedAt ?? null,
    createdBy,
    finalizedAt: note?.finalizedAt ?? note?.FinalizedAt ?? null,
    finalizedBy,
  };
};

const getErrorMessage = (error, fallback = 'Ocurrió un error inesperado.') => {
  const message =
    error?.response?.data?.message ??
    (typeof error?.response?.data === 'string' ? error.response.data : null) ??
    error?.message ??
    fallback;
  return typeof message === 'string' ? message : fallback;
};

const EntregaTurno = () => {
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();
  const { openModal: openUserManagementModal } = useUserManagement();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [coordinatorOptions, setCoordinatorOptions] = useState([]);
  const [creatingNote, setCreatingNote] = useState(false);
  const [ackLoadingKeys, setAckLoadingKeys] = useState(() => new Set());
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newNoteDescription, setNewNoteDescription] = useState('');
  const [newNoteCoordinatorId, setNewNoteCoordinatorId] = useState('');
  const [createModalError, setCreateModalError] = useState('');
  const [deletingNoteIds, setDeletingNoteIds] = useState(() => new Set());
  const [deleteModalState, setDeleteModalState] = useState(DELETE_MODAL_INITIAL_STATE);

  const normalizedCurrentUsername = useMemo(
    () => currentUser?.username?.trim().toLowerCase() ?? '',
    [currentUser]
  );

  const normalizedRole = (currentUser?.role || '').trim().toLowerCase();
  const isAdmin = ['administrator', 'administrador', 'admin'].includes(normalizedRole);
  const isCoordinator = ['coordinator', 'coordinador'].includes(normalizedRole);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const [coordinatorsResponse, notesResponse] = await Promise.all([
        api.get('/user/coordinators'),
        api.get('/shiftHandOff'),
      ]);

      const coordinatorsRaw = Array.isArray(coordinatorsResponse.data)
        ? coordinatorsResponse.data
        : [];

      const coordinatorMap = new Map();
      coordinatorsRaw
        .map(normalizeCoordinatorOption)
        .filter(Boolean)
        .forEach((coord) => {
          if (!coordinatorMap.has(coord.id)) {
            coordinatorMap.set(coord.id, coord);
          }
        });

      const normalizedCoordinators = Array.from(coordinatorMap.values());
      setCoordinatorOptions(normalizedCoordinators);

      const notesRaw = notesResponse?.data?.notes ?? notesResponse?.data?.Notes ?? [];
      const mappedRows = (Array.isArray(notesRaw) ? notesRaw : [])
        .map((note) => mapNoteToRow(note, normalizedCoordinators))
        .filter(Boolean);

      setRows(mappedRows);
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudieron cargar los datos de entrega de turno.'));
      setCoordinatorOptions([]);
      setRows([]);
    } finally {
      setLoading(false);
      setAckLoadingKeys(new Set());
      setDeletingNoteIds(new Set());
      setDeleteModalState(DELETE_MODAL_INITIAL_STATE);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRowChange = useCallback((noteId, changes) => {
    setRows((prevRows) =>
      prevRows.map((row) => (row.id === noteId ? { ...row, ...changes } : row))
    );
  }, []);

  const coordinatorDisplayList = useMemo(() => {
    const map = new Map();

    coordinatorOptions.forEach((coord) => {
      if (coord?.id != null) {
        map.set(String(coord.id), coord);
      }
    });

    rows.forEach((row) => {
      Object.entries(row?.acknowledgedBy ?? {}).forEach(([key, ackValue]) => {
        if (!map.has(key)) {
          const parsedId = Number(key);
          map.set(key, {
            id: parsedId,
            name: ackValue?.name || ackValue?.username || `Coordinador ${key}`,
            username: ackValue?.username ?? '',
          });
        }
      });
    });

    return Array.from(map.values()).sort((a, b) =>
      (a?.name || '').localeCompare(b?.name || '', 'es', { sensitivity: 'base' })
    );
  }, [coordinatorOptions, rows]);

  const coordinatorOptionsMap = useMemo(() => {
    const map = new Map();
    coordinatorOptions.forEach((coord) => {
      if (coord?.id != null) {
        map.set(String(coord.id), coord);
      }
    });

    return map;
  }, [coordinatorOptions]);

  const acknowledgedSummary = useMemo(() => {
    if (rows.length === 0 || coordinatorDisplayList.length === 0) {
      return { totalAcknowledged: 0, totalPossible: 0 };
    }

    const totalPossible = rows.length * coordinatorDisplayList.length;
    const totalAcknowledged = rows.reduce((sum, row) =>
      sum +
        coordinatorDisplayList.reduce((acc, coord) => {
          const key = String(coord.id);
          return row?.acknowledgedBy?.[key]?.checked ? acc + 1 : acc;
        }, 0),
    0);

    return { totalAcknowledged, totalPossible };
  }, [rows, coordinatorDisplayList]);

  const handleAddRow = useCallback(() => {
    if (!(isAdmin || isCoordinator)) {
      setError('Solo administradores o coordinadores pueden crear nuevas notas.');
      return;
    }

    if (coordinatorOptions.length === 0) {
      setError('No hay coordinadores registrados. Puedes crear la nota sin asignar uno.');
    } else {
      setError('');
    }

    setCreateModalError('');
    setNewNoteDescription('');
    setNewNoteCoordinatorId('');
    setShowCreateModal(true);
  }, [coordinatorOptions.length, isAdmin, isCoordinator]);

  const handleCloseCreateModal = useCallback(() => {
    if (creatingNote) {
      return;
    }

    setShowCreateModal(false);
    setNewNoteDescription('');
    setNewNoteCoordinatorId('');
    setCreateModalError('');
  }, [creatingNote]);

  const handleCreateNoteSubmit = useCallback(async () => {
    const trimmedDescription = newNoteDescription.trim();
    if (!trimmedDescription) {
      setCreateModalError('Ingresa una descripción para la nota.');
      return;
    }

    const assignedCoordinatorId = newNoteCoordinatorId
      ? Number(newNoteCoordinatorId)
      : null;

    if (newNoteCoordinatorId && Number.isNaN(assignedCoordinatorId)) {
      setCreateModalError('Selecciona un coordinador válido.');
      return;
    }

    setCreatingNote(true);
    setCreateModalError('');
    setError('');

    try {
      const payload = {
        description: trimmedDescription,
        status: DEFAULT_STATUS,
        acknowledgements: coordinatorOptions.map((coord) => ({
          coordinatorUserId: coord.id,
          isAcknowledged: false,
        })),
      };

      if (assignedCoordinatorId != null) {
        payload.assignedCoordinatorId = assignedCoordinatorId;
      }

      const response = await api.post('/shiftHandOff', payload);
      const createdNote = response?.data?.note ?? response?.data?.Note;

      if (!createdNote) {
        throw new Error('Respuesta inválida del servidor al crear la nota.');
      }

      const mappedNote = mapNoteToRow(createdNote, coordinatorOptions);
      if (mappedNote) {
        setRows((prevRows) => [mappedNote, ...prevRows]);
      }

      setShowCreateModal(false);
      setNewNoteDescription('');
      setNewNoteCoordinatorId('');
    } catch (err) {
      setCreateModalError(getErrorMessage(err, 'No se pudo crear la nueva nota.'));
    } finally {
      setCreatingNote(false);
    }
  }, [coordinatorOptions, getErrorMessage, newNoteCoordinatorId, newNoteDescription]);

  const handleDescriptionChange = useCallback(
    (noteId, value) => {
      handleRowChange(noteId, { description: value });
    },
    [handleRowChange]
  );

  const handleDescriptionBlur = useCallback(
    async (noteId, value) => {
      if (!isAdmin) {
        return;
      }

      const targetRow = rows.find((row) => row.id === noteId);
      if (!targetRow) {
        return;
      }

      const trimmed = value.trim();
      const previousDescription = targetRow.description ?? '';

      if (previousDescription === trimmed) {
        handleRowChange(noteId, { description: trimmed });
        return;
      }

      handleRowChange(noteId, { description: trimmed });

      try {
        const response = await api.put(`/shiftHandOff/${noteId}`, { description: trimmed });
        const updatedNote = response?.data?.note ?? response?.data?.Note;
        if (updatedNote) {
          const mapped = mapNoteToRow(updatedNote, coordinatorOptions);
          if (mapped) {
            setRows((prevRows) =>
              prevRows.map((row) => (row.id === noteId ? mapped : row))
            );
          }
        }
      } catch (err) {
        setError(getErrorMessage(err, 'No se pudo actualizar la descripción.'));
        handleRowChange(noteId, { description: previousDescription });
      }
    },
    [coordinatorOptions, handleRowChange, isAdmin, isCoordinator, rows]
  );

  const handleStatusChange = useCallback(
    async (noteId, status) => {
      if (!(isAdmin || isCoordinator)) {
        return;
      }

      const targetRow = rows.find((row) => row.id === noteId);
      if (!targetRow) {
        return;
      }

      const trimmedStatus = status.trim() || DEFAULT_STATUS;
      if (targetRow.status === trimmedStatus) {
        return;
      }

      handleRowChange(noteId, { status: trimmedStatus });

      try {
        const response = await api.put(`/shiftHandOff/${noteId}`, { status: trimmedStatus });
        const updatedNote = response?.data?.note ?? response?.data?.Note;
        if (updatedNote) {
          const mapped = mapNoteToRow(updatedNote, coordinatorOptions);
          if (mapped) {
            setRows((prevRows) =>
              prevRows.map((row) => (row.id === noteId ? mapped : row))
            );
          }
        }
      } catch (err) {
        setError(getErrorMessage(err, 'No se pudo actualizar el estatus.'));
        handleRowChange(noteId, { status: targetRow.status });
      }
    },
    [coordinatorOptions, handleRowChange, isAdmin, rows]
  );

  const handleAssignedCoordinatorChange = useCallback(
    async (noteId, coordinatorIdValue) => {
      if (!isAdmin) {
        return;
      }

      const targetRow = rows.find((row) => row.id === noteId);
      if (!targetRow) {
        return;
      }

      const newValue = coordinatorIdValue ? Number(coordinatorIdValue) : null;
      const previousValue = targetRow.assignedCoordinatorId ?? null;

      if (previousValue === newValue) {
        return;
      }

      handleRowChange(noteId, { assignedCoordinatorId: newValue });

      try {
        const response = await api.put(`/shiftHandOff/${noteId}`, {
          assignedCoordinatorId: newValue,
        });
        const updatedNote = response?.data?.note ?? response?.data?.Note;
        if (updatedNote) {
          const mapped = mapNoteToRow(updatedNote, coordinatorOptions);
          if (mapped) {
            setRows((prevRows) =>
              prevRows.map((row) => (row.id === noteId ? mapped : row))
            );
          }
        }
      } catch (err) {
        setError(getErrorMessage(err, 'No se pudo actualizar el coordinador asignado.'));
        handleRowChange(noteId, { assignedCoordinatorId: previousValue });
      }
    },
    [coordinatorOptions, handleRowChange, isAdmin, rows]
  );

  const handleAcknowledgedToggle = useCallback(
    async (noteId, coordinator, value) => {
      if (!coordinator || coordinator.id == null) {
        return;
      }

      const coordinatorId = Number(coordinator.id);
      if (Number.isNaN(coordinatorId)) {
        return;
      }

      const isSelfCoordinator =
        coordinator?.username?.trim().toLowerCase() === normalizedCurrentUsername;

      if (!isAdmin && !(isCoordinator && isSelfCoordinator)) {
        return;
      }

      const loadingKey = `${noteId}-${coordinatorId}`;
      setAckLoadingKeys((prev) => {
        const next = new Set(prev);
        next.add(loadingKey);
        return next;
      });

      const payload = { isAcknowledged: value };
      if (isAdmin) {
        payload.coordinatorUserId = coordinatorId;
      }

      try {
        const response = await api.put(`/shiftHandOff/${noteId}/acknowledgements`, payload);
        const acknowledgement = response?.data?.acknowledgement ?? response?.data?.Acknowledgement;
        const resolvedCoordinatorId =
          acknowledgement?.coordinatorUserId ?? acknowledgement?.CoordinatorUserId ?? coordinatorId;
        const key = String(resolvedCoordinatorId);

        setRows((prevRows) =>
          prevRows.map((row) => {
            if (row.id !== noteId) {
              return row;
            }

            const existing = row.acknowledgedBy?.[key] ?? {
              name: coordinator?.name,
              username: coordinator?.username,
              acknowledgedAt: null,
              checked: false,
            };

            return {
              ...row,
              acknowledgedBy: {
                ...row.acknowledgedBy,
                [key]: {
                  ...existing,
                  checked: Boolean(
                    acknowledgement?.isAcknowledged ?? acknowledgement?.IsAcknowledged ?? value
                  ),
                  acknowledgedAt:
                    acknowledgement?.acknowledgedAt ??
                    acknowledgement?.AcknowledgedAt ??
                    (value ? new Date().toISOString() : null),
                  name:
                    existing.name ??
                    acknowledgement?.coordinatorName ??
                    acknowledgement?.CoordinatorName ??
                    coordinator?.name,
                  username:
                    existing.username ??
                    acknowledgement?.coordinatorUsername ??
                    acknowledgement?.CoordinatorUsername ??
                    coordinator?.username,
                },
              },
              updatedAt: new Date().toISOString(),
            };
          })
        );
      } catch (err) {
        setError(getErrorMessage(err, 'No se pudo actualizar el acuse del coordinador.'));
      } finally {
        setAckLoadingKeys((prev) => {
          const next = new Set(prev);
          next.delete(loadingKey);
          return next;
        });
      }
    },
    [coordinatorOptionsMap, isAdmin, isCoordinator, normalizedCurrentUsername]
  );

  const handleRequestDeleteNote = useCallback(
    (note) => {
      if (!isAdmin || !note?.id) {
        return;
      }

      setDeleteModalState({
        isOpen: true,
        note,
        loading: false,
        error: '',
      });
    },
    [isAdmin]
  );

  const handleCloseDeleteModal = useCallback(() => {
    if (deleteModalState.loading) {
      return;
    }
    setDeleteModalState(DELETE_MODAL_INITIAL_STATE);
  }, [deleteModalState.loading]);

  const handleConfirmDeleteNote = useCallback(async () => {
    if (!isAdmin) {
      return;
    }

    const noteId = deleteModalState.note?.id;
    if (!noteId) {
      return;
    }

    setDeleteModalState((prev) => ({ ...prev, loading: true, error: '' }));

    setDeletingNoteIds((prev) => {
      const next = new Set(prev);
      next.add(noteId);
      return next;
    });

    try {
      await api.delete(`/shiftHandOff/${noteId}`);
      setRows((prevRows) => prevRows.filter((row) => row.id !== noteId));
      setDeleteModalState(DELETE_MODAL_INITIAL_STATE);
    } catch (err) {
      setDeleteModalState((prev) => ({
        ...prev,
        loading: false,
        error: getErrorMessage(err, 'No se pudo eliminar la nota.'),
      }));
    } finally {
      setDeletingNoteIds((prev) => {
        const next = new Set(prev);
        next.delete(noteId);
        return next;
      });
    }
  }, [deleteModalState.note, isAdmin]);

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

  const handleLogout = useCallback(() => {
    logout();
    navigate('/login');
  }, [logout, navigate]);

  const handleManageUsers = useCallback(() => {
    openUserManagementModal();
  }, [openUserManagementModal]);

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
              disabled={!(isAdmin || isCoordinator) || creatingNote || showCreateModal}
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

          {loading ? (
            <div className="turno-loading">
              <div className="turno-spinner"></div>
              Cargando datos…
            </div>
          ) : rows.length === 0 ? (
            <div className="turno-empty">
              <div className="turno-empty-icon">📝</div>
              <h3 className="turno-empty-title">Aún no hay notas registradas</h3>
              <p className="turno-empty-description">
                Crea una nueva nota desde el botón "Nueva nota" para comenzar a documentar la entrega de turno.
              </p>
            </div>
          ) : (
            <>
              <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-md-between gap-2 mb-3">
                <span className="text-muted">
                  Notas registradas: <strong>{rows.length}</strong>
                </span>
                <span className="badge bg-primary-subtle text-primary-emphasis">
                  Enterados: {acknowledgedSummary.totalAcknowledged}
                  {acknowledgedSummary.totalPossible > 0
                    ? ` / ${acknowledgedSummary.totalPossible}`
                    : ''}
                </span>
              </div>
              <div className="data-table-wrapper">
                <table className="table align-middle data-table">
                  <thead>
                    <tr>
                      <th scope="col" style={{ minWidth: '200px' }}>Fecha / creador</th>
                      <th scope="col" style={{ minWidth: '260px' }}>Nota</th>
                      <th scope="col" className="text-center">Coordinadores</th>
                      <th scope="col">Estatus</th>
                      {isAdmin && <th scope="col" className="text-end">Acciones</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row.id}>
                        <td>
                          <div className="d-flex flex-column">
                            <span>{formatDateTime(row.createdAt)}</span>
                            <span className="text-muted small">
                              Creó: {row.createdBy?.name || row.createdBy?.username || '—'}
                            </span>
                          </div>
                        </td>
                        <td style={{ minWidth: '260px' }}>
                          <div className="d-flex flex-column gap-2">
                            <textarea
                              className="form-control"
                              rows={2}
                              placeholder="Anota el resumen o la incidencia del turno"
                              value={row.description}
                              onChange={(event) =>
                                handleDescriptionChange(row.id, event.target.value)
                              }
                              onBlur={(event) => handleDescriptionBlur(row.id, event.target.value)}
                              disabled={!isAdmin}
                            />
                            <div className="d-flex align-items-center gap-2">
                              <label htmlFor={`assigned-coordinator-${row.id}`} className="form-label mb-0 small text-muted">
                                Coordinador asignado
                              </label>
                              <select
                                id={`assigned-coordinator-${row.id}`}
                                className="form-select form-select-sm"
                                value={row.assignedCoordinatorId ?? ''}
                  </span>
                  <span className="badge bg-primary-subtle text-primary-emphasis">
                    Enterados: {acknowledgedSummary.totalAcknowledged}
                    {acknowledgedSummary.totalPossible > 0
                      ? ` / ${acknowledgedSummary.totalPossible}`
                      : ''}
                  </span>
                </div>
                <div className="data-table-wrapper">
                  <table className="table align-middle data-table">
                    <thead>
                      <tr>
                        <th scope="col" style={{ minWidth: '200px' }}>Fecha / creador</th>
                        <th scope="col" style={{ minWidth: '260px' }}>Nota</th>
                        <th scope="col" className="text-center">Coordinadores</th>
                        <th scope="col">Estatus</th>
                        {isAdmin && <th scope="col" className="text-end">Acciones</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row) => (
                        <tr key={row.id}>
                          <td>
                            <div className="d-flex flex-column">
                              <span>{formatDateTime(row.createdAt)}</span>
                              <span className="text-muted small">
                                Creó: {row.createdBy?.name || row.createdBy?.username || '—'}
                              </span>
                            </div>
                          </td>
                          <td style={{ minWidth: '260px' }}>
                            <div className="d-flex flex-column gap-2">
                              <textarea
                                className="form-control"
                                rows={2}
                                placeholder="Anota el resumen o la incidencia del turno"
                                value={row.description}
                                onChange={(event) =>
                                  handleDescriptionChange(row.id, event.target.value)
                                }
                                onBlur={(event) => handleDescriptionBlur(row.id, event.target.value)}
                                disabled={!isAdmin}
                              />
                              <div className="d-flex align-items-center gap-2">
                                <label htmlFor={`assigned-coordinator-${row.id}`} className="form-label mb-0 small text-muted">
                                  Coordinador asignado
                                </label>
                                <select
                                  id={`assigned-coordinator-${row.id}`}
                                  className="form-select form-select-sm"
                                  value={row.assignedCoordinatorId ?? ''}
                                  onChange={(event) =>
                                    handleAssignedCoordinatorChange(row.id, event.target.value)
                                  }
                                  disabled={!isAdmin}
                                >
                                  <option value="">Sin asignar</option>
                                  {coordinatorOptions.map((coord) => (
                                    <option key={`coordinador-option-${coord.id}`} value={coord.id}>
                                      {coord.name}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>
                          </td>
                          <td className="text-center">
                            {(() => {
                              const acknowledgements = Object.entries(row?.acknowledgedBy ?? {});
                              const totalCoordinators = acknowledgements.length;
                              const acknowledgedCount = acknowledgements.reduce(
                                (acc, [, ackState]) => (ackState?.checked ? acc + 1 : acc),
                                0
                              );

                              if (totalCoordinators === 0) {
                                return (
                                  <span className="text-muted small">
                                    Registra coordinadores para marcar enterados
                                  </span>
                                );
                              }

                              return (
                                <div className="d-flex flex-column gap-1 align-items-start">
                                  <span className="text-muted small">
                                    Enterados: {acknowledgedCount} / {totalCoordinators}
                                  </span>
                                  {acknowledgements.map(([coordinatorId, ackState]) => {
                                    const key = String(coordinatorId);
                                    const coordinatorInfo = coordinatorOptionsMap.get(key) ?? {};
                                    const name = ackState?.name || coordinatorInfo.name || coordinatorInfo.username || `Coordinador ${key}`;
                                    const username = ackState?.username || coordinatorInfo.username || '';
                                    const isChecked = Boolean(ackState?.checked);
                                    const isSelfCoordinator = username.trim().toLowerCase() === normalizedCurrentUsername;
                                    const canToggle = isAdmin || (isCoordinator && isSelfCoordinator);
                                    const loadingKey = `${row.id}-${key}`;
                                    const isLoadingAck = ackLoadingKeys.has(loadingKey);
                                    const coordinator = {
                                      id: Number(coordinatorId),
                                      name,
                                      username,
                                    };

                                    const checkboxId = `enterado-${row.id}-${key}`;

                                    return (
                                      <div className="form-check d-flex align-items-center gap-2" key={checkboxId}>
                                        <input
                                          id={checkboxId}
                                          type="checkbox"
                                          className="form-check-input"
                                          checked={isChecked}
                                          disabled={!canToggle || isLoadingAck}
                                          onChange={(event) =>
                                            handleAcknowledgedToggle(
                                              row.id,
                                              coordinator,
                                              event.target.checked
                                            )
                                          }
                                        />
                                        <label className="form-check-label" htmlFor={checkboxId}>
                                          {name}
                                        </label>
                                        {isLoadingAck && (
                                          <span className="spinner-border spinner-border-sm text-primary" role="status" aria-hidden="true" />
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              );
                            })()}
                          </td>
                          <td style={{ minWidth: '160px' }}>
                            <div className="d-flex flex-column gap-1">
                              <select
                                className="form-select"
                                value={row.status}
                                onChange={(event) => handleStatusChange(row.id, event.target.value)}
                                disabled={!(isAdmin || isCoordinator)}
                              >
                                <option value="Pendiente">Pendiente</option>
                                <option value="Finalizado">Finalizado</option>
                              </select>
                              {row.finalizedAt && (
                                <span className="text-muted small">
                                  Finalizó: {row.finalizedBy?.name || row.finalizedBy?.username || '—'}{' '}
                                  el{' '}
                                  {formatDateTime(row.finalizedAt)}
                                </span>
                              )}
                            </div>
                          </td>
                          {isAdmin && (
                            <td className="text-end">
                              <button
                                type="button"
                                className="btn btn-outline-danger btn-sm"
                                onClick={() => handleRequestDeleteNote(row)}
                                disabled={
                                  deletingNoteIds.has(row.id) ||
                                  (deleteModalState.isOpen && deleteModalState.note?.id === row.id)
                                }
                              >
                                {deletingNoteIds.has(row.id) ||
                                (deleteModalState.loading && deleteModalState.note?.id === row.id)
                                  ? 'Eliminando…'
                                  : 'Eliminar'}
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
        {deleteModalState.isOpen && (
          <>
            <div className="modal-backdrop fade show" />
            <div className="modal fade show d-block" role="dialog" aria-modal="true">
              <div className="modal-dialog modal-dialog-centered">
                <div className="modal-content">
                  <div className="modal-header">
                    <h5 className="modal-title">Eliminar nota</h5>
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
                      ¿Deseas eliminar la nota registrada el{' '}
                      <strong>
                        {deleteModalState.note?.createdAt
                          ? formatDateTime(deleteModalState.note.createdAt)
                          : '—'}
                      </strong>
                      ? Esta acción no se puede deshacer.
                    </p>
                    {deleteModalState.note?.description && (
                      <div className="bg-light rounded p-3 mb-3">
                        <p className="small text-muted mb-1">Nota:</p>
                        <p className="small mb-0">{deleteModalState.note.description}</p>
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
                      onClick={handleConfirmDeleteNote}
                      disabled={deleteModalState.loading}
                    >
                      {deleteModalState.loading ? 'Eliminando…' : 'Eliminar nota'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {showCreateModal && (
          <>
            <div className="modal-backdrop fade show" />
            <div
              className="modal fade show d-block"
              role="dialog"
              aria-modal="true"
            >
              <div className="modal-dialog modal-dialog-centered">
                <div className="modal-content">
                  <div className="modal-header">
                    <h5 className="modal-title">Nueva nota de entrega de turno</h5>
                    <button
                      type="button"
                      className="btn-close"
                      onClick={handleCloseCreateModal}
                      aria-label="Cerrar"
                      disabled={creatingNote}
                    />
                  </div>
                  <form
                    onSubmit={(event) => {
                      event.preventDefault();
                      handleCreateNoteSubmit();
                    }}
                  >
                    <div className="modal-body">
                      <div className="mb-3">
                        <label htmlFor="create-note-description" className="form-label">
                          Descripción de la nota
                        </label>
                        <textarea
                          id="create-note-description"
                          className="form-control"
                          rows={4}
                          placeholder="Describe la incidencia o información del turno"
                          value={newNoteDescription}
                          onChange={(event) => setNewNoteDescription(event.target.value)}
                          disabled={creatingNote}
                          required
                        />
                      </div>
                      <div className="mb-3">
                        <label htmlFor="create-note-coordinator" className="form-label">
                          Coordinador asignado (opcional)
                        </label>
                        <select
                          id="create-note-coordinator"
                          className="form-select"
                          value={newNoteCoordinatorId}
                          onChange={(event) => setNewNoteCoordinatorId(event.target.value)}
                          disabled={creatingNote}
                        >
                          <option value="">Sin asignar</option>
                          {coordinatorOptions.map((coord) => (
                            <option key={`create-modal-coord-${coord.id}`} value={coord.id}>
                              {coord.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      {createModalError && (
                        <div className="alert alert-danger" role="alert">
                          {createModalError}
                        </div>
                      )}
                    </div>
                    <div className="modal-footer">
                      <button
                        type="button"
                        className="btn btn-outline-secondary"
                        onClick={handleCloseCreateModal}
                        disabled={creatingNote}
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={creatingNote}
                      >
                        {creatingNote ? 'Creando…' : 'Crear nota'}
                      </button>
                    </div>
                  </form>
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

export default EntregaTurno;
