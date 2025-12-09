using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TruperBack.Models
{
    public class RolPermiso
    {
        public int Id { get; set; }
        
        [Required]
        public int RolId { get; set; }
        
        [Required]
        public int PermisoId { get; set; }
        
        public bool Activo { get; set; }
        
        public DateTime FechaCreacion { get; set; }
        
        public DateTime? FechaActualizacion { get; set; }
        
        // Propiedades de navegación
        [ForeignKey("RolId")]
        public virtual Role Rol { get; set; }
        
        [ForeignKey("PermisoId")]
        public virtual Permiso Permiso { get; set; }
    }
}
