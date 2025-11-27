import React from 'react';

const ModernModal = ({ 
  show, 
  onClose, 
  title, 
  onSubmit, 
  submitText = "Crear", 
  submitDisabled = false,
  children,
  loading = false 
}) => {
  if (!show) return null;

  return (
    <div className="modern-modal-overlay">
      <div className="modern-modal">
        <div className="modern-modal__header">
          <h2 className="modern-modal__title">{title}</h2>
          <button 
            className="modern-modal__close"
            onClick={onClose}
            disabled={loading}
          >
            ×
          </button>
        </div>
        
        <div className="modern-modal__body">
          {children}
        </div>
        
        <div className="modern-modal__footer">
          <button
            className="btn-modern btn-modern--secondary"
            onClick={onClose}
            disabled={loading}
          >
            Cancelar
          </button>
          <button
            className="btn-modern btn-modern--primary"
            onClick={onSubmit}
            disabled={submitDisabled || loading}
          >
            {loading ? 'Procesando...' : submitText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModernModal;
