using System.ComponentModel.DataAnnotations;

namespace TruperBack.Models
{
    public class Role
    {
        public int Id { get; set; }
        
        [Required]
        [StringLength(50)]
        public string Nombre { get; set; }
        
        [StringLength(255)]
        public string Descripcion { get; set; }
        
        public bool Activo { get; set; }
        
        public DateTime FechaCreacion { get; set; }
        
        public DateTime? FechaActualizacion { get; set; }
        
        // Propiedad de navegación
        public virtual ICollection<User> Users { get; set; }
    }
}
