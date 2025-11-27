import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import MainNavbar from '../components/Layout/MainNavbar';
import Footer from '../components/Layout/Footer';
import { useUserManagement } from '../contexts/UserManagementContext';
import { fetchTechnicalActivitiesSummary } from '../services/technicalActivities';
import { dashboardService } from '../services/dashboard';
import './Dashboard.css';

const HERO_ACTIONS = [
  { label: 'Revisiones entregadas', variant: 'primary', path: '/revisiones-entregadas' },
  { label: 'Ver gráficas', variant: 'outline-light', path: '/charts' },
];

const FEATURE_CARDS = [
  {
    iconClass: 'landing-feature-card__icon--upload',
    title: 'Carga inteligente de Excel',
    description:
      'Arrastra tus archivos y mantenlos sincronizados. El sistema normaliza encabezados y detecta errores automáticamente.',
    cta: { label: 'Subir un archivo →', path: '/revisiones-entregadas' },
  },
  {
    iconClass: 'landing-feature-card__icon--filters',
    title: 'Filtros y control en vivo',
    description:
      'Aplica filtros por tipo, almacén, monitorista o fecha. Navega entre páginas con acceso directo y visual elegante.',
    cta: { label: 'Explorar filtros →', path: '/revisiones-entregadas' },
  },
  {
    iconClass: 'landing-feature-card__icon--charts',
    title: 'Gráficas accionables',
    description:
      'Genera gráficos mensuales y distribuciones por almacén, monitorista o coordinador para decisiones inmediatas.',
    cta: { label: 'Generar gráficas →', path: '/charts' },
  },
];

const QUICK_ACTIONS = [
  {
    iconClass: 'landing-quick-action__icon--revisiones',
    title: 'Revisiones entregadas',
    description: 'Consulta, filtra y administra todos los registros',
    path: '/revisiones-entregadas',
  },
  {
    iconClass: 'landing-quick-action__icon--turno',
    title: 'Entrega de turno',
    description: 'Gestiona notas, asignaciones y estatus del turno',
    path: '/entrega-turno',
  },
  {
    iconClass: 'landing-quick-action__icon--analytics',
    title: 'Panel de gráficas',
    description: 'Visualiza tendencias y comparativos en minutos',
    path: '/charts',
  },
];

const CORPORATE_INFO = {
  logo: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSggZRuxRI7_82oiY4tKsMrq9QYJHGkBLFsFA&s",
  hero: "https://www.truper.com/media/brands/own/TRUPER.svg",
  values: [
    { title: "Integridad", description: "Transparencia y honestidad para lograr confiabilidad", icon: "🤝" },
    { title: "Respeto", description: "Tolerancia, cordialidad y trato con dignidad", icon: "🤝" },
    { title: "Congruencia", description: "Ideas y acción en la misma dirección", icon: "🎯" },
    { title: "Profesionalismo", description: "Responsabilidad, efectividad y puntualidad", icon: "💼" }
  ]
};

const TESCUCHA_INFO = {
  title: "TEscucha TRUPER", 
  description: "Sistema de denuncias éticas para mantener la integridad y transparencia en nuestra organización",
  features: [
    { title: "Confidencial", description: "Tu identidad está protegida en todo momento", icon: "🔒" },
    { title: "Seguro", description: "Plataforma segura para reportar cualquier irregularidad", icon: "🛡️" },
    { title: "Accesible", description: "Disponible 24/7 para todos los colaboradores", icon: "🌐" }
  ],
  url: "https://www.tescucha.com/tescucha/home/colaborador"
};

