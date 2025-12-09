using System.ComponentModel.DataAnnotations;

namespace TruperBack.Models
{
    public class Catalogo
    {
        public int Id { get; set; }
        
        [Required]
        [StringLength(50)]
        public string Tipo { get; set; }
        
        [Required]
        [StringLength(255)]
        public string Valor { get; set; }
        
        public bool Activo { get; set; }
        
        public DateTime FechaCreacion { get; set; }
        
        public DateTime? FechaActualizacion { get; set; }
        
        [StringLength(100)]
        public string CreadoPor { get; set; }
        
        [StringLength(100)]
        public string ActualizadoPor { get; set; }
    }
}
