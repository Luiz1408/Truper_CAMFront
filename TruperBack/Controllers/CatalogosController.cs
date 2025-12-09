using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TruperBack.Data;
using TruperBack.Models;

namespace TruperBack.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class CatalogosController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public CatalogosController(ApplicationDbContext context)
        {
            _context = context;
        }

        // GET: api/catalogos/tipo
        [HttpGet("{tipo}")]
        public async Task<ActionResult<IEnumerable<Catalogo>>> GetCatalogosByTipo(string tipo)
        {
            try
            {
                var catalogos = await _context.Catalogos
                    .Where(c => c.Tipo.ToUpper() == tipo.ToUpper() && c.Activo)
                    .OrderBy(c => c.Valor)
                    .ToListAsync();
                
                return Ok(catalogos);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error al obtener catálogos: {ex.Message}");
            }
        }

        // GET: api/catalogos
        [HttpGet]
        public async Task<ActionResult<IEnumerable<string>>> GetTipos()
        {
            try
            {
                var tipos = await _context.Catalogos
                    .Where(c => c.Activo)
                    .Select(c => c.Tipo)
                    .Distinct()
                    .OrderBy(t => t)
                    .ToListAsync();
                
                return Ok(tipos);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error al obtener tipos: {ex.Message}");
            }
        }

        // POST: api/catalogos
        [HttpPost]
        public async Task<ActionResult<Catalogo>> CreateCatalogo(Catalogo catalogo)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    return BadRequest(ModelState);
                }

                // Verificar si ya existe un valor duplicado para el mismo tipo
                var exists = await _context.Catalogos
                    .AnyAsync(c => c.Tipo.ToUpper() == catalogo.Tipo.ToUpper() 
                                  && c.Valor.ToUpper() == catalogo.Valor.ToUpper() 
                                  && c.Activo);
                
                if (exists)
                {
                    return BadRequest($"Ya existe un catálogo con tipo '{catalogo.Tipo}' y valor '{catalogo.Valor}'");
                }

                catalogo.FechaCreacion = DateTime.UtcNow;
                catalogo.Activo = true;
                catalogo.CreadoPor = catalogo.CreadoPor ?? "System";
                
                _context.Catalogos.Add(catalogo);
                await _context.SaveChangesAsync();
                
                return CreatedAtAction(nameof(GetCatalogosByTipo), 
                    new { tipo = catalogo.Tipo }, catalogo);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error al crear catálogo: {ex.Message}");
            }
        }

        // PUT: api/catalogos/5
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateCatalogo(int id, Catalogo catalogo)
        {
            try
            {
                if (id != catalogo.Id)
                {
                    return BadRequest("El ID del catálogo no coincide");
                }

                if (!ModelState.IsValid)
                {
                    return BadRequest(ModelState);
                }

                var existing = await _context.Catalogos.FindAsync(id);
                if (existing == null)
                {
                    return NotFound("Catálogo no encontrado");
                }

                // Verificar si ya existe un valor duplicado (excluyendo el actual)
                var exists = await _context.Catalogos
                    .AnyAsync(c => c.Id != id 
                                  && c.Tipo.ToUpper() == catalogo.Tipo.ToUpper() 
                                  && c.Valor.ToUpper() == catalogo.Valor.ToUpper() 
                                  && c.Activo);
                
                if (exists)
                {
                    return BadRequest($"Ya existe otro catálogo con tipo '{catalogo.Tipo}' y valor '{catalogo.Valor}'");
                }

                existing.Valor = catalogo.Valor;
                existing.FechaActualizacion = DateTime.UtcNow;
                existing.ActualizadoPor = catalogo.ActualizadoPor ?? "System";
                
                await _context.SaveChangesAsync();
                return NoContent();
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error al actualizar catálogo: {ex.Message}");
            }
        }

        // DELETE: api/catalogos/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteCatalogo(int id)
        {
            try
            {
                var catalogo = await _context.Catalogos.FindAsync(id);
                if (catalogo == null)
                {
                    return NotFound("Catálogo no encontrado");
                }

                catalogo.Activo = false;
                catalogo.FechaActualizacion = DateTime.UtcNow;
                catalogo.ActualizadoPor = "System";
                
                await _context.SaveChangesAsync();
                return NoContent();
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error al eliminar catálogo: {ex.Message}");
            }
        }
    }
}
