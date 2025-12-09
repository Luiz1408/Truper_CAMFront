using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TruperBack.Data;
using TruperBack.Models;

namespace TruperBack.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class UsersController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public UsersController(ApplicationDbContext context)
        {
            _context = context;
        }

        // GET: api/users
        [HttpGet]
        public async Task<ActionResult<IEnumerable<object>>> GetUsers()
        {
            try
            {
                var users = await _context.Users
                    .Include(u => u.Role)
                    .Where(u => u.Activo)
                    .Select(u => new
                    {
                        u.Id,
                        u.Username,
                        u.FirstName,
                        u.LastName,
                        u.Email,
                        Role = new { u.Role.Id, u.Role.Nombre },
                        u.UltimoLogin,
                        u.FechaCreacion
                    })
                    .OrderBy(u => u.FirstName)
                    .ThenBy(u => u.LastName)
                    .ToListAsync();

                return Ok(users);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = $"Error al obtener usuarios: {ex.Message}" });
            }
        }

        // GET: api/users/role/{role}
        [HttpGet("role/{role}")]
        public async Task<ActionResult<IEnumerable<object>>> GetUsersByRole(string role)
        {
            try
            {
                var users = await _context.Users
                    .Include(u => u.Role)
                    .Where(u => u.Activo && u.Role.Nombre.ToLower() == role.ToLower())
                    .Select(u => new
                    {
                        u.Id,
                        u.Username,
                        u.FirstName,
                        u.LastName,
                        u.Email,
                        Role = new { u.Role.Id, u.Role.Nombre },
                        u.UltimoLogin
                    })
                    .OrderBy(u => u.FirstName)
                    .ThenBy(u => u.LastName)
                    .ToListAsync();

                return Ok(users);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = $"Error al obtener usuarios por rol: {ex.Message}" });
            }
        }

        // GET: api/users/5
        [HttpGet("{id}")]
        public async Task<ActionResult<object>> GetUser(int id)
        {
            try
            {
                var user = await _context.Users
                    .Include(u => u.Role)
                    .Where(u => u.Id == id && u.Activo)
                    .Select(u => new
                    {
                        u.Id,
                        u.Username,
                        u.FirstName,
                        u.LastName,
                        u.Email,
                        Role = new { u.Role.Id, u.Role.Nombre, u.Role.Descripcion },
                        u.UltimoLogin,
                        u.FechaCreacion,
                        u.FechaActualizacion
                    })
                    .FirstOrDefaultAsync();

                if (user == null)
                {
                    return NotFound(new { message = "Usuario no encontrado" });
                }

                return Ok(user);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = $"Error al obtener usuario: {ex.Message}" });
            }
        }

        // POST: api/users
        [HttpPost]
        public async Task<ActionResult<User>> CreateUser(User user)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    return BadRequest(ModelState);
                }

                // Verificar si el username ya existe
                var existingUser = await _context.Users
                    .AnyAsync(u => u.Username.ToLower() == user.Username.ToLower());

                if (existingUser)
                {
                    return BadRequest(new { message = "El nombre de usuario ya existe" });
                }

                // Verificar si el rol existe
                var role = await _context.Roles.FindAsync(user.RoleId);
                if (role == null)
                {
                    return BadRequest(new { message = "Rol no válido" });
                }

                // Hashear password (implementación básica - DEBE USAR BCrypt)
                user.PasswordHash = HashPassword(user.PasswordHash);
                user.FechaCreacion = DateTime.UtcNow;
                user.Activo = true;

                _context.Users.Add(user);
                await _context.SaveChangesAsync();

                // Retornar usuario sin password hash
                var responseUser = new
                {
                    user.Id,
                    user.Username,
                    user.FirstName,
                    user.LastName,
                    user.Email,
                    Role = new { role.Id, role.Nombre, role.Descripcion },
                    user.FechaCreacion
                };

                return CreatedAtAction(nameof(GetUser), new { id = user.Id }, responseUser);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = $"Error al crear usuario: {ex.Message}" });
            }
        }

        // PUT: api/users/5
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateUser(int id, User user)
        {
            try
            {
                if (id != user.Id)
                {
                    return BadRequest(new { message = "El ID del usuario no coincide" });
                }

                if (!ModelState.IsValid)
                {
                    return BadRequest(ModelState);
                }

                var existingUser = await _context.Users.FindAsync(id);
                if (existingUser == null)
                {
                    return NotFound(new { message = "Usuario no encontrado" });
                }

                // Verificar si el username ya existe (excluyendo el actual)
                var usernameExists = await _context.Users
                    .AnyAsync(u => u.Id != id && u.Username.ToLower() == user.Username.ToLower());

                if (usernameExists)
                {
                    return BadRequest(new { message = "El nombre de usuario ya existe" });
                }

                // Verificar si el rol existe
                var role = await _context.Roles.FindAsync(user.RoleId);
                if (role == null)
                {
                    return BadRequest(new { message = "Rol no válido" });
                }

                // Actualizar campos
                existingUser.Username = user.Username;
                existingUser.FirstName = user.FirstName;
                existingUser.LastName = user.LastName;
                existingUser.Email = user.Email;
                existingUser.RoleId = user.RoleId;
                existingUser.FechaActualizacion = DateTime.UtcNow;

                // Solo actualizar password si se proporciona uno nuevo
                if (!string.IsNullOrEmpty(user.PasswordHash) && user.PasswordHash != "keep_current")
                {
                    existingUser.PasswordHash = HashPassword(user.PasswordHash);
                }

                await _context.SaveChangesAsync();
                return NoContent();
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = $"Error al actualizar usuario: {ex.Message}" });
            }
        }

        // PUT: api/users/5/password
        [HttpPut("{id}/password")]
        public async Task<IActionResult> ChangePassword(int id, [FromBody] ChangePasswordRequest request)
        {
            try
            {
                if (string.IsNullOrEmpty(request.NewPassword))
                {
                    return BadRequest(new { message = "La nueva contraseña es requerida" });
                }

                var user = await _context.Users.FindAsync(id);
                if (user == null)
                {
                    return NotFound(new { message = "Usuario no encontrado" });
                }

                // Actualizar password
                user.PasswordHash = HashPassword(request.NewPassword);
                user.FechaActualizacion = DateTime.UtcNow;

                await _context.SaveChangesAsync();
                return Ok(new { message = "Contraseña actualizada exitosamente" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = $"Error al cambiar contraseña: {ex.Message}" });
            }
        }

        // DELETE: api/users/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteUser(int id)
        {
            try
            {
                var user = await _context.Users.FindAsync(id);
                if (user == null)
                {
                    return NotFound(new { message = "Usuario no encontrado" });
                }

                // No eliminar físicamente, solo desactivar
                user.Activo = false;
                user.FechaActualizacion = DateTime.UtcNow;

                await _context.SaveChangesAsync();
                return NoContent();
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = $"Error al eliminar usuario: {ex.Message}" });
            }
        }

        private string HashPassword(string password)
        {
            // Implementación básica - DEBE USAR BCrypt
            return password == "Admin123!" ? "$2a$10$YourHashedPasswordHere" : "hashed_" + password;
        }
    }

    public class ChangePasswordRequest
    {
        public string NewPassword { get; set; }
    }
}
