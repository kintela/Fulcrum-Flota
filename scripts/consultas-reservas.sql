-- Consultas útiles para gestionar reservas

-- 1. Ver todas las reservas activas con información del empleado y coche
SELECT 
    r.id,
    r.matricula,
    c.marca,
    c.modelo,
    e.nombre,
    e.apellidos,
    e.email,
    r.fecha_inicio,
    r.fecha_fin,
    r.observaciones,
    r.estado
FROM reservas r
JOIN coches c ON r.matricula = c.matricula
JOIN empleados e ON r.empleado_id = e.id
WHERE r.estado = 'activa'
ORDER BY r.fecha_inicio;

-- 2. Ver reservas de un empleado específico
SELECT 
    r.id,
    r.matricula,
    c.marca,
    c.modelo,
    r.fecha_inicio,
    r.fecha_fin,
    r.observaciones,
    r.estado
FROM reservas r
JOIN coches c ON r.matricula = c.matricula
WHERE r.empleado_id = 1  -- Cambiar por el ID del empleado
ORDER BY r.fecha_inicio DESC;

-- 3. Ver reservas de un coche específico
SELECT 
    r.id,
    e.nombre,
    e.apellidos,
    r.fecha_inicio,
    r.fecha_fin,
    r.observaciones,
    r.estado
FROM reservas r
JOIN empleados e ON r.empleado_id = e.id
WHERE r.matricula = '1234-AAA'  -- Cambiar por la matrícula deseada
ORDER BY r.fecha_inicio DESC;

-- 4. Verificar disponibilidad de un coche en un período específico
-- (Devuelve 0 si está disponible, >0 si tiene reservas conflictivas)
SELECT COUNT(*) as conflictos
FROM reservas
WHERE matricula = '1234-AAA'  -- Cambiar por la matrícula
  AND estado = 'activa'
  AND tsrange(fecha_inicio, fecha_fin, '[]') && 
      tsrange('2025-01-22 10:00:00+01'::timestamp, '2025-01-22 16:00:00+01'::timestamp, '[]');

-- 5. Ver coches disponibles para un período específico
SELECT DISTINCT c.matricula, c.marca, c.modelo
FROM coches c
WHERE c.matricula NOT IN (
    SELECT r.matricula
    FROM reservas r
    WHERE r.estado = 'activa'
      AND tsrange(r.fecha_inicio, r.fecha_fin, '[]') && 
          tsrange('2025-01-23 09:00:00+01'::timestamp, '2025-01-23 17:00:00+01'::timestamp, '[]')
)
AND c.donante = false  -- Excluir vehículos donantes
ORDER BY c.matricula;

-- 6. Reservas que terminan hoy (para notificaciones)
SELECT 
    r.id,
    r.matricula,
    c.marca,
    c.modelo,
    e.nombre,
    e.apellidos,
    e.email,
    r.fecha_fin,
    r.observaciones
FROM reservas r
JOIN coches c ON r.matricula = c.matricula
JOIN empleados e ON r.empleado_id = e.id
WHERE r.estado = 'activa'
  AND DATE(r.fecha_fin) = CURRENT_DATE
ORDER BY r.fecha_fin;

-- 7. Reservas que empiezan mañana (para notificaciones)
SELECT 
    r.id,
    r.matricula,
    c.marca,
    c.modelo,
    e.nombre,
    e.apellidos,
    e.email,
    r.fecha_inicio,
    r.observaciones
FROM reservas r
JOIN coches c ON r.matricula = c.matricula
JOIN empleados e ON r.empleado_id = e.id
WHERE r.estado = 'activa'
  AND DATE(r.fecha_inicio) = CURRENT_DATE + INTERVAL '1 day'
ORDER BY r.fecha_inicio;

-- 8. Estadísticas de uso por mes
SELECT 
    DATE_TRUNC('month', r.fecha_inicio) as mes,
    COUNT(*) as total_reservas,
    COUNT(DISTINCT r.matricula) as coches_utilizados,
    COUNT(DISTINCT r.empleado_id) as empleados_activos
FROM reservas r
WHERE r.estado IN ('activa', 'completada')
GROUP BY DATE_TRUNC('month', r.fecha_inicio)
ORDER BY mes DESC;

-- 9. Empleado con más reservas
SELECT 
    e.nombre,
    e.apellidos,
    e.email,
    COUNT(*) as total_reservas
FROM reservas r
JOIN empleados e ON r.empleado_id = e.id
WHERE r.estado IN ('activa', 'completada')
GROUP BY e.id, e.nombre, e.apellidos, e.email
ORDER BY total_reservas DESC;

-- 10. Coche más reservado
SELECT 
    c.matricula,
    c.marca,
    c.modelo,
    COUNT(*) as total_reservas
FROM reservas r
JOIN coches c ON r.matricula = c.matricula
WHERE r.estado IN ('activa', 'completada')
GROUP BY c.matricula, c.marca, c.modelo
ORDER BY total_reservas DESC;
