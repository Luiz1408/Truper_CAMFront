using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TruperBack.Models
{
    public class AlmacenUbicacionFolio
    {
        public int Id { get; set; }
        
        [Required]
        [StringLength(100)]
                public string Almacen { get; set; }
        
        [Required]
        [StringLength(20)]
        public string FolioAsignado1 { get; set; }
        
        [Required]
        [StringLength(255)]
        public string Ubicacion { get; set; }
        
        public bool Activo { get; set; }
        
        public DateTime FechaCreacion { get; set; }
        
        public DateTime? FechaActualizacion { get; set; }
        
        [StringLength(100)]
        public string CreadoPor { get; set; }
        
        [StringLength(100)]
        public string ActualizadoPor { get; set; }
    }
}
