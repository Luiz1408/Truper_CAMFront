import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useUserManagement } from '../contexts/UserManagementContext';
import MainNavbar from '../components/Layout/MainNavbar';
import Footer from '../components/Layout/Footer';
import useDashboardFilters from '../hooks/useDashboardFilters';
import { useToast } from '../contexts/ToastContext';
import './RevisionesEntregadas.css';

const normalizeHeaderKey = (rawKey) =>
  (rawKey ?? '')
    .toString()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

const DISPLAY_FIELDS = [
  {
    preferredKey: 'fechaEnvio',
    label: 'Fecha de envío',
    matchers: ['fechaenvio', 'fechadeenvio'],
    format: 'date',
  },
  {
    preferredKey: 'ubicacion',
    label: 'Ubicación',
    matchers: ['ubicacion', 'ubicaciongeneral', 'ubicaciondetallada'],
  },
  {
    preferredKey: 'subIndicador',
    label: 'Sub indicador',
    matchers: ['subindicador'],
  },
  {
    preferredKey: 'colaboradorInvolucrado',
    label: 'Colaborador involucrado',
    matchers: ['colaboradorinvolucrado', 'colaborador'],
  },
  {
    preferredKey: 'quienReporta',
    label: 'Quién reporta',
    matchers: ['quienreporta', 'quienreporto', 'monitoristareporta', 'monitorista', 'persona'],
  },
];

const buildTableHeadersFromRow = (row = {}) => {
  const normalizedKeyMap = new Map();

  Object.keys(row).forEach((key) => {
    const normalized = normalizeHeaderKey(key);
    if (normalized && !normalizedKeyMap.has(normalized)) {
      normalizedKeyMap.set(normalized, key);
    }
  });

  return DISPLAY_FIELDS.map(({ preferredKey, label, matchers, format }) => {
    const matchedNormalizedKey = matchers.find((matcher) => normalizedKeyMap.has(matcher));
    const resolvedKey = matchedNormalizedKey ? normalizedKeyMap.get(matchedNormalizedKey) : preferredKey;

    return {
      key: resolvedKey,
      label,
      matchers,
      format,
    };
  });
};

const DEFAULT_TABLE_HEADERS = buildTableHeadersFromRow();

const formatDateForDisplay = (rawValue) => {
  if (rawValue === undefined || rawValue === null) {
    return '—';
  }

  const trimmed = `${rawValue}`.trim();
  if (!trimmed) {
    return '—';
  }

  const isoMatch = trimmed.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year.slice(-2)}`;
  }

  const dmyMatch = trimmed.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{2,4})/);
  if (dmyMatch) {
    const [, day, month, year] = dmyMatch;
    return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year.slice(-2)}`;
  }

  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime())) {
    const day = parsed.getDate().toString().padStart(2, '0');
    const month = (parsed.getMonth() + 1).toString().padStart(2, '0');
    const year = parsed.getFullYear().toString().slice(-2);
    return `${day}/${month}/${year}`;
  }

  return trimmed;
};

const getValueForHeader = (rowItem, header) => {
  if (!rowItem || !header) {
    return '—';
  }

  const { data, normalizedData } = rowItem;
  const applyFormat = (raw) => {
    if (raw === undefined || raw === null) {
      return '—';
    }

    const rawString = typeof raw === 'string' ? raw : `${raw}`;
    const trimmed = rawString.trim();
    if (!trimmed) {
      return '—';
    }

    if (header.format === 'date') {
      return formatDateForDisplay(trimmed);
    }

    return trimmed;
  };

  if (header.key && data && Object.prototype.hasOwnProperty.call(data, header.key)) {
    const directValue = data[header.key];
    const formattedDirect = applyFormat(directValue);
    if (formattedDirect !== '—') {
      return formattedDirect;
    }
  }

  const normalizedMap = normalizedData ?? {};

  if (Array.isArray(header.matchers)) {
    for (const matcher of header.matchers) {
      if (Object.prototype.hasOwnProperty.call(normalizedMap, matcher)) {
        const candidate = normalizedMap[matcher];
        const formattedCandidate = applyFormat(candidate);
        if (formattedCandidate !== '—') {
          return formattedCandidate;
        }
      }
    }
  }

  if (header.key) {
    const fallbackNormalized = normalizeHeaderKey(header.key);
    if (fallbackNormalized && Object.prototype.hasOwnProperty.call(normalizedMap, fallbackNormalized)) {
      const fallbackValue = normalizedMap[fallbackNormalized];
      const formattedFallback = applyFormat(fallbackValue);
      if (formattedFallback !== '—') {
        return formattedFallback;
      }
    }
  }

  return '—';
};

