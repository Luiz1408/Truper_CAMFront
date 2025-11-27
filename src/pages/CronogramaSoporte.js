import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { Calendar, Clock, User, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useUserManagement } from '../contexts/UserManagementContext';
import MainNavbar from '../components/Layout/MainNavbar';
import Footer from '../components/Layout/Footer';
import { cronogramaSoporteService } from '../services/cronogramaSoporte';
import './CronogramaSoporte.css';

const CronogramaSoporte = () => {
  const { currentUser, logout } = useAuth();
  const { openModal: openUserManagementModal } = useUserManagement();
  
  const [cronograma, setCronograma] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [filtroPrioridad, setFiltroPrioridad] = useState('todos');
  const [busqueda, setBusqueda] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [actividadActual, setActividadActual] = useState(null);
  const [formData, setFormData] = useState({
    id: null,
    titulo: '',
    descripcion: '',
    fechaProgramada: '',
    horaInicio: '',
    horaFin: '',
    responsable: '',
    prioridad: 'media',
    estado: 'pendiente',
    tipoSoporte: 'correctivo',
    sistemaAfectado: '',
    impacto: ''
  });

  useEffect(() => {
    cargarCronograma();
  }, []);

  const cargarCronograma = async () => {
    try {
      setLoading(true);
      const datos = await cronogramaSoporteService.obtenerTodas();
      setCronograma(datos);
    } catch (error) {
      toast.error('Error al cargar el cronograma de soporte');
      console.error('Error:', error);
      setCronograma([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      console.log('Enviando datos:', formData);
      
      // Preparar datos para enviar (eliminar campos vacíos y el id)
      const datosAEnviar = {
        ...formData,
        id: undefined, // No enviar el id al crear
        horaInicio: null,
        horaFin: null
      };
      
      console.log('Datos a enviar:', datosAEnviar);
      
      if (editMode) {
        await cronogramaSoporteService.actualizar(actividadActual.id, datosAEnviar);
        toast.success('Actividad de soporte actualizada correctamente');
      } else {
        await cronogramaSoporteService.crear(datosAEnviar);
        toast.success('Actividad de soporte programada correctamente');
      }
      
      setShowModal(false);
      resetForm();
      cargarCronograma();
    } catch (error) {
      console.error('Error completo:', error);
      console.error('Respuesta del servidor:', error.response);
      console.error('Datos del error:', error.response?.data);
      console.error('Mensaje de error:', error.response?.data?.message || error.message);
      
      toast.error(`Error: ${error.response?.data?.message || error.response?.data?.title || 'Error al guardar la actividad de soporte'}`);
    }
  };

  const handleEdit = (actividad) => {
    setActividadActual(actividad);
    setFormData(actividad);
    setEditMode(true);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Estás seguro de eliminar esta actividad de soporte?')) {
      try {
        await cronogramaSoporteService.eliminar(id);
        toast.success('Actividad de soporte eliminada correctamente');
        cargarCronograma();
      } catch (error) {
        toast.error('Error al eliminar la actividad de soporte');
        console.error('Error:', error);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      id: null,
      titulo: '',
      descripcion: '',
      fechaProgramada: '',
      horaInicio: '',
      horaFin: '',
      responsable: '',
      prioridad: 'media',
      estado: 'pendiente',
      tipoSoporte: 'correctivo',
      sistemaAfectado: '',
      impacto: ''
    });
    setEditMode(false);
  };

  const getPrioridadColor = (prioridad) => {
    switch (prioridad) {
      case 'alta': return 'prioridad-alta';
      case 'media': return 'prioridad-media';
      case 'baja': return 'prioridad-baja';
      default: return 'prioridad-media';
    }
  };

  const getEstadoIcon = (estado) => {
    switch (estado) {
      case 'completado': return <CheckCircle className="icono-estado completado" />;
      case 'en_progreso': return <Clock className="icono-estado en-progreso" />;
      case 'cancelado': return <XCircle className="icono-estado cancelado" />;
      default: return <AlertCircle className="icono-estado pendiente" />;
    }
  };

  const filtrarCronograma = () => {
    return cronograma.filter(actividad => {
      const coincideEstado = filtroEstado === 'todos' || actividad.estado === filtroEstado;
      const coincidePrioridad = filtroPrioridad === 'todos' || actividad.prioridad === filtroPrioridad;
      const coincideBusqueda = busqueda === '' || 
        actividad.titulo.toLowerCase().includes(busqueda.toLowerCase()) ||
        actividad.responsable.toLowerCase().includes(busqueda.toLowerCase()) ||
        actividad.sistemaAfectado.toLowerCase().includes(busqueda.toLowerCase());
      
      return coincideEstado && coincidePrioridad && coincideBusqueda;
    });
  };

  const isAdmin = currentUser?.role === 'admin';
  const displayName = currentUser?.displayName || currentUser?.username || 'usuario';

  if (loading) {
    return (
      <div className="cronograma-soporte-wrapper">
        <MainNavbar
          displayName={displayName}
          role={currentUser?.role}
          isAdmin={isAdmin}
          onManageUsers={isAdmin ? openUserManagementModal : undefined}
          onLogout={logout}
        />
        <div className="cronograma-soporte-container">
          <div className="loading">
            <div className="spinner"></div>
            <p>Cargando cronograma de soporte...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="cronograma-soporte-wrapper">
      <MainNavbar
        displayName={displayName}
        role={currentUser?.role}
        isAdmin={isAdmin}
        onManageUsers={isAdmin ? openUserManagementModal : undefined}
        onLogout={logout}
      />
      
      <div className="cronograma-soporte-container">
      <div className="header">
        <div className="header-content">
          <div className="header-left">
            <Calendar className="header-icon" />
            <div>
              <h1>Cronograma de Soporte</h1>
              <p>Planificación y seguimiento de actividades de soporte técnico</p>
            </div>
          </div>
          <button 
            className="btn btn-primary"
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
          >
            + Nueva Actividad
          </button>
        </div>
      </div>

      <div className="filters">
        <div className="filter-group">
          <input
            type="text"
            placeholder="Buscar actividades..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="search-input"
          />
        </div>
        
        <div className="filter-group">
          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            className="filter-select"
          >
            <option value="todos">Todos los estados</option>
            <option value="pendiente">Pendiente</option>
            <option value="programado">Programado</option>
            <option value="en_progreso">En Progreso</option>
            <option value="completado">Completado</option>
            <option value="cancelado">Cancelado</option>
          </select>
        </div>

        <div className="filter-group">
          <select
            value={filtroPrioridad}
            onChange={(e) => setFiltroPrioridad(e.target.value)}
            className="filter-select"
          >
            <option value="todos">Todas las prioridades</option>
            <option value="alta">Alta</option>
            <option value="media">Media</option>
            <option value="baja">Baja</option>
          </select>
        </div>
      </div>

      <div className="cronograma-grid">
        {filtrarCronograma().map((actividad) => (
          <div key={actividad.id} className="actividad-card">
            <div className="card-header">
              <div className="card-title">
                <h3>{actividad.titulo}</h3>
                <span className={`prioridad-badge ${getPrioridadColor(actividad.prioridad)}`}>
                  {actividad.prioridad.toUpperCase()}
                </span>
              </div>
              <div className="card-actions">
                <button className="btn btn-sm btn-outline-primary" onClick={() => handleEdit(actividad)}>
                  Editar
                </button>
                <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(actividad.id)}>
                  Eliminar
                </button>
              </div>
            </div>
            
            <div className="card-content">
              <p className="descripcion">{actividad.descripcion}</p>
              
              <div className="detalles-grid">
                <div className="detalle-item">
                  <Calendar className="detalle-icon" />
                  <span>{new Date(actividad.fechaProgramada).toLocaleDateString()}</span>
                </div>
                <div className="detalle-item">
                  <Clock className="detalle-icon" />
                  <span>{actividad.horaInicio} - {actividad.horaFin}</span>
                </div>
                <div className="detalle-item">
                  <User className="detalle-icon" />
                  <span>{actividad.responsable}</span>
                </div>
              </div>
              
              <div className="info-adicional">
                <div className="info-item">
                  <span>Tipo:</span>
                  <span className="tipo-soporte">{actividad.tipoSoporte}</span>
                </div>
                <div className="info-item">
                  <span>Sistema:</span>
                  <span>{actividad.sistemaAfectado}</span>
                </div>
                <div className="info-item">
                  <strong>Impacto:</strong> 
                  <span className={`impacto ${actividad.prioridad}`}>
                    {actividad.impacto}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="card-footer">
              <div className="estado-container">
                {getEstadoIcon(actividad.estado)}
                <span className="estado-text">{actividad.estado.replace('_', ' ').toUpperCase()}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 9999
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '30px',
            borderRadius: '12px',
            maxWidth: '700px',
            width: '90%',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <h2 style={{ marginBottom: '20px' }}>Nueva Actividad de Soporte</h2>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Título</label>
                <input
                  type="text"
                  value={formData.titulo}
                  onChange={(e) => setFormData({...formData, titulo: e.target.value})}
                  style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                  placeholder="Ej: Mantenimiento de servidores"
                />
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Responsable</label>
                <input
                  type="text"
                  value={formData.responsable}
                  onChange={(e) => setFormData({...formData, responsable: e.target.value})}
                  style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                  placeholder="Ej: Juan Pérez"
                />
              </div>
            </div>
            
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Descripción</label>
              <textarea
                value={formData.descripcion}
                onChange={(e) => setFormData({...formData, descripcion: e.target.value})}
                style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px', minHeight: '80px' }}
                placeholder="Describe la actividad..."
              />
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '15px', marginBottom: '15px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Fecha</label>
                <input
                  type="date"
                  value={formData.fechaProgramada}
                  onChange={(e) => setFormData({...formData, fechaProgramada: e.target.value})}
                  style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                />
              </div>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px', marginBottom: '15px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Prioridad</label>
                <select
                  value={formData.prioridad}
                  onChange={(e) => setFormData({...formData, prioridad: e.target.value})}
                  style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                >
                  <option value="alta">Alta</option>
                  <option value="media">Media</option>
                  <option value="baja">Baja</option>
                </select>
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Estado</label>
                <select
                  value={formData.estado}
                  onChange={(e) => setFormData({...formData, estado: e.target.value})}
                  style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                >
                  <option value="pendiente">Pendiente</option>
                  <option value="programado">Programado</option>
                  <option value="en_progreso">En Progreso</option>
                  <option value="completado">Completado</option>
                  <option value="cancelado">Cancelado</option>
                </select>
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Tipo de Soporte</label>
                <select
                  value={formData.tipoSoporte}
                  onChange={(e) => setFormData({...formData, tipoSoporte: e.target.value})}
                  style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                >
                  <option value="correctivo">Correctivo</option>
                  <option value="preventivo">Preventivo</option>
                  <option value="evolutivo">Evolutivo</option>
                  <option value="emergencia">Emergencia</option>
                </select>
              </div>
            </div>
            
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Sistema Afectado</label>
              <input
                type="text"
                value={formData.sistemaAfectado}
                onChange={(e) => setFormData({...formData, sistemaAfectado: e.target.value})}
                style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                placeholder="Ej: Servidores Web, Base de Datos, etc."
              />
            </div>
            
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Impacto</label>
              <textarea
                value={formData.impacto}
                onChange={(e) => setFormData({...formData, impacto: e.target.value})}
                style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px', minHeight: '60px' }}
                placeholder="Describe el impacto en el sistema..."
              />
            </div>
            
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  padding: '10px 20px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  backgroundColor: 'white',
                  cursor: 'pointer'
                }}
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                style={{
                  padding: '10px 20px',
                  border: 'none',
                  borderRadius: '4px',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  cursor: 'pointer'
                }}
              >
                Crear Actividad
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
      <Footer />
    </div>
  );
};

export default CronogramaSoporte;
