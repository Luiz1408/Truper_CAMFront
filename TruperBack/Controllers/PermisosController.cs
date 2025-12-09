using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TruperBack.Data;
using TruperBack.Models;

namespace TruperBack.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class PermisosController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public PermisosController(ApplicationDbContext context)
        {
            _context = context;
        }

        // GET: api/permisos
        [HttpGet]
        public async Task<ActionResult<IEnumerable<object>>> GetPermisos()
        {
            try
            {
                var permisos = await _context.Permisos
                    .Where(p => p.Activo)
                    .Select(p => new { p.Id, p.Nombre, p.Descripcion })
                    .OrderBy(p => p.Nombre)
                    .ToListAsync();

                return Ok(permisos);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = $"Error al obtener permisos: {ex.Message}" });
            }
        }

        // GET: api/permisos/rol/{roleId}
        [HttpGet("rol/{roleId}")]
        public async Task<ActionResult<IEnumerable<object>>> GetPermisosPorRol(int roleId)
        {
            try
            {
                var permisos = await _context.RolPermisos
                    .Where(rp => rp.RolId == roleId && rp.Activo)
                    .Select(rp => new
                    {
                        rp.Permiso.Id,
                        rp.Permiso.Nombre,
                        rp.Permiso.Descripcion
                    })
                    .OrderBy(p => p.Nombre)
                    .ToListAsync();

                return Ok(permisos);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = $"Error al obtener permisos del rol: {ex.Message}" });
            }
        }

        // POST: api/permisos/asignar
        [HttpPost("asignar")]
        public async Task<IActionResult> AsignarPermisoARol([FromBody] AsignarPermisoRequest request)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    return BadRequest(ModelState);
                }

                // Verificar si ya existe la asignación
                var existe = await _context.RolPermisos
                    .AnyAsync(rp => rp.RolId == request.RolId && rp.PermisoId == request.PermisoId && rp.Activo);

                if (existe)
                {
                    return BadRequest(new { message = "El rol ya tiene asignado este permiso" });
                }

                // Verificar si el rol existe
                var rol = await _context.Roles.FindAsync(request.RolId);
                if (rol == null)
                {
                    return BadRequest(new { message = "El rol no existe" });
                }

                // Verificar si el permiso existe
                var permiso = await _context.Permisos.FindAsync(request.PermisoId);
                if (permiso == null)
                {
                    return BadRequest(new { message = "El permiso no existe" });
                }

                var rolPermiso = new RolPermiso
                {
                    RolId = request.RolId,
                    PermisoId = request.PermisoId,
                    Activo = true,
                    FechaCreacion = DateTime.UtcNow
                };

                _context.RolPermisos.Add(rolPermiso);
                await _context.SaveChangesAsync();

                return Ok(new { message = "Permiso asignado exitosamente" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = $"Error al asignar permiso: {ex.Message}" });
            }
        }

        // DELETE: api/permisos/revocar
        [HttpDelete("revocar")]
        public async Task<IActionResult> RevocarPermisoARol([FromBody] RevocarPermisoRequest request)
        {
            try
            {
                var rolPermiso = await _context.RolPermisos
                    .FirstOrDefaultAsync(rp => rp.RolId == request.RolId && rp.PermisoId == request.PermisoId && rp.Activo);

                if (rolPermiso == null)
                {
                    return NotFound(new { message = "No se encontró la asignación de permiso" });
                }

                rolPermiso.Activo = false;
                await _context.SaveChangesAsync();

                return Ok(new { message = "Permiso revocado exitosamente" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = $"Error al revocar permiso: {ex.Message}" });
            }
        }
    }

    public class AsignarPermisoRequest
    {
        public int RolId { get; set; }
        public int PermisoId { get; set; }
    }

    public class RevocarPermisoRequest
    {
        public int RolId { get; set; }
        public int PermisoId { get; set; }
    }
}
