using System.ComponentModel.DataAnnotations;

namespace TruperBack.Models
{
    public class Permiso
    {
        public int Id { get; set; }
        
        [Required]
        [StringLength(100)]
        public string Nombre { get; set; }
        
        [StringLength(255)]
        public string Descripcion { get; set; }
        
        public bool Activo { get; set; }
        
        public DateTime FechaCreacion { get; set; }
        
        public DateTime? FechaActualizacion { get; set; }
        
        // Propiedad de navegación
        public virtual ICollection<RolPermiso> RolPermisos { get; set; }
    }
}
