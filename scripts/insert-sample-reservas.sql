-- Insertar datos de ejemplo en la tabla reservas
-- Asegúrate de que existen las matrículas y empleados referenciados

-- Ejemplo de reservas activas
INSERT INTO reservas (matricula, empleado_id, fecha_inicio, fecha_fin, observaciones, estado) VALUES
    ('1234-AAA', 1, '2025-01-22 09:00:00+01', '2025-01-22 18:00:00+01', 'Visita a cliente en Madrid', 'activa'),
    ('5678-BBB', 2, '2025-01-23 08:00:00+01', '2025-01-23 17:00:00+01', 'Reunión en Barcelona', 'activa'),
    ('9876-CCC', 3, '2025-01-24 10:00:00+01', '2025-01-25 16:00:00+01', 'Viaje de trabajo (2 días)', 'activa');

-- Ejemplo de reservas completadas (históricas)
INSERT INTO reservas (matricula, empleado_id, fecha_inicio, fecha_fin, observaciones, estado) VALUES
    ('1234-AAA', 2, '2025-01-15 09:00:00+01', '2025-01-15 17:00:00+01', 'Visita a obras', 'completada'),
    ('5678-BBB', 1, '2025-01-16 08:30:00+01', '2025-01-16 14:00:00+01', 'Gestiones bancarias', 'completada');

-- Ejemplo de reserva cancelada
INSERT INTO reservas (matricula, empleado_id, fecha_inicio, fecha_fin, observaciones, estado) VALUES
    ('9876-CCC', 1, '2025-01-20 10:00:00+01', '2025-01-20 18:00:00+01', 'Cancelada por cambio de planes', 'cancelada');