const RevisionesEntregadas = () => {
  const { currentUser, logout } = useAuth();
  const { openModal: openUserManagementModal } = useUserManagement();
  const { addToast } = useToast();

  const [uploadType, setUploadType] = useState('detecciones');
  const [excelData, setExcelData] = useState([]);
  const [formattedData, setFormattedData] = useState([]);
  const [uploadStatus, setUploadStatus] = useState({ type: 'info', message: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [tableHeaders, setTableHeaders] = useState(DEFAULT_TABLE_HEADERS);
  const [selectedRows, setSelectedRows] = useState([]);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);
  const [totalRecords, setTotalRecords] = useState(0);
  const fileInputRef = useRef(null);
  const [deletingAll, setDeletingAll] = useState(false);

  const {
    filterType,
    setFilterType,
    filterAlmacen,
    setFilterAlmacen,
    filterMonitorista,
    setFilterMonitorista,
    filterCoordinador,
    setFilterCoordinador,
    filterFechaEnvio,
    setFilterFechaEnvio,
    filterOptions,
    filterOptionsLoading,
    filterOptionsError,
    fetchFilterOptions,
    normalizeDateFilterValue,
  } = useDashboardFilters();

  const isAdmin = useMemo(() => {
    const normalizedRole = (currentUser?.role || '').trim().toLowerCase();
    return ['administrator', 'administrador', 'admin'].includes(normalizedRole);
  }, [currentUser]);

  const displayName = useMemo(() => {
    if (!currentUser) {
      return '';
    }

    const rawFirstName = (currentUser.firstName || '')
      .split(' ')
      .map((part) => part.trim())
      .filter(Boolean)[0];
    const rawLastName = (currentUser.lastName || '')
      .split(' ')
      .map((part) => part.trim())
      .filter(Boolean)[0];

    if (rawFirstName || rawLastName) {
      return [rawFirstName, rawLastName].filter(Boolean).join(' ');
    }

    return currentUser.fullName || currentUser.username || '';
  }, [currentUser]);

  const fetchExcelData = useCallback(
    async (pageNumber = 1, typeOverride) => {
      setLoading(true);
      setError('');

      try {
        const params = {
          page: pageNumber,
          pageSize,
        };

        const effectiveType = typeOverride ?? filterType;
        if (effectiveType && effectiveType !== 'all') {
          params.tipo = effectiveType;
        }

        if (filterAlmacen) params.almacen = filterAlmacen;
        if (filterMonitorista) params.persona = filterMonitorista;
        if (filterCoordinador) params.coordinador = filterCoordinador;
        if (filterFechaEnvio) params.fechaEnvio = filterFechaEnvio;

        const response = await api.get('/upload/uploaded-data', { params });
        const { data = [], totalRecords: total = 0 } = response.data || {};

        if (!Array.isArray(data)) {
          setExcelData([]);
          setTotalRecords(0);
          setFormattedData([]);
          setTableHeaders(DEFAULT_TABLE_HEADERS);
          return;
        }

        setExcelData(data);
        setTotalRecords(total);

        const firstRow = data[0]?.data ?? {};
        setTableHeaders(buildTableHeadersFromRow(firstRow));
      } catch (err) {
        const message =
          err?.response?.data?.message ??
          err?.response?.data ??
          err?.message ??
          'Error al cargar los datos.';
        setError(typeof message === 'string' ? message : 'Error al cargar los datos.');
        setExcelData([]);
        setTotalRecords(0);
        setFormattedData([]);
        setTableHeaders(DEFAULT_TABLE_HEADERS);
      } finally {
        setLoading(false);
      }
    },
    [filterType, filterAlmacen, filterMonitorista, filterCoordinador, filterFechaEnvio, pageSize]
  );

  const formatUploadedData = useCallback((rawData) => {
    if (!Array.isArray(rawData)) {
      return [];
    }

    return rawData.map((item, index) => {
      const payload = item?.data ?? {};
      const normalizedData = {};

      Object.entries(payload).forEach(([key, value]) => {
        const normalizedKey = normalizeHeaderKey(key);
        if (normalizedKey && !Object.prototype.hasOwnProperty.call(normalizedData, normalizedKey)) {
          normalizedData[normalizedKey] = value;
        }
      });

      const rowId = item?.id ?? item?.Id ?? index + 1;
      const rowIndex = item?.rowIndex ?? item?.RowIndex ?? item?.row_index ?? index + 1;
      const uploadType = item?.uploadType ?? item?.UploadType ?? item?.tipo ?? 'desconocido';

      return {
        rowId,
        rowIndex,
        uploadType,
        data: payload,
        normalizedData,
      };
    });
  }, []);

  const handleUploadExcel = useCallback(
    async (event) => {
      const file = event.target.files?.[0];
      if (!file) {
        return;
      }

      const formData = new FormData();
      formData.append('file', file);
      formData.append('tipo', uploadType);

      setUploadStatus({ type: 'info', message: '' });
      setLoading(true);

      try {
        const response = await api.post('/upload/upload-excel', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          params: {
            tipo: uploadType,
          },
        });

        const message = response?.data?.message ?? response?.data?.Message ?? 'Archivo subido correctamente.';
        setUploadStatus({ type: 'success', message });
        addToast({ type: 'success', message });
        fetchExcelData(page, filterType);
        fetchFilterOptions(filterType);
      } catch (err) {
        const message =
          err?.response?.data?.message ??
          err?.response?.data ??
          err?.message ??
          'Error al subir el archivo.';

        const formattedMessage = typeof message === 'string' ? message : 'Error al subir el archivo.';
        setUploadStatus({ type: 'danger', message: formattedMessage });
        addToast({ type: 'error', message: formattedMessage });
      } finally {
        setLoading(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    },
    [uploadType, fetchExcelData, page, filterType, fetchFilterOptions, addToast]
  );

  const handleDeleteSelected = useCallback(async () => {
    if (selectedRows.length === 0) {
      return;
    }

    const confirmed = window.confirm(
      `¿Estás seguro de eliminar ${selectedRows.length} registro(s) seleccionado(s)? Esta acción no se puede deshacer.`
    );

    if (!confirmed) {
      return;
    }

    try {
      await api.post('/upload/delete-selected', {
        ids: selectedRows,
      });
      addToast({ type: 'success', message: 'Registros eliminados correctamente.' });
      setSelectedRows([]);
      fetchExcelData(page, filterType);
    } catch (err) {
      const message =
        err?.response?.data?.message ??
        err?.response?.data ??
        err?.message ??
        'Error al eliminar los registros seleccionados.';

      addToast({
        type: 'error',
        message: typeof message === 'string' ? message : 'Error al eliminar los registros seleccionados.',
      });
    }
  }, [selectedRows, fetchExcelData, page, filterType, addToast]);

  const handleDeleteAll = useCallback(async () => {
    const confirmed = window.confirm(
      '¿Estás seguro de eliminar todos los registros? Esta acción no se puede deshacer.'
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingAll(true);
      await api.post('/upload/delete-all');
      addToast({ type: 'success', message: 'Todos los registros fueron eliminados correctamente.' });
      setSelectedRows([]);
      fetchExcelData(page, filterType);
    } catch (err) {
      const message =
        err?.response?.data?.message ??
        err?.response?.data ??
        err?.message ??
        'Error al eliminar todos los registros.';

      addToast({
        type: 'error',
        message: typeof message === 'string' ? message : 'Error al eliminar todos los registros.',
      });
    } finally {
      setDeletingAll(false);
    }
  }, [fetchExcelData, page, filterType, addToast]);

  const handleToggleSelectAll = useCallback(() => {
    if (formattedData.length === 0) {
      return;
    }

    if (selectedRows.length === formattedData.length) {
      setSelectedRows([]);
    } else {
      const allIds = formattedData.map((item) => item.rowId).filter(Boolean);
      setSelectedRows(allIds);
    }
  }, [formattedData, selectedRows]);

  const handleToggleRow = useCallback((item) => {
    if (!item?.rowId) {
      return;
    }

    setSelectedRows((prev) => {
      if (prev.includes(item.rowId)) {
        return prev.filter((id) => id !== item.rowId);
      }

      return [...prev, item.rowId];
    });
  }, []);

  const isRowSelected = useCallback(
    (item) => {
      if (!item?.rowId) {
        return false;
      }

      return selectedRows.includes(item.rowId);
    },
    [selectedRows]
  );

  const handleOpenFileDialog = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const selectedCount = selectedRows.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
  const allRowsSelected = formattedData.length > 0 && selectedRows.length === formattedData.length;
  const hasData = totalRecords > 0 || formattedData.length > 0;

  useEffect(() => {
    fetchExcelData(page);
  }, [fetchExcelData, page]);

  useEffect(() => {
    fetchFilterOptions(filterType);
  }, [fetchFilterOptions, filterType]);

  useEffect(() => {
    setFormattedData(formatUploadedData(excelData));
  }, [excelData, formatUploadedData]);

  const handlePageChange = (newPage) => {
    const clampedPage = Math.max(1, Math.min(newPage, totalPages));
    if (clampedPage === page) {
      return;
    }
    setPage(clampedPage);
  };

  return (
    <div className="dashboard-wrapper min-vh-100">
      <MainNavbar
        displayName={displayName || currentUser?.username || ''}
        role={currentUser?.role}
        isAdmin={isAdmin}
        onManageUsers={isAdmin ? openUserManagementModal : undefined}
        onLogout={logout}
      />

      <main className="container py-5">
        <div className="card border-0 shadow-lg">
          <div className="card-body p-4 p-md-5">
            <div className="revisiones-header">
              <div className="revisiones-header__info">
                <h1 className="display-6 mb-2">Revisiones entregadas</h1>
                <p className="text-muted mb-0">
                  Carga, filtra y administra la información de revisiones entregadas.
                </p>
              </div>

              <div className="revisiones-header__controls">
                <select
                  className="form-select revisiones-upload-select"
                  value={uploadType}
                  onChange={(event) => setUploadType(event.target.value)}
                  aria-label="Tipo de carga"
                >
                  <option value="detecciones">Detecciones</option>
                  <option value="revisiones">Revisiones</option>
                </select>

                <div className="revisiones-actions">
                  <button
                    type="button"
                    className="btn btn-primary btn-sm me-2"
                    onClick={handleOpenFileDialog}
                  >
                    Subir archivo de Excel
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline-primary btn-sm me-2"
                    onClick={() => fetchExcelData(1, filterType)}
                    disabled={loading}
                  >
                    {loading ? 'Actualizando…' : 'Actualizar datos'}
                  </button>
                  {isAdmin && (
                    <>
                      <button
                        type="button"
                        className="btn btn-outline-danger btn-sm me-2"
                        onClick={handleDeleteSelected}
                        disabled={selectedCount === 0}
                      >
                        {selectedCount > 0 ? `Eliminar selección (${selectedCount})` : 'Eliminar selección'}
                      </button>
                      <button
                        type="button"
                        className="btn btn-danger btn-sm me-2"
                        onClick={handleDeleteAll}
                        disabled={!hasData || deletingAll}
                      >
                        {deletingAll ? 'Eliminando todo…' : 'Eliminar todo'}
                      </button>
                    </>
                  )}
                  {uploadStatus.message && (
                    <button
                      type="button"
                      className="btn btn-outline-secondary btn-sm"
                      onClick={() => setUploadStatus({ type: 'info', message: '' })}
                    >
                      Limpiar mensaje
                    </button>
                  )}
                </div>
              </div>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleUploadExcel}
              accept=".xlsx,.xls,.csv"
              style={{ display: 'none' }}
            />

            {uploadStatus.message && (
              <div className={`alert alert-${uploadStatus.type} mt-3`} role="alert">
                {uploadStatus.message}
              </div>
            )}

            {error && (
              <div className="alert alert-danger mt-3" role="alert">
                {error}
              </div>
            )}

            <div className="filters-panel d-flex flex-column gap-3 mt-4">
              <div className="filters-panel__inputs d-flex flex-column flex-md-row align-items-stretch gap-2">
                <select
                  className="form-select filters-panel__control"
                  value={filterType}
                  onChange={(event) => {
                    const value = event.target.value;
                    setFilterType(value);
                    setPage(1);
                    fetchExcelData(1, value);
                    fetchFilterOptions(value);
                  }}
                >
                  <option value="all">Todos</option>
                  <option value="detecciones">Detecciones</option>
                  <option value="revisiones">Revisiones</option>
                </select>
                <select
                  className="form-select filters-panel__control"
                  value={filterAlmacen}
                  onChange={(event) => setFilterAlmacen(event.target.value)}
                  disabled={filterOptionsLoading}
                >
                  <option value="">Todos los almacenes</option>
                  {filterOptions.almacenes.map((option) => (
                    <option key={`almacen-${option}`} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                <select
                  className="form-select filters-panel__control"
                  value={filterMonitorista}
                  onChange={(event) => setFilterMonitorista(event.target.value)}
                  disabled={filterOptionsLoading}
                >
                  <option value="">Todos los monitoristas</option>
                  {filterOptions.monitoristas.map((option) => (
                    <option key={`monitorista-${option}`} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                <select
                  className="form-select filters-panel__control"
                  value={filterCoordinador}
                  onChange={(event) => setFilterCoordinador(event.target.value)}
                  disabled={filterOptionsLoading}
                >
                  <option value="">Todos los coordinadores</option>
                  {filterOptions.coordinadores.map((option) => (
                    <option key={`coordinador-${option}`} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                <input
                  type="date"
                  className="form-control filters-panel__control filters-panel__control--date"
                  placeholder="Filtrar por fecha de envío"
                  value={filterFechaEnvio}
                  onChange={(event) => setFilterFechaEnvio(normalizeDateFilterValue(event.target.value))}
                />
                {filterOptionsError && (
                  <span className="text-danger small">{filterOptionsError}</span>
                )}
              </div>

              {loading ? (
                <div className="d-flex justify-content-center py-5">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Cargando...</span>
                  </div>
                </div>
              ) : formattedData.length === 0 ? (
                <div className="text-center py-5">
                  <h3 className="h5">No hay registros disponibles.</h3>
                  <p className="text-muted mb-0">Carga un archivo Excel desde el panel correspondiente.</p>
                </div>
              ) : (
                <div className="data-table-wrapper revisiones-table-wrapper mt-3">
                  <table className="table align-middle data-table revisiones-table">
                    <thead>
                      <tr>
                        {isAdmin && (
                          <th
                            scope="col"
                            className="text-center revisiones-table__header revisiones-table__header--checkbox"
                            style={{ width: '3rem' }}
                          >
                            <input
                              type="checkbox"
                              className="form-check-input"
                              checked={allRowsSelected}
                              onChange={handleToggleSelectAll}
                              aria-label="Seleccionar todos los registros visibles"
                            />
                          </th>
                        )}
                        <th scope="col" className="revisiones-table__header revisiones-table__header--index">
                          #
                        </th>
                        {tableHeaders.map(({ key, label }) => (
                          <th
                            scope="col"
                            key={key}
                            className="text-capitalize revisiones-table__header"
                          >
                            {label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {formattedData.map((item) => {
                        const rowSelected = isRowSelected(item);
                        return (
                          <tr
                            key={`${item.uploadType || 'unknown'}-${item.rowId}`}
                            className={`revisiones-table__row${rowSelected ? ' is-selected' : ''}`}
                          >
                            {isAdmin && (
                              <td className="text-center revisiones-table__checkbox">
                                <input
                                  type="checkbox"
                                  className="form-check-input"
                                  checked={rowSelected}
                                  onChange={() => handleToggleRow(item)}
                                  aria-label={`Seleccionar registro ${item.rowIndex ?? item.rowId}`}
                                />
                              </td>
                            )}
                            <th scope="row" className="revisiones-table__index">
                              <span className="revisiones-table__index-badge">
                                {item.rowIndex ?? item.rowId}
                              </span>
                            </th>
                            {tableHeaders.map((header) => (
                              <td
                                key={`${item.rowId}-${header.key}`}
                                data-label={header.label}
                                className="revisiones-table__cell"
                              >
                                <span className="revisiones-table__cell-content">
                                  {getValueForHeader(item, header)}
                                </span>
                              </td>
                            ))}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="pagination-panel d-flex flex-column flex-lg-row align-items-center justify-content-between gap-3 mt-4">
                <div className="pagination-summary text-muted">
                  Registros totales: <strong>{totalRecords}</strong>
                  {isAdmin && selectedCount > 0 && (
                    <span className="ms-2 text-danger">
                      · Seleccionados: <strong>{selectedCount}</strong>
                    </span>
                  )}
                </div>
                <nav className="pagination-controls" aria-label="Paginación de resultados">
                  <button
                    type="button"
                    className="pagination-btn"
                    onClick={() => handlePageChange(1)}
                    disabled={page === 1}
                    aria-label="Primera página"
                  >
                    «
                  </button>
                  <button
                    type="button"
                    className="pagination-btn"
                    onClick={() => handlePageChange(page - 1)}
                    disabled={page === 1}
                    aria-label="Página anterior"
                  >
                    ‹
                  </button>
                  <div className="pagination-indicator" aria-live="polite">
                    <span className="pagination-indicator__label">Página</span>
                    <span className="pagination-indicator__value">{page}</span>
                    <span className="pagination-indicator__separator">de</span>
                    <span className="pagination-indicator__value">{totalPages}</span>
                  </div>
                  <button
                    type="button"
                    className="pagination-btn"
                    onClick={() => handlePageChange(page + 1)}
                    disabled={page === totalPages}
                    aria-label="Página siguiente"
                  >
                    ›
                  </button>
                  <button
                    type="button"
                    className="pagination-btn"
                    onClick={() => handlePageChange(totalPages)}
                    disabled={page === totalPages}
                    aria-label="Última página"
                  >
                    »
                  </button>
                </nav>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default RevisionesEntregadas;
