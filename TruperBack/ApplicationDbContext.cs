using Microsoft.EntityFrameworkCore;
using TruperBack.Models;

namespace TruperBack.Data
{
    public class ApplicationDbContext : DbContext
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
            : base(options)
        {
        }

        public DbSet<Catalogo> Catalogos { get; set; }
        public DbSet<AlmacenUbicacionFolio> AlmacenesUbicacionFolios { get; set; }
        public DbSet<User> Users { get; set; }
        public DbSet<Role> Roles { get; set; }
        public DbSet<Permiso> Permisos { get; set; }
        public DbSet<RolPermiso> RolPermisos { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Configuración de la entidad Catalogo
            modelBuilder.Entity<Catalogo>(entity =>
            {
                entity.HasKey(e => e.Id);
                
                entity.Property(e => e.Tipo)
                    .IsRequired()
                    .HasMaxLength(50);
                
                entity.Property(e => e.Valor)
                    .IsRequired()
                    .HasMaxLength(255);
                
                entity.Property(e => e.CreadoPor)
                    .HasMaxLength(100);
                
                entity.Property(e => e.ActualizadoPor)
                    .HasMaxLength(100);
                
                entity.Property(e => e.FechaCreacion)
                    .HasDefaultValueSql("GETUTCDATE()");
                
                entity.Property(e => e.Activo)
                    .HasDefaultValue(true);
            });

            // Configuración de la entidad AlmacenUbicacionFolio
            modelBuilder.Entity<AlmacenUbicacionFolio>(entity =>
            {
                entity.HasKey(e => e.Id);
                
                entity.Property(e => e.Almacen)
                    .IsRequired()
                    .HasMaxLength(100);
                
                entity.Property(e => e.FolioAsignado1)
                    .IsRequired()
                    .HasMaxLength(20);
                
                entity.Property(e => e.Ubicacion)
                    .IsRequired()
                    .HasMaxLength(255);
                
                entity.Property(e => e.CreadoPor)
                    .HasMaxLength(100);
                
                entity.Property(e => e.ActualizadoPor)
                    .HasMaxLength(100);
                
                entity.Property(e => e.FechaCreacion)
                    .HasDefaultValueSql("GETUTCDATE()");
                
                entity.Property(e => e.Activo)
                    .HasDefaultValue(true);
                
                // Índice único para el campo Almacen
                entity.HasIndex(e => e.Almacen)
                    .IsUnique()
                    .HasDatabaseName("IX_AlmacenesUbicacionFolios_Almacen_Unique");
                
                // Índices para mejor rendimiento
                entity.HasIndex(e => e.Ubicacion)
                    .HasDatabaseName("IX_AlmacenesUbicacionFolios_Ubicacion");
            });

            // Configuración de la entidad User
            modelBuilder.Entity<User>(entity =>
            {
                entity.HasKey(e => e.Id);
                
                entity.Property(e => e.Username)
                    .IsRequired()
                    .HasMaxLength(100);
                
                entity.Property(e => e.PasswordHash)
                    .IsRequired()
                    .HasMaxLength(255);
                
                entity.Property(e => e.FirstName)
                    .IsRequired()
                    .HasMaxLength(100);
                
                entity.Property(e => e.LastName)
                    .IsRequired()
                    .HasMaxLength(100);
                
                entity.Property(e => e.Email)
                    .HasMaxLength(255);
                
                entity.Property(e => e.FechaCreacion)
                    .HasDefaultValueSql("GETUTCDATE()");
                
                entity.Property(e => e.Activo)
                    .HasDefaultValue(true);
                
                // Índice único para Username
                entity.HasIndex(e => e.Username)
                    .IsUnique()
                    .HasDatabaseName("IX_Users_Username_Unique");
                
                // Índices para mejor rendimiento
                entity.HasIndex(e => e.RoleId)
                    .HasDatabaseName("IX_Users_RoleId");
                
                entity.HasIndex(e => e.Activo)
                    .HasDatabaseName("IX_Users_Activo");
            });

            // Configuración de la entidad Role
            modelBuilder.Entity<Role>(entity =>
            {
                entity.HasKey(e => e.Id);
                
                entity.Property(e => e.Nombre)
                    .IsRequired()
                    .HasMaxLength(50);
                
                entity.Property(e => e.Descripcion)
                    .HasMaxLength(255);
                
                entity.Property(e => e.FechaCreacion)
                    .HasDefaultValueSql("GETUTCDATE()");
                
                entity.Property(e => e.Activo)
                    .HasDefaultValue(true);
                
                // Índice único para Nombre
                entity.HasIndex(e => e.Nombre)
                    .IsUnique()
                    .HasDatabaseName("IX_Roles_Nombre_Unique");
            });

            // Configuración de la entidad Permiso
            modelBuilder.Entity<Permiso>(entity =>
            {
                entity.HasKey(e => e.Id);
                
                entity.Property(e => e.Nombre)
                    .IsRequired()
                    .HasMaxLength(100);
                
                entity.Property(e => e.Descripcion)
                    .HasMaxLength(255);
                
                entity.Property(e => e.FechaCreacion)
                    .HasDefaultValueSql("GETUTCDATE()");
                
                entity.Property(e => e.Activo)
                    .HasDefaultValue(true);
                
                // Índice único para Nombre
                entity.HasIndex(e => e.Nombre)
                    .IsUnique()
                    .HasDatabaseName("IX_Permisos_Nombre_Unique");
            });

            // Configuración de la entidad RolPermiso
            modelBuilder.Entity<RolPermiso>(entity =>
            {
                entity.HasKey(e => e.Id);
                
                entity.Property(e => e.FechaCreacion)
                    .HasDefaultValueSql("GETUTCDATE()");
                
                entity.Property(e => e.Activo)
                    .HasDefaultValue(true);
                
                // Índice único compuesto
                entity.HasIndex(e => new { e.RolId, e.PermisoId })
                    .IsUnique()
                    .HasDatabaseName("IX_RolPermisos_RolId_PermisoId_Unique");
                
                // Índices para mejor rendimiento
                entity.HasIndex(e => e.RolId)
                    .HasDatabaseName("IX_RolPermisos_RolId");
                
                entity.HasIndex(e => e.PermisoId)
                    .HasDatabaseName("IX_RolPermisos_PermisoId");
            });

            // Configuración de consultas filtradas para entidades activas
            modelBuilder.Entity<Catalogo>()
                .HasQueryFilter(e => e.Activo);
            
            modelBuilder.Entity<AlmacenUbicacionFolio>()
                .HasQueryFilter(e => e.Activo);
            
            modelBuilder.Entity<User>()
                .HasQueryFilter(e => e.Activo);
            
            modelBuilder.Entity<Role>()
                .HasQueryFilter(e => e.Activo);
            
            modelBuilder.Entity<Permiso>()
                .HasQueryFilter(e => e.Activo);
            
            modelBuilder.Entity<RolPermiso>()
                .HasQueryFilter(e => e.Activo);
        }
    }
}
