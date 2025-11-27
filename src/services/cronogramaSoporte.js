import api from './api';

// Servicios para el Cronograma de Soporte
export const cronogramaSoporteService = {
  // Obtener todas las actividades de soporte
  obtenerTodas: async () => {
    try {
      const response = await api.get('/cronogramasoporte');
      return response.data;
    } catch (error) {
      console.error('Error al obtener cronograma de soporte:', error);
      throw error;
    }
  },

  // Obtener actividad por ID
  obtenerPorId: async (id) => {
    try {
      const response = await api.get(`/cronogramasoporte/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error al obtener actividad de soporte:', error);
      throw error;
    }
  },

  // Crear nueva actividad de soporte
  crear: async (datos) => {
    try {
      const response = await api.post('/cronogramasoporte', datos);
      return response.data;
    } catch (error) {
      console.error('Error al crear actividad de soporte:', error);
      throw error;
    }
  },

  // Actualizar actividad de soporte
  actualizar: async (id, datos) => {
    try {
      const response = await api.put(`/cronogramasoporte/${id}`, datos);
      return response.data;
    } catch (error) {
      console.error('Error al actualizar actividad de soporte:', error);
      throw error;
    }
  },

  // Eliminar actividad de soporte
  eliminar: async (id) => {
    try {
      const response = await api.delete(`/cronogramasoporte/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error al eliminar actividad de soporte:', error);
      throw error;
    }
  },

  // Obtener actividades por estado
  obtenerPorEstado: async (estado) => {
    try {
      const response = await api.get(`/cronogramasoporte/estado/${estado}`);
      return response.data;
    } catch (error) {
      console.error('Error al obtener actividades por estado:', error);
      throw error;
    }
  },

  // Obtener actividades por responsable
  obtenerPorResponsable: async (responsable) => {
    try {
      const response = await api.get(`/cronogramasoporte/responsable/${responsable}`);
      return response.data;
    } catch (error) {
      console.error('Error al obtener actividades por responsable:', error);
      throw error;
    }
  },

  // Obtener actividades por fecha
  obtenerPorFecha: async (fecha) => {
    try {
      const response = await api.get(`/cronogramasoporte/fecha/${fecha}`);
      return response.data;
    } catch (error) {
      console.error('Error al obtener actividades por fecha:', error);
      throw error;
    }
  },

  // Obtener actividades por rango de fechas
  obtenerPorRangoFechas: async (fechaInicio, fechaFin) => {
    try {
      const response = await api.get('/cronogramasoporte/fechas', {
        params: { fechaInicio, fechaFin }
      });
      return response.data;
    } catch (error) {
      console.error('Error al obtener actividades por rango de fechas:', error);
      throw error;
    }
  },

  // Obtener estadísticas del cronograma
  obtenerEstadisticas: async () => {
    try {
      const response = await api.get('/cronogramasoporte/estadisticas');
      return response.data;
    } catch (error) {
      console.error('Error al obtener estadísticas del cronograma:', error);
      throw error;
    }
  },

  // Cambiar estado de actividad
  cambiarEstado: async (id, estado) => {
    try {
      const response = await api.patch(`/cronogramasoporte/${id}/estado`, { estado });
      return response.data;
    } catch (error) {
      console.error('Error al cambiar estado de actividad:', error);
      throw error;
    }
  },

  // Asignar responsable
  asignarResponsable: async (id, responsable) => {
    try {
      const response = await api.patch(`/cronogramasoporte/${id}/responsable`, { responsable });
      return response.data;
    } catch (error) {
      console.error('Error al asignar responsable:', error);
      throw error;
    }
  },

  // Obtener actividades próximas (próximos 7 días)
  obtenerProximas: async () => {
    try {
      const response = await api.get('/cronogramasoporte/proximas');
      return response.data;
    } catch (error) {
      console.error('Error al obtener actividades próximas:', error);
      throw error;
    }
  },

  // Obtener actividades atrasadas
  obtenerAtrasadas: async () => {
    try {
      const response = await api.get('/cronogramasoporte/atrasadas');
      return response.data;
    } catch (error) {
      console.error('Error al obtener actividades atrasadas:', error);
      throw error;
    }
  },

  // Exportar a Excel
  exportarExcel: async (filtros = {}) => {
    try {
      const response = await api.get('/cronogramasoporte/exportar/excel', {
        params: filtros,
        responseType: 'blob'
      });
      
      // Crear un enlace para descargar el archivo
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `cronograma_soporte_${new Date().toISOString().split('T')[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      return response.data;
    } catch (error) {
      console.error('Error al exportar a Excel:', error);
      throw error;
    }
  },

  // Importar desde Excel
  importarExcel: async (archivo) => {
    try {
      const formData = new FormData();
      formData.append('archivo', archivo);
      
      const response = await api.post('/api/cronogramasoporte/importar/excel', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      return response.data;
    } catch (error) {
      console.error('Error al importar desde Excel:', error);
      throw error;
    }
  }
};

export default cronogramaSoporteService;
