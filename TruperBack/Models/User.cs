using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TruperBack.Models
{
    public class User
    {
        public int Id { get; set; }
        
        [Required]
        [StringLength(100)]
                public string Username { get; set; }
        
        [Required]
        [StringLength(255)]
        public string PasswordHash { get; set; }
        
        [Required]
        [StringLength(100)]
        public string FirstName { get; set; }
        
        [Required]
        [StringLength(100)]
        public string LastName { get; set; }
        
        [StringLength(255)]
        public string Email { get; set; }
        
        [Required]
        public int RoleId { get; set; }
        
        public bool Activo { get; set; }
        
        public DateTime FechaCreacion { get; set; }
        
        public DateTime? FechaActualizacion { get; set; }
        
        public DateTime? UltimoLogin { get; set; }
        
        // Propiedad de navegación
        [ForeignKey("RoleId")]
        public virtual Role Role { get; set; }
        
        // Propiedad calculada
        [NotMapped]
        public string FullName => $"{FirstName} {LastName}";
    }
}
