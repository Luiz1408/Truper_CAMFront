import React from 'react';
import PropTypes from 'prop-types';
import { NavLink } from 'react-router-dom';

const NAV_LINKS = [
  { key: 'dashboard', to: '/', label: 'Inicio', end: true },
  { key: 'revisiones-entregadas', to: '/revisiones-entregadas', label: 'Revisiones entregadas' },
  { key: 'entrega-turno', to: '/entrega-turno', label: 'Entrega de turno' },
  { key: 'planeacion-tecnica', to: '/planeacion-tecnica', label: 'Planeación técnica' },
  { key: 'cronograma-soporte', to: '/cronograma-soporte', label: 'Cronograma soporte' },
  { key: 'charts', to: '/charts', label: 'Ver gráficas' },
];

const MainNavbar = ({
  brandLabel,
  displayName,
  role,
  isAdmin,
  onManageUsers,
  onLogout,
}) => {
  const resolvedBrandLabel = (brandLabel || '').trim() || 'CAM TRUPER';

  return (
    <nav className="navbar navbar-expand-lg truper-navbar shadow-sm fixed-top">
      <div className="container-fluid px-0 d-flex align-items-center justify-content-between">
        <div className="d-flex flex-column flex-lg-row align-items-lg-center gap-3">
          <div className="d-flex flex-column">
            <span className="navbar-brand fw-semibold mb-0">TRUPER CAM</span>
            <span className="navbar-subtitle small">Plataforma Integral de Operaciones</span>
          </div>
          <ul className="navbar-nav flex-row flex-wrap gap-2">
            {NAV_LINKS.map(({ key, to, label, end }) => (
              <li key={key} className="nav-item">
                <NavLink
                  to={to}
                  end={end}
                  className={({ isActive }) =>
                    `nav-link${isActive ? ' active fw-semibold' : ''}`
                  }
                >
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
        <div className="d-flex align-items-center gap-2">
          <span className="navbar-user small text-nowrap">
            {displayName}
            {role ? ` (${role})` : ''}
          </span>
          {isAdmin && typeof onManageUsers === 'function' && (
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm"
              onClick={onManageUsers}
            >
              Gestionar usuarios
            </button>
          )}
          <button
            type="button"
            className="btn btn-outline-danger btn-sm"
            onClick={onLogout}
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    </nav>
  );
};

MainNavbar.propTypes = {
  brandLabel: PropTypes.string,
  displayName: PropTypes.string.isRequired,
  role: PropTypes.string,
  isAdmin: PropTypes.bool,
  onManageUsers: PropTypes.func,
  onLogout: PropTypes.func.isRequired,
};

MainNavbar.defaultProps = {
  brandLabel: 'CAM TRUPER',
  role: '',
  isAdmin: false,
  onManageUsers: undefined,
};

export default MainNavbar;
