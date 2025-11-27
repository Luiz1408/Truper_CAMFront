import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar, Pie } from 'react-chartjs-2';
import useDashboardFilters from '../hooks/useDashboardFilters';
import { useAuth } from '../contexts/AuthContext';
import { useUserManagement } from '../contexts/UserManagementContext';
import api from '../services/api';
import { parseDateValue } from '../utils/date';
import './Charts.css';
import MainNavbar from '../components/Layout/MainNavbar';
import Footer from '../components/Layout/Footer';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend);

const CHART_COLORS = {
  bar: [
    { background: 'rgba(0, 38, 115, 0.82)', border: '#002673' },
    { background: 'rgba(255, 152, 0, 0.75)', border: '#ff9800' },
  ],
  pie: [
    { background: 'rgba(0, 38, 115, 0.82)', border: '#002673' },
    { background: 'rgba(69, 69, 70, 0.82)', border: '#454546' },
    { background: 'rgba(102, 102, 102, 0.78)', border: '#666666' },
    { background: 'rgba(255, 152, 0, 0.78)', border: '#ff9800' },
    { background: 'rgba(255, 195, 64, 0.78)', border: '#ffc340' },
    { background: 'rgba(140, 140, 140, 0.78)', border: '#8c8c8c' },
  ],
};

const PIE_DIMENSION_OPTIONS = [
  { key: 'almacen', label: 'Por almacén', heading: 'Distribución por almacén' },
  { key: 'monitorista', label: 'Por monitorista', heading: 'Distribución por monitorista' },
  { key: 'coordinador', label: 'Por coordinador', heading: 'Distribución por coordinador' },
  { key: 'tipo', label: 'Por tipo', heading: 'Distribución por tipo' },
];

const DEFAULT_VIEW_CONFIG = {
  title: 'Visualización de gráficas',
  subtitle: 'Genera gráficas interactivas aplicando los mismos filtros que en el panel de datos.',
  primaryActionLabel: 'Generar gráficas',
  primaryActionLoadingLabel: 'Generando gráficas…',
  emptyStateTitle: 'Aún no se han generado gráficas.',
  emptyStateDescription: 'Selecciona los filtros deseados y presiona "Generar gráficas".',
  calloutTitle: 'Visualización de gráficas',
  calloutDescription: 'Genera las gráficas interactivas en la vista dedicada para aplicar los mismos filtros.',
};

