import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import MainNavbar from '../components/Layout/MainNavbar';
import Footer from '../components/Layout/Footer';
import { useUserManagement } from '../contexts/UserManagementContext';
import { dashboardService } from '../services/dashboard';
import './Dashboard.css';

const CORPORATE_INFO = {
  values: [
    { title: "Integridad", description: "Actuamos con honestidad y ética en todo momento", icon: "🏆", color: "#ff6b35" },
    { title: "Respetuosos", description: "Tratamos a todos con dignidad y consideración", icon: "🤝", color: "#00d4aa" },
    { title: "Congruentes", description: "Ideas y acción en la misma dirección", icon: "🎯", color: "#8b5cf6" },
    { title: "Profesionales", description: "Responsabilidad, efectividad y puntualidad", icon: "💼", color: "#fbbf24" }
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

const HERO_ACTIONS = [
  { label: 'Revisiones entregadas', variant: 'primary', path: '/revisiones-entregadas' },
  { label: 'Ver gráficas', variant: 'outline', path: '/charts' },
];

const Dashboard = () => {
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();
  const { openModal: openUserManagementModal } = useUserManagement();
  
  const [metricsLoading, setMetricsLoading] = useState(true);
  const [dashboardMetrics, setDashboardMetrics] = useState({
    revisionesProcesadas: 0,
    monitoristasActivos: 0,
    tiempoPromedio: '0 min',
  });

  const isAdmin = currentUser?.role === 'admin';
  const displayName = currentUser?.displayName;

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setMetricsLoading(true);
        const metrics = await dashboardService.getMetrics();
        setDashboardMetrics(metrics);
      } catch (error) {
        console.error('Error loading dashboard data:', error);
      } finally {
        setMetricsLoading(false);
      }
    };

    loadDashboardData();
  }, []);

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
        {/* Hero Section */}
        <section className="dashboard-card mb-4">
          <div className="row align-items-center">
            <div className="col-lg-8">
              <div className="d-flex align-items-center mb-3">
                <div className="badge bg-primary mb-2">Plataforma integral TRUPER</div>
                <h1 className="h2 mb-0 ms-3">
                  {displayName ? `Hola, ${displayName} 👋` : 'Bienvenido'}
                </h1>
              </div>
              <p className="text-muted mb-4">
                Centraliza tus revisiones, entrega de turno y análisis en un solo panel.
              </p>
              <div className="d-flex gap-2 flex-wrap">
                {HERO_ACTIONS.map(({ label, variant, path }) => (
                  <button
                    key={label}
                    className={`btn-modern ${variant === 'primary' ? 'btn-modern--primary' : 'btn-modern--outline'}`}
                    onClick={() => navigate(path)}
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

        {/* Valores TRUPER */}
        <section className="dashboard-section">
          <div className="dashboard-section__header">
            <h2 className="dashboard-section__title">Valores TRUPER</h2>
            <p className="dashboard-section__description">
              Nuestros principios guían cada decisión y acción en la plataforma.
            </p>
          </div>
          <div className="dashboard-values-grid">
            {CORPORATE_INFO.values.map((value, index) => (
              <div key={index} className="dashboard-value-card">
                <div className="dashboard-value-card__icon">
                  <div 
                    className="dashboard-value-card__icon-inner"
                    style={{ backgroundColor: value.color }}
                  >
                    {value.icon}
                  </div>
                </div>
                <h3 className="dashboard-value-card__title">{value.title}</h3>
                <p className="dashboard-value-card__description">{value.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Administración (solo admins) */}
        {isAdmin && (
          <section className="dashboard-section">
            <div className="dashboard-card">
              <div className="row align-items-center">
                <div className="col-lg-8">
                  <h3 className="h6 mb-2">Gestión de usuarios</h3>
                  <p className="text-muted small mb-0">
                    Crea perfiles, actualiza roles y restablece contraseñas.
                  </p>
                </div>
                <div className="col-lg-4 text-end">
                  <button
                    className="btn-modern btn-modern--primary"
                    onClick={openUserManagementModal}
                  >
                    Gestionar usuarios
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* TEscucha */}
        <section className="dashboard-section">
          <div className="dashboard-section__header">
            <h2 className="dashboard-section__title">Sistema TEscucha</h2>
            <p className="dashboard-section__description">
              Accede al sistema de denuncias éticas de TRUPER.
            </p>
          </div>
          <div className="dashboard-card">
            <div className="dashboard-tescucha-content">
              <div className="dashboard-tescucha-info">
                <div className="dashboard-tescucha-icon">🔍</div>
                <div className="dashboard-tescucha-details">
                  <h3 className="dashboard-tescucha-title">{TESCUCHA_INFO.title}</h3>
                  <p className="dashboard-tescucha-description">{TESCUCHA_INFO.description}</p>
                  <div className="dashboard-tescucha-features">
                    {TESCUCHA_INFO.features.map((feature, index) => (
                      <div key={index} className="dashboard-tescucha-feature">
                        <span className="dashboard-tescucha-feature-icon">{feature.icon}</span>
                        <div>
                          <h4 className="dashboard-tescucha-feature-title">{feature.title}</h4>
                          <p className="dashboard-tescucha-feature-description">{feature.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="dashboard-tescucha-action">
                <a
                  href={TESCUCHA_INFO.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-modern btn-modern--primary btn-modern--large btn-modern--gradient"
                >
                  <span className="btn-modern__icon">🔍</span>
                  <span>Ir a TEscucha</span>
                  <span className="btn-modern__arrow">→</span>
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