const Dashboard = () => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const { openModal: openUserManagementModal } = useUserManagement();

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

  const isAdmin = useMemo(() => {
    const normalizedRole = (currentUser?.role || '').trim().toLowerCase();
    return ['administrator', 'administrador', 'admin'].includes(normalizedRole);
  }, [currentUser]);

  const isTechnician = useMemo(() => {
    const normalizedRole = (currentUser?.role || '').trim().toLowerCase();
    return normalizedRole.includes('técnic') || normalizedRole.includes('technician');
  }, [currentUser]);

  const [technicalSummary, setTechnicalSummary] = useState({
    total: 0,
    pending: 0,
    completed: 0,
    notCompleted: 0,
  });
  const [technicalLoading, setTechnicalLoading] = useState(true);
  const [technicalError, setTechnicalError] = useState('');

  // Estados para métricas dinámicas del dashboard
  const [dashboardMetrics, setDashboardMetrics] = useState({
    revisionesProcesadas: 0,
    monitoristasActivos: 0,
    tiempoPromedio: '0 min'
  });
  const [dailySummary, setDailySummary] = useState({
    revisionesHoy: 0,
    entregasPendientes: 0,
    deteccionesCriticas: 0
  });
  const [metricsLoading, setMetricsLoading] = useState(true);
  const [metricsError, setMetricsError] = useState('');

  useEffect(() => {
    let isMounted = true;

    const loadSummary = async () => {
      setTechnicalLoading(true);
      setTechnicalError('');

      try {
        const summary = await fetchTechnicalActivitiesSummary();
        if (!isMounted) {
          return;
        }

        setTechnicalSummary({
          total: summary?.total ?? 0,
          pending: summary?.pending ?? 0,
          completed: summary?.completed ?? 0,
          notCompleted: summary?.notCompleted ?? 0,
        });
      } catch (error) {
        if (!isMounted) {
          return;
        }

        const message =
          error?.response?.data?.message ||
          (typeof error?.response?.data === 'string' ? error.response.data : '') ||
          error?.message ||
          'No se pudieron obtener las métricas técnicas.';
        setTechnicalError(message);
        setTechnicalSummary({ total: 0, pending: 0, completed: 0, notCompleted: 0 });
      } finally {
        if (isMounted) {
          setTechnicalLoading(false);
        }
      }
    };

    loadSummary();

    return () => {
      isMounted = false;
    };
  }, [currentUser]);

  useEffect(() => {
    let isMounted = true;

    const loadDashboardMetrics = async () => {
      setMetricsLoading(true);
      setMetricsError('');

      try {
        // Cargar métricas principales
        const metrics = await dashboardService.getMetrics();
        
        // Cargar resumen diario
        const summary = await dashboardService.getDailySummary();

        if (!isMounted) {
          return;
        }

        setDashboardMetrics({
          revisionesProcesadas: metrics.revisionesProcesadas || 0,
          monitoristasActivos: metrics.monitoristasActivos || 0,
          tiempoPromedio: metrics.tiempoPromedio || '0 min'
        });

        setDailySummary({
          revisionesHoy: summary.revisionesHoy || 0,
          entregasPendientes: summary.entregasPendientes || 0,
          deteccionesCriticas: summary.deteccionesCriticas || 0
        });
      } catch (error) {
        if (!isMounted) {
          return;
        }

        const message = error?.response?.data?.message || error?.message || 'Error cargando métricas del dashboard';
        setMetricsError(message);
        
        // Valores por defecto en caso de error
        setDashboardMetrics({
          revisionesProcesadas: 0,
          monitoristasActivos: 0,
          tiempoPromedio: '0 min'
        });
        setDailySummary({
          revisionesHoy: 0,
          entregasPendientes: 0,
          deteccionesCriticas: 0
        });
      } finally {
        if (isMounted) {
          setMetricsLoading(false);
        }
      }
    };

    loadDashboardMetrics();

    return () => {
      isMounted = false;
    };
  }, [currentUser]);

  const handleNavigate = (path) => {
    navigate(path);
  };

  return (
    <div className="dashboard-wrapper min-vh-100">
      <MainNavbar
        displayName={displayName || currentUser?.username || 'usuario'}
        role={currentUser?.role}
        isAdmin={isAdmin}
        onManageUsers={isAdmin ? openUserManagementModal : undefined}
        onLogout={logout}
      />

      <main className="container py-5">
        {/* Hero Section Moderno */}
        <section className="dashboard-card mb-4">
          <div className="row align-items-center">
            <div className="col-lg-8">
              <div className="d-flex align-items-center mb-3">
                <img src={CORPORATE_INFO.logo} alt="Logo" className="me-3" style={{ height: '48px' }} />
                <div>
                  <div className="badge bg-primary mb-2">Plataforma integral TRUPER</div>
                  <h1 className="h2 mb-0">
                    {displayName ? `Hola, ${displayName} 👋` : 'Bienvenido'}
                  </h1>
                </div>
              </div>
              <p className="text-muted mb-4">
                Centraliza tus revisiones, entrega de turno y análisis en un solo panel. Administra cargas Excel,
                aplica filtros inteligentes y genera gráficas en segundos.
              </p>
              <div className="d-flex gap-2 flex-wrap">
                {HERO_ACTIONS.map(({ label, variant, path }) => (
                  <button
                    key={label}
                    type="button"
                    className={`btn-modern ${
                      variant === 'primary' ? 'btn-modern--primary' : 'btn-modern--outline'
                    }`}
                    onClick={() => handleNavigate(path)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="col-lg-4">
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-card__icon">📊</div>
                  <div className="stat-card__value">
                    {metricsLoading ? '...' : dashboardMetrics.revisionesProcesadas}
                  </div>
                  <div className="stat-card__label">Revisiones procesadas</div>
                </div>
                <div className="stat-card">
                  <div className="stat-card__icon">👥</div>
                  <div className="stat-card__value">
                    {metricsLoading ? '...' : dashboardMetrics.monitoristasActivos}
                  </div>
                  <div className="stat-card__label">Monitoristas activos</div>
                </div>
              </div>
            </div>
          </div>
        </section>
                <span className="landing-hero__meta-label">Monitoristas activos</span>
              </div>
              <div>
                <span className="landing-hero__meta-number">
                  {metricsLoading ? '...' : dashboardMetrics.tiempoPromedio}
                </span>
                <span className="landing-hero__meta-label">Tiempo promedio de revisión</span>
              </div>
              <div className="landing-hero__meta-technical">
                <span className="landing-hero__meta-number">
                  {technicalLoading ? '...' : technicalSummary.total}
                </span>
                <span className="landing-hero__meta-label">Actividades</span>
                <div className="landing-hero__meta-technical-details">
                  <span className="landing-hero__meta-detail text-success">
                    {technicalLoading ? '...' : technicalSummary.completed} ✓
                  </span>
                  <span className="landing-hero__meta-detail text-warning">
                    {technicalLoading ? '...' : technicalSummary.pending} ⏱
                  </span>
                  <span className="landing-hero__meta-detail text-danger">
                    {technicalLoading ? '...' : technicalSummary.notCompleted} ✗
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="landing-hero__visual" aria-hidden="true">
            <img src={CORPORATE_INFO.hero} alt="Operaciones TRUPER" className="landing-hero__image" />
            <div className="landing-hero__glow" />
            <div className="landing-hero__card landing-hero__card--revisiones">
              <h3>Resumen diario</h3>
              <ul>
                <li>
                  <span>Revisiones hoy</span>
                  <strong>{metricsLoading ? '...' : dailySummary.revisionesHoy}</strong>
                </li>
                <li>
                  <span>Entrega turno</span>
                  <strong>{metricsLoading ? '...' : dailySummary.entregasPendientes} pendientes</strong>
                </li>
                <li>
                  <span>Detecciones críticas</span>
                  <strong>{metricsLoading ? '...' : dailySummary.deteccionesCriticas}</strong>
                </li>
              </ul>
            </div>
          </div>
        </section>

        <section className="landing-section landing-values mt-5">
          <div className="landing-section__header">
            <h2>Valores TRUPER</h2>
            <p className="text-muted">
              Nuestros principios guían cada decisión y acción en la plataforma.
            </p>
          </div>
          <div className="landing-values__grid">
            {CORPORATE_INFO.values.map((value, index) => (
              <div key={index} className="landing-value-card">
                <div className="landing-value-card__icon">
                  <div className={`landing-value-card__icon-inner landing-value-card__icon-inner--${index + 1}`}>
                    {value.icon}
                  </div>
                </div>
                <h3>{value.title}</h3>
                <p>{value.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="landing-section landing-tescucha mt-5">
              Herramientas diseñadas para coordinadores, monitoristas y administradores que necesitan visibilidad end-to-end.
            </p>
          </div>
          <div className="dashboard-grid dashboard-grid--cols-3">
            {FEATURE_CARDS.map(({ iconClass, title, description, cta }) => (
              <div key={title} className="dashboard-card">
                <div className={`landing-feature-card__icon ${iconClass} mb-3`} />
                <h3 className="h6 mb-2">{title}</h3>
                <p className="text-muted small mb-3">{description}</p>
                <button
                  type="button"
                  className="btn-modern btn-modern--outline w-100"
                  onClick={() => handleNavigate(cta.path)}
                >
                  {cta.label}
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Sección de Administración (solo para admins) */}
        {isAdmin && (
          <section>
            <div className="dashboard-card__header mb-3">
              <h2 className="dashboard-card__title">Administración avanzada</h2>
              <p className="dashboard-card__description">
                Los administradores pueden gestionar roles, contraseñas y activar o desactivar cuentas.
              </p>
            </div>
            <div className="dashboard-card">
              <div className="row align-items-center">
                <div className="col-lg-8">
                  <h3 className="h6 mb-2">Gestiona usuarios desde un solo lugar</h3>
                  <p className="text-muted small mb-0">
                    Accede al panel de usuarios para crear nuevos perfiles, actualizar roles y restablecer contraseñas con validaciones seguras.
                  </p>
                </div>
                <div className="col-lg-4 text-end">
                  <button
                    type="button"
                    className="btn-modern btn-modern--primary"
                    onClick={openUserManagementModal}
                  >
                    Abrir gestión de usuarios
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Sección TEscucha */}
        <section className="mt-4">
          <div className="dashboard-card">
            <div className="row align-items-center">
              <div className="col-lg-8">
                <h3 className="h6 mb-2">Sistema de gestión TEscucha</h3>
                <p className="text-muted small mb-0">
                  Accede al sistema complementario para gestión avanzada de incidencias y reportes.
                </p>
              </div>
              <div className="col-lg-4 text-end">
                <a
                  href="https://tescucha.truper.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-modern btn-modern--secondary"
                >
                  Ir a TEscucha →
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};
export default Dashboard;