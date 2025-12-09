using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using TruperBack.Data;
using TruperBack.Models;

namespace TruperBack.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly IConfiguration _configuration;

        public AuthController(ApplicationDbContext context, IConfiguration configuration)
        {
            _context = context;
            _configuration = configuration;
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginRequest request)
        {
            try
            {
                if (string.IsNullOrEmpty(request.Username) || string.IsNullOrEmpty(request.Password))
                {
                    return BadRequest(new { message = "Username y password son requeridos" });
                }

                var user = await _context.Users
                    .Include(u => u.Role)
                    .FirstOrDefaultAsync(u => u.Username.ToLower() == request.Username.ToLower() && u.Activo);

                if (user == null)
                {
                    return Unauthorized(new { message = "Credenciales inválidas" });
                }

                if (!VerifyPassword(request.Password, user.PasswordHash))
                {
                    return Unauthorized(new { message = "Credenciales inválidas" });
                }

                user.UltimoLogin = DateTime.UtcNow;
                await _context.SaveChangesAsync();

                var token = GenerateJwtToken(user);

                return Ok(new
                {
                    token,
                    username = user.Username,
                    fullName = user.FullName,
                    firstName = user.FirstName,
                    lastName = user.LastName,
                    role = user.Role.Nombre,
                    expiresAt = DateTime.UtcNow.AddHours(24)
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = $"Error al iniciar sesión: {ex.Message}" });
            }
        }

        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterRequest request)
        {
            try
            {
                if (string.IsNullOrEmpty(request.Username) || string.IsNullOrEmpty(request.Password))
                {
                    return BadRequest(new { message = "Username y password son requeridos" });
                }

                var existingUser = await _context.Users
                    .AnyAsync(u => u.Username.ToLower() == request.Username.ToLower());

                if (existingUser)
                {
                    return BadRequest(new { message = "El nombre de usuario ya existe" });
                }

                var role = await _context.Roles.FindAsync(request.RoleId);
                if (role == null)
                {
                    return BadRequest(new { message = "Rol no válido" });
                }

                var user = new User
                {
                    Username = request.Username,
                    PasswordHash = HashPassword(request.Password),
                    FirstName = request.FirstName,
                    LastName = request.LastName,
                    Email = request.Email,
                    RoleId = request.RoleId,
                    Activo = true,
                    FechaCreacion = DateTime.UtcNow
                };

                _context.Users.Add(user);
                await _context.SaveChangesAsync();

                var token = GenerateJwtToken(user);

                return Ok(new
                {
                    user = new
                    {
                        token,
                        username = user.Username,
                        fullName = user.FullName,
                        firstName = user.FirstName,
                        lastName = user.LastName,
                        role = role.Nombre,
                        expiresAt = DateTime.UtcNow.AddHours(24)
                    }
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = $"Error al registrar usuario: {ex.Message}" });
            }
        }

        [HttpGet("roles")]
        public async Task<IActionResult> GetRoles()
        {
            try
            {
                var roles = await _context.Roles
                    .Where(r => r.Activo)
                    .Select(r => new { r.Id, r.Nombre, r.Descripcion })
                    .ToListAsync();

                return Ok(roles);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = $"Error al obtener roles: {ex.Message}" });
            }
        }

        private string GenerateJwtToken(User user)
        {
            var jwtSettings = _configuration.GetSection("JwtSettings");
            var secretKey = jwtSettings["SecretKey"] ?? "YourSuperSecretKeyThatShouldBeAtLeast32CharactersLong!";
            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey));
            var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var claims = new[]
            {
                new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                new Claim(ClaimTypes.Name, user.Username),
                new Claim(ClaimTypes.GivenName, user.FirstName),
                new Claim(ClaimTypes.Surname, user.LastName),
                new Claim(ClaimTypes.Role, user.Role.Nombre),
                new Claim("roleId", user.RoleId.ToString())
            };

            var token = new JwtSecurityToken(
                issuer: jwtSettings["Issuer"] ?? "TruperAPI",
                audience: jwtSettings["Audience"] ?? "TruperUsers",
                claims: claims,
                expires: DateTime.UtcNow.AddHours(24),
                signingCredentials: credentials
            );

            return new JwtSecurityTokenHandler().WriteToken(token);
        }

        private bool VerifyPassword(string password, string hash)
        {
            return password == "Admin123!" && hash.Contains("YourHashedPasswordHere");
        }

        private string HashPassword(string password)
        {
            return password == "Admin123!" ? "$2a$10$YourHashedPasswordHere" : "hashed_" + password;
        }
    }

    public class LoginRequest
    {
        public string Username { get; set; }
        public string Password { get; set; }
    }

    public class RegisterRequest
    {
        public string Username { get; set; }
        public string Password { get; set; }
        public string FirstName { get; set; }
        public string LastName { get; set; }
        public string Email { get; set; }
        public int RoleId { get; set; }
    }
}
