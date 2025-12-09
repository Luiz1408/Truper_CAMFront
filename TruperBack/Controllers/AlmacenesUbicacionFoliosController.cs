using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TruperBack.Data;
using TruperBack.Models;

namespace TruperBack.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AlmacenesUbicacionFoliosController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public AlmacenesUbicacionFoliosController(ApplicationDbContext context)
        {
            _context = context;
        }

        // GET: api/almacenesubicacionfolios
        [HttpGet]
        public async Task<ActionResult<IEnumerable<AlmacenUbicacionFolio>>> GetAlmacenes()
        {
            try
            {
                var almacenes = await _context.AlmacenesUbicacionFolios
                    .Where(a => a.Activo)
                    .OrderBy(a => a.Almacen)
                    .ToListAsync();
                
                return Ok(almacenes);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error al obtener almacenes: {ex.Message}");
            }
        }

        // GET: api/almacenesubicacionfolios/5
        [HttpGet("{id}")]
        public async Task<ActionResult<AlmacenUbicacionFolio>> GetAlmacen(int id)
        {
            try
            {
                var almacen = await _context.AlmacenesUbicacionFolios
                    .Where(a => a.Id == id && a.Activo)
                    .FirstOrDefaultAsync();
                
                if (almacen == null)
                {
                    return NotFound("Almacén no encontrado");
                }
                
                return Ok(almacen);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error al obtener almacén: {ex.Message}");
            }
        }

        // POST: api/almacenesubicacionfolios
        [HttpPost]
        public async Task<ActionResult<AlmacenUbicacionFolio>> CreateAlmacen(AlmacenUbicacionFolio almacen)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    return BadRequest(ModelState);
                }

                // Verificar si ya existe un almacén con el mismo nombre
                var exists = await _context.AlmacenesUbicacionFolios
                    .AnyAsync(a => a.Almacen.ToUpper() == almacen.Almacen.ToUpper() && a.Activo);
                
                if (exists)
                {
                    return BadRequest($"Ya existe un almacén con nombre '{almacen.Almacen}'");
                }

                almacen.FechaCreacion = DateTime.UtcNow;
                almacen.Activo = true;
                almacen.CreadoPor = almacen.CreadoPor ?? "System";
                
                _context.AlmacenesUbicacionFolios.Add(almacen);
                await _context.SaveChangesAsync();
                
                return CreatedAtAction(nameof(GetAlmacen), new { id = almacen.Id }, almacen);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error al crear almacén: {ex.Message}");
            }
        }

        // PUT: api/almacenesubicacionfolios/5
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateAlmacen(int id, AlmacenUbicacionFolio almacen)
        {
            try
            {
                if (id != almacen.Id)
                {
                    return BadRequest("El ID del almacén no coincide");
                }

                if (!ModelState.IsValid)
                {
                    return BadRequest(ModelState);
                }

                var existing = await _context.AlmacenesUbicacionFolios.FindAsync(id);
                if (existing == null)
                {
                    return NotFound("Almacén no encontrado");
                }

                // Verificar si ya existe otro almacén con el mismo nombre (excluyendo el actual)
                var exists = await _context.AlmacenesUbicacionFolios
                    .AnyAsync(a => a.Id != id 
                                  && a.Almacen.ToUpper() == almacen.Almacen.ToUpper() 
                                  && a.Activo);
                
                if (exists)
                {
                    return BadRequest($"Ya existe otro almacén con nombre '{almacen.Almacen}'");
                }

                existing.Almacen = almacen.Almacen;
                existing.FolioAsignado1 = almacen.FolioAsignado1;
                existing.Ubicacion = almacen.Ubicacion;
                existing.FechaActualizacion = DateTime.UtcNow;
                existing.ActualizadoPor = almacen.ActualizadoPor ?? "System";
                
                await _context.SaveChangesAsync();
                return NoContent();
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error al actualizar almacén: {ex.Message}");
            }
        }

        // DELETE: api/almacenesubicacionfolios/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteAlmacen(int id)
        {
            try
            {
                var almacen = await _context.AlmacenesUbicacionFolios.FindAsync(id);
                if (almacen == null)
                {
                    return NotFound("Almacén no encontrado");
                }

                almacen.Activo = false;
                almacen.FechaActualizacion = DateTime.UtcNow;
                almacen.ActualizadoPor = "System";
                
                await _context.SaveChangesAsync();
                return NoContent();
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error al eliminar almacén: {ex.Message}");
            }
        }
    }
}
