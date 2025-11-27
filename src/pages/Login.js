import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Footer from '../components/Layout/Footer';
import './Login.css';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [isForgotOpen, setIsForgotOpen] = useState(false);
  const [registerData, setRegisterData] = useState({
    username: '',
    password: '',
    firstName: '',
    lastName: '',
    roleId: '2',
  });
  const [registerError, setRegisterError] = useState('');

  // Agregar clase login-page al body
  useEffect(() => {
    document.body.classList.add('login-page');
    
    // Cleanup: remover clase al desmontar
    return () => {
      document.body.classList.remove('login-page');
    };
  }, []);
  const [registerLoading, setRegisterLoading] = useState(false);
  const { login, register, currentUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (currentUser) {
      navigate('/', { replace: true });
    }
  }, [currentUser, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(username, password);

    if (result.success) {
      navigate('/');
    } else {
      setError(result.error || 'Error al iniciar sesión');
    }

    setLoading(false);
  };

  const handleRegisterChange = (field) => (event) => {
    setRegisterData((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const resetRegisterForm = () => {
    setRegisterData({
      username: '',
      password: '',
      firstName: '',
      lastName: '',
      roleId: '2',
    });
    setRegisterError('');
  };

  const handleRegister = async (event) => {
    event.preventDefault();
    setRegisterError('');

    if (!registerData.username || !registerData.password || !registerData.firstName || !registerData.lastName) {
      setRegisterError('Completa todos los campos requeridos');
      return;
    }

    setRegisterLoading(true);

    const result = await register({
      username: registerData.username,
      password: registerData.password,
      firstName: registerData.firstName,
      lastName: registerData.lastName,
      roleId: Number(registerData.roleId) || 2,
    });

    if (result.success) {
      resetRegisterForm();
      setIsRegisterOpen(false);
      navigate('/');
    } else {
      setRegisterError(result.error || 'Error al registrarse');
    }

    setRegisterLoading(false);
  };

  const handleOpenRegister = () => {
    resetRegisterForm();
    setIsRegisterOpen(true);
  };

  const handleCloseRegister = () => {
    setIsRegisterOpen(false);
  };

  const handleOpenForgot = () => {
    setIsForgotOpen(true);
  };

  const handleCloseForgot = () => {
    setIsForgotOpen(false);
  };

  return (
    <>
      <div className="login-page">
        <div className="login-header">
          <div className="container">
            <div className="row align-items-center">
              <div className="col-12">
                <div className="login-header__content">
                  <div className="login-header__brand">
                    <div className="login-header__text">
                      <h1 className="login-header__title">TRUPER CAM</h1>
                      <p className="login-header__subtitle">Plataforma Integral de Operaciones</p>
                    </div>
                  </div>
                  <div className="login-header__decoration">
                    <div className="login-header__circle-1"></div>
                    <div className="login-header__circle-2"></div>
                    <div className="login-header__circle-3"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="login-background d-flex flex-column align-items-center justify-content-center">
          <div className="login-card shadow-lg">
            <div className="mb-4 text-center text-sm-start">
              <h2 className="login-card-title">Iniciar Sesión</h2>
            </div>
        {error && (
          <div className="alert alert-login mb-4" role="alert">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="d-flex flex-column gap-3">
          <div className="form-group">
            <label className="form-label text-white-75" htmlFor="username">
              Usuario
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="form-control login-input"
              placeholder="Nombre de Usuario"
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label text-white-75" htmlFor="password">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="form-control login-input"
              placeholder="Contraseña"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="btn login-btn align-self-start"
          >
            {loading ? 'Iniciando sesión...' : 'Entrar'}
          </button>
        </form>
        <div className="login-links pt-4 d-flex flex-column gap-3 flex-sm-row align-items-sm-center justify-content-sm-between">
          <button type="button" className="btn btn-link p-0 text-decoration-none" onClick={handleOpenForgot}>
            ¿Olvidé mi contraseña?
          </button>
          <button type="button" className="btn btn-link p-0" onClick={handleOpenRegister}>
            Crear Usuario
          </button>
        </div>
      </div>
      </div>

      {isForgotOpen && (
        <div className="register-modal-backdrop">
          <div className="card register-modal shadow-lg border-0 recovery-modal text-center">
            <div className="card-header d-flex align-items-center justify-content-between recovery-modal__header">
              <h3 className="mb-0">Recuperar contraseña</h3>
              <button type="button" className="btn-close" onClick={handleCloseForgot} aria-label="Cerrar" />
            </div>
            <div className="card-body recovery-modal__body">
              <p className="recovery-modal__description">
                Por seguridad, la recuperación de contraseñas se gestiona manualmente.
              </p>
              <p className="recovery-modal__callout">
                Contacta al administrador del sistema para restablecer tu acceso.
              </p>
              <button type="button" className="btn recovery-modal__button" onClick={handleCloseForgot}>
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

      {isRegisterOpen && (
        <div className="register-modal-backdrop">
          <div className="card register-modal shadow-lg border-0">
            <div className="card-header d-flex align-items-center justify-content-between">
              <h3 className="mb-0">Crear nuevo usuario</h3>
              <button type="button" className="btn-close" onClick={handleCloseRegister} aria-label="Cerrar" />
            </div>
            <form onSubmit={handleRegister} className="card-body">
              {registerError && (
                <div className="alert alert-danger" role="alert">
                  {registerError}
                </div>
              )}
              <div className="row g-3">
                <div className="col-12 col-md-6">
                  <label className="form-label" htmlFor="firstName">
                    Nombre
                  </label>
                  <input
                    id="firstName"
                    type="text"
                    value={registerData.firstName}
                    onChange={handleRegisterChange('firstName')}
                    className="form-control"
                    required
                  />
                </div>
                <div className="col-12 col-md-6">
                  <label className="form-label" htmlFor="lastName">
                    Apellido
                  </label>
                  <input
                    id="lastName"
                    type="text"
                    value={registerData.lastName}
                    onChange={handleRegisterChange('lastName')}
                    className="form-control"
                    required
                  />
                </div>
                <div className="col-12 col-md-6">
                  <label className="form-label" htmlFor="registerUsername">
                    Usuario
                  </label>
                  <input
                    id="registerUsername"
                    type="text"
                    value={registerData.username}
                    onChange={handleRegisterChange('username')}
                    className="form-control"
                    required
                  />
                </div>
                <div className="col-12 col-md-6">
                  <label className="form-label" htmlFor="registerRole">
                    Rol
                  </label>
                  <select
                    id="registerRole"
                    value={registerData.roleId}
                    onChange={handleRegisterChange('roleId')}
                    className="form-select"
                  >
                    <option value="2">Coordinador</option>
                    <option value="3">Monitorista</option>
                    <option value="4">Técnico</option>
                  </select>
                </div>
                <div className="col-12 col-md-6">
                  <label className="form-label" htmlFor="registerPassword">
                    Contraseña
                  </label>
                  <input
                    id="registerPassword"
                    type="password"
                    value={registerData.password}
                    onChange={handleRegisterChange('password')}
                    className="form-control"
                    required
                  />
                </div>
              </div>
              <div className="d-flex justify-content-end gap-2 mt-4">
                <button type="button" className="btn btn-outline-secondary" onClick={handleCloseRegister}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={registerLoading}>
                  {registerLoading ? 'Registrando...' : 'Registrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>
      <Footer />
    </>
  );
};

export default Login;