export const ChartsView = ({ viewConfig = {} }) => {
  const {
    title,
    subtitle,
    primaryActionLabel,
    primaryActionLoadingLabel,
    emptyStateTitle,
    emptyStateDescription,
    calloutTitle,
    calloutDescription,
  } = { ...DEFAULT_VIEW_CONFIG, ...viewConfig };

  const { currentUser, logout } = useAuth();
  const { openModal: openUserManagementModal } = useUserManagement();
  const navigate = useNavigate();
  const [chartLoading, setChartLoading] = useState(false);
  const [chartError, setChartError] = useState('');
  const [barResults, setBarResults] = useState(null);
  const [pieResults, setPieResults] = useState(null);
  const [pieDimension, setPieDimension] = useState('almacen');
  const [selectedPieGroup, setSelectedPieGroup] = useState('');

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

  const displayName = useMemo(() => {
    if (!currentUser) return '';

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

  const isAdmin = useMemo(() => {
    const normalizedRole = (currentUser?.role || '').trim().toLowerCase();
    return ['administrator', 'administrador', 'admin'].includes(normalizedRole);
  }, [currentUser]);

  useEffect(() => {
    fetchFilterOptions();
  }, [fetchFilterOptions]);

  useEffect(() => {
    if (!pieResults?.labels || pieResults.labels.length === 0) {
      setSelectedPieGroup('');
      return;
    }

    if (!selectedPieGroup) {
      setSelectedPieGroup(pieResults.labels[0]);
    }
  }, [pieResults, selectedPieGroup]);

  const handleLogout = useCallback(() => {
    logout();
    navigate('/login');
  }, [logout, navigate]);

  const handleManageUsers = useCallback(() => {
    openUserManagementModal();
  }, [openUserManagementModal]);

  const handleDimensionChange = useCallback((dimension) => {
    if (dimension === pieDimension) return;
    setPieDimension(dimension);
    setSelectedPieGroup('');
  }, [pieDimension]);

  const handleGenerateCharts = useCallback(async () => {
    setChartLoading(true);
    setChartError('');

    try {
      const sharedParams = {
        tipo: filterType === 'all' ? undefined : filterType,
        almacen: filterAlmacen.trim() || undefined,
        monitorista: filterMonitorista.trim() || undefined,
        coordinador: filterCoordinador.trim() || undefined,
      };

      const [barResponse, pieResponse] = await Promise.all([
        api.get('/charts/monthly-bar-chart', { params: sharedParams }),
        api.get('/charts/pie-chart', { params: { ...sharedParams, dimension: pieDimension } }),
      ]);

      const barData = barResponse.data ?? null;
      const pieData = pieResponse.data ?? null;

      setBarResults(barData);
      setPieResults(pieData);
      setSelectedPieGroup(pieData?.labels?.[0] ?? '');
    } catch (error) {
      const message =
        error?.response?.data?.message ??
        error?.response?.data ??
        error?.message ??
        'Error al generar las gráficas.';
      setChartError(typeof message === 'string' ? message : 'Error al generar las gráficas.');
      setBarResults(null);
      setPieResults(null);
      setSelectedPieGroup('');
    } finally {
      setChartLoading(false);
    }
  }, [filterAlmacen, filterCoordinador, filterMonitorista, filterType, pieDimension]);

  const barChartData = useMemo(() => {
    if (!barResults?.labels || !Array.isArray(barResults.datasets)) {
      return null;
    }

    const datasets = barResults.datasets.map((dataset, index) => {
      const palette = CHART_COLORS.bar[index % CHART_COLORS.bar.length];
      return {
        ...dataset,
        backgroundColor: dataset.backgroundColor ?? palette.background,
        borderColor: dataset.borderColor ?? palette.border,
        borderWidth: dataset.borderWidth ?? 1,
      };
    });

    return {
      labels: barResults.labels,
      datasets,
    };
  }, [barResults]);

  const barChartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: '#454546',
        },
      },
      tooltip: {
        callbacks: {
          label(context) {
            const label = context.dataset.label || '';
            const value = context.parsed.y ?? 0;
            return `${label}: ${value}`;
          },
        },
      },
    },
    scales: {
      x: {
        ticks: { color: '#454546' },
        grid: { color: 'rgba(0, 38, 115, 0.08)' },
      },
      y: {
        beginAtZero: true,
        ticks: { color: '#454546' },
        grid: { color: 'rgba(0, 38, 115, 0.08)' },
      },
    },
  }), []);

  const pieChartData = useMemo(() => {
    if (!pieResults?.labels || !pieResults.datasets?.length) {
      return null;
    }

    const dataset = pieResults.datasets[0];
    const palette = CHART_COLORS.pie;

    const backgroundColor = pieResults.labels.map((_, index) => palette[index % palette.length].background);
    const borderColor = pieResults.labels.map((_, index) => palette[index % palette.length].border);

    return {
      labels: pieResults.labels,
      datasets: [
        {
          ...dataset,
          backgroundColor,
          borderColor,
          borderWidth: dataset.borderWidth ?? 1,
        },
      ],
    };
  }, [pieResults]);

  const pieChartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: '#454546',
        },
      },
    },
  }), []);

  const resultsPieOption = useMemo(
    () => PIE_DIMENSION_OPTIONS.find((option) => option.key === pieDimension) ?? PIE_DIMENSION_OPTIONS[0],
    [pieDimension]
  );

  const barLegendRows = useMemo(() => {
    if (!barResults?.labels || !Array.isArray(barResults.datasets) || barResults.datasets.length === 0) {
      return [];
    }

    const primaryDataset = barResults.datasets[0];
    const secondaryDataset = barResults.datasets[1];

    return barResults.labels.map((label, index) => ({
      label,
      primary: primaryDataset?.data?.[index] ?? 0,
      secondary: secondaryDataset?.data?.[index] ?? null,
    }));
  }, [barResults]);

  const selectedPieDetails = useMemo(() => {
    if (!selectedPieGroup || !pieResults?.groupDetails) {
      return null;
    }

    const groupDetails = pieResults.groupDetails[selectedPieGroup];
    if (!groupDetails) {
      return null;
    }

    return {
      byTipo: groupDetails.byTipo ?? groupDetails.ByTipo ?? {},
      byAlmacen: groupDetails.byAlmacen ?? groupDetails.ByAlmacen ?? {},
    };
  }, [pieResults, selectedPieGroup]);

  const selectedPieTotals = useMemo(() => {
    if (!selectedPieGroup || !pieResults?.details) {
      return { total: 0, percentage: 0 };
    }

    const match = pieResults.details.find(
      (detail) => (detail.name ?? detail.Name) === selectedPieGroup
    );

    return {
      total: match?.count ?? match?.Count ?? 0,
      percentage: match?.percentage ?? match?.Percentage ?? 0,
    };
  }, [pieResults, selectedPieGroup]);

  const pieBreakdowns = useMemo(() => ({
    byMonitorista: pieResults?.breakdowns?.byMonitorista ?? [],
    byCoordinador: pieResults?.breakdowns?.byCoordinador ?? [],
  }), [pieResults]);

  const summaryMetrics = useMemo(() => {
    const details = barResults?.details ?? [];
    if (!details.length) {
      return {
        totalRecords: pieResults?.datasets?.[0]?.data?.reduce((sum, value) => sum + value, 0) ?? 0,
        uniqueAlmacenes: 0,
        uniqueMonitoristas: 0,
        uniqueCoordinadores: 0,
        dateRange: null,
      };
    }

    const extract = (record, key) => record?.[key] ?? record?.[key.charAt(0).toUpperCase() + key.slice(1)] ?? 'Sin especificar';

    const almacenes = new Set(details.map((record) => extract(record, 'almacen')));
    const monitoristas = new Set(details.map((record) => extract(record, 'monitorista')));
    const coordinadores = new Set(details.map((record) => extract(record, 'coordinador')));

    const dates = details
      .map((record) => parseDateValue(record?.mes ?? record?.Mes ?? record?.mesTexto ?? record?.MesTexto))
      .filter(Boolean)
      .sort((a, b) => a.valueOf() - b.valueOf());

    const dateRange = dates.length
      ? { from: dates[0], to: dates[dates.length - 1] }
      : null;

    return {
      totalRecords: details.length,
      uniqueAlmacenes: almacenes.size,
      uniqueMonitoristas: monitoristas.size,
      uniqueCoordinadores: coordinadores.size,
      dateRange,
    };
  }, [barResults, pieResults]);

  const filterSummaryParts = useMemo(() => {
    const parts = [];

    parts.push(filterType === 'all' ? 'Tipo: todos' : `Tipo: ${filterType}`);
    if (filterAlmacen) {
      parts.push(`Almacén: ${filterAlmacen}`);
    }
    if (filterMonitorista) {
      parts.push(`Monitorista: ${filterMonitorista}`);
    }
    if (filterCoordinador) {
      parts.push(`Coordinador: ${filterCoordinador}`);
    }
    if (filterFechaEnvio) {
      parts.push(`Fecha envío: ${filterFechaEnvio}`);
    }

    const dimensionLabel = resultsPieOption?.label ?? '';
    if (dimensionLabel) {
      parts.push(`Dimensión pastel: ${dimensionLabel.toLowerCase()}`);
    }

    return parts;
  }, [filterAlmacen, filterCoordinador, filterFechaEnvio, filterMonitorista, filterType, resultsPieOption]);

  const formatDate = useCallback((value) => {
    if (!value) return '—';
    const date = parseDateValue(value);
    if (!date) return value;
    return new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium' }).format(date);
  }, []);

  const hasAnyResult = Boolean(barResults || pieResults);

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
        <div className="card border-0 shadow-lg">
          <div className="card-body p-4 p-md-5">
            <div className="d-flex flex-column flex-xl-row align-items-start align-items-xl-center justify-content-between gap-3 mb-4">
              <div>
                <h2 className="h4 mb-2">{title}</h2>
                <p className="text-muted mb-0">{subtitle}</p>
              </div>
              <div className="d-flex flex-wrap gap-2">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleGenerateCharts}
                  disabled={chartLoading}
                >
                  {chartLoading ? primaryActionLoadingLabel : primaryActionLabel}
                </button>
              </div>
            </div>

            <div className="filters-panel d-flex flex-column gap-3 mb-4">
              <div className="filters-panel__inputs d-flex flex-column flex-md-row align-items-stretch gap-2 justify-content-center">
                <select
                  className="form-select filters-panel__control"
                  value={filterType}
                  onChange={(event) => {
                    const value = event.target.value;
                    setFilterType(value);
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
              </div>
              {filterOptionsError && <span className="text-danger small">{filterOptionsError}</span>}
            </div>

            {chartError && (
              <div className="alert alert-danger" role="alert">
                {chartError}
              </div>
            )}

            {chartLoading && (
              <div className="d-flex justify-content-center py-4">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Generando gráficas...</span>
                </div>
              </div>
            )}

            {!chartLoading && hasAnyResult && (
              <div className="chart-section">
                <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3 mb-4">
                  <div>
                    <h3 className="h6 text-muted text-uppercase mb-1">Resumen de filtros</h3>
                    <div className="text-muted small">{filterSummaryParts.join(' · ')}</div>
                  </div>
                  <div className="chart-dimension-toggle btn-group" role="group" aria-label="Cambiar dimensión">
                    {PIE_DIMENSION_OPTIONS.map(({ key, label }) => (
                      <button
                        key={key}
                        type="button"
                        className={`btn btn-sm ${key === pieDimension ? 'btn-primary active' : 'btn-outline-primary'}`}
                        onClick={() => handleDimensionChange(key)}
                        disabled={chartLoading}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="row g-4">
                  {barChartData && (
                    <div className="col-12 col-xl-6">
                      <div className="card border-0 shadow-sm h-100">
                        <div className="card-body">
                          <h4 className="h6 text-muted text-uppercase mb-3">Barras mensuales</h4>
                          <div className="chart-canvas-wrapper" style={{ minHeight: '320px' }}>
                            <Bar data={barChartData} options={barChartOptions} />
                          </div>
                          {barLegendRows.length > 0 && (
                            <div className="chart-summary mt-3">
                              {barLegendRows.map(({ label, primary, secondary }) => (
                                <div key={label} className="d-flex justify-content-between align-items-center small text-muted mt-2">
                                  <span>{label}</span>
                                  <span>
                                    {primary} registro(s)
                                    {typeof secondary === 'number' ? ` · suma: ${secondary}` : ''}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {pieChartData && (
                    <div className="col-12 col-xl-6">
                      <div className="card border-0 shadow-sm h-100">
                        <div className="card-body">
                          <h4 className="h6 text-muted text-uppercase mb-3">{resultsPieOption.heading}</h4>
                          <div className="chart-canvas-wrapper" style={{ minHeight: '320px' }}>
                            <Pie data={pieChartData} options={pieChartOptions} />
                          </div>
                          <div className="chart-summary mt-3">
                            {pieResults.labels.map((label, index) => {
                              const detail = pieResults.details?.[index];
                              const value = pieResults.datasets?.[0]?.data?.[index] ?? 0;
                              const percentage = detail?.percentage ?? detail?.Percentage ?? 0;
                              const isActive = label === selectedPieGroup;
                              return (
                                <div
                                  key={label}
                                  role="button"
                                  tabIndex={0}
                                  className={`pie-summary-row d-flex justify-content-between align-items-center small mt-2 ${isActive ? 'active' : ''}`}
                                  onClick={() => setSelectedPieGroup(label)}
                                  onKeyDown={(event) => {
                                    if (event.key === 'Enter' || event.key === ' ') {
                                      event.preventDefault();
                                      setSelectedPieGroup(label);
                                    }
                                  }}
                                >
                                  <span>{label || 'Sin nombre'}</span>
                                  <span>
                                    {value} ({percentage}%)
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="row g-4 mt-1">
                  <div className="col-12 col-lg-4">
                    <div className="card border-0 shadow-sm h-100">
                      <div className="card-body">
                        <h4 className="h6 text-muted text-uppercase mb-3">Resumen general</h4>
                        <ul className="list-group list-group-flush small">
                          <li className="list-group-item d-flex justify-content-between align-items-center">
                            <span>Total de registros</span>
                            <span className="fw-semibold">{summaryMetrics.totalRecords}</span>
                          </li>
                          <li className="list-group-item d-flex justify-content-between align-items-center">
                            <span>Almacenes únicos</span>
                            <span className="fw-semibold">{summaryMetrics.uniqueAlmacenes}</span>
                          </li>
                          <li className="list-group-item d-flex justify-content-between align-items-center">
                            <span>Monitoristas únicos</span>
                            <span className="fw-semibold">{summaryMetrics.uniqueMonitoristas}</span>
                          </li>
                          <li className="list-group-item d-flex justify-content-between align-items-center">
                            <span>Coordinadores únicos</span>
                            <span className="fw-semibold">{summaryMetrics.uniqueCoordinadores}</span>
                          </li>
                          <li className="list-group-item d-flex justify-content-between align-items-center">
                            <span>Desde</span>
                            <span className="fw-semibold">
                              {summaryMetrics.dateRange?.from ? formatDate(summaryMetrics.dateRange.from) : '—'}
                            </span>
                          </li>
                          <li className="list-group-item d-flex justify-content-between align-items-center">
                            <span>Hasta</span>
                            <span className="fw-semibold">
                              {summaryMetrics.dateRange?.to ? formatDate(summaryMetrics.dateRange.to) : '—'}
                            </span>
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {selectedPieGroup && selectedPieDetails && (
                    <div className="col-12 col-lg-8">
                      <div className="card border-0 shadow-sm h-100">
                        <div className="card-body">
                          <div className="d-flex flex-column flex-lg-row justify-content-between align-items-start align-items-lg-center gap-3 mb-3">
                            <div>
                              <h4 className="h6 text-muted text-uppercase mb-1">Detalle para {selectedPieGroup}</h4>
                              <div className="text-muted small">
                                Total: {selectedPieTotals.total} registro(s) · {selectedPieTotals.percentage}% del total
                              </div>
                            </div>
                            <span className="badge rounded-pill bg-secondary-subtle text-secondary-emphasis">
                              Vista: {resultsPieOption.label}
                            </span>
                          </div>
                          <div className="row g-3">
                            <div className="col-12 col-lg-6">
                              <div className="chart-detail-card h-100">
                                <h5 className="h6 text-muted text-uppercase mb-3">Distribución por tipo</h5>
                                {Object.keys(selectedPieDetails.byTipo).length === 0 ? (
                                  <p className="small text-muted mb-0">Sin datos disponibles.</p>
                                ) : (
                                  <ul className="list-group list-group-flush small">
                                    {Object.entries(selectedPieDetails.byTipo).map(([typeLabel, count]) => (
                                      <li key={typeLabel} className="list-group-item d-flex justify-content-between align-items-center">
                                        <span>{typeLabel}</span>
                                        <span className="fw-semibold">{count}</span>
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </div>
                            </div>
                            <div className="col-12 col-lg-6">
                              <div className="chart-detail-card h-100">
                                <h5 className="h6 text-muted text-uppercase mb-3">Distribución por almacén</h5>
                                {Object.keys(selectedPieDetails.byAlmacen).length === 0 ? (
                                  <p className="small text-muted mb-0">Sin datos disponibles.</p>
                                ) : (
                                  <ul className="list-group list-group-flush small">
                                    {Object.entries(selectedPieDetails.byAlmacen).map(([warehouseLabel, count]) => (
                                      <li key={warehouseLabel} className="list-group-item d-flex justify-content-between align-items-center">
                                        <span>{warehouseLabel}</span>
                                        <span className="fw-semibold">{count}</span>
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="row g-4 mt-1">
                  {pieBreakdowns.byMonitorista.length > 0 && (
                    <div className="col-12 col-lg-6">
                      <div className="card border-0 shadow-sm h-100">
                        <div className="card-body">
                          <h4 className="h6 text-muted text-uppercase mb-3">Registros por monitorista</h4>
                          <ul className="list-group small">
                            {pieBreakdowns.byMonitorista.map((item) => (
                              <li key={item.name ?? item.Name} className="list-group-item d-flex justify-content-between align-items-center">
                                <span>{item.name ?? item.Name ?? 'Sin especificar'}</span>
                                <span className="text-muted">{item.count ?? item.Count}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}
                  {pieBreakdowns.byCoordinador.length > 0 && (
                    <div className="col-12 col-lg-6">
                      <div className="card border-0 shadow-sm h-100">
                        <div className="card-body">
                          <h4 className="h6 text-muted text-uppercase mb-3">Registros por coordinador</h4>
                          <ul className="list-group small">
                            {pieBreakdowns.byCoordinador.map((item) => (
                              <li key={item.name ?? item.Name} className="list-group-item d-flex justify-content-between align-items-center">
                                <span>{item.name ?? item.Name ?? 'Sin especificar'}</span>
                                <span className="text-muted">{item.count ?? item.Count}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {!chartLoading && !hasAnyResult && !chartError && (
              <div className="text-center py-5">
                <h3 className="h5">{emptyStateTitle}</h3>
                <p className="text-muted mb-0">{emptyStateDescription}</p>
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

const Charts = () => <ChartsView />;

export default Charts;
