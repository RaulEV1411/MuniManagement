"""Tipos de solicitud con los que arranca una institución, con sus reglas de aprobación."""

# (nombre, efecto, descripción, [(nivel, desde)]): los montos van en la moneda de la institución y se ajustan en Configuración.
TIPOS_INICIALES = [
    ('Prórroga de plazo', 'plazo', 'Más tiempo para entregar el proyecto o una tarea.', [('departamento', 0), ('direccion', 31), ('alcaldia', 91)]),
    ('Aumento de presupuesto', 'aumento', 'Más dinero para el proyecto o una tarea.', [('departamento', 0), ('direccion', 5_000_000), ('alcaldia', 20_000_000)]),
    ('Rebajo de presupuesto', 'rebajo', 'Devolver parte del presupuesto.', [('departamento', 0), ('direccion', 5_000_000)]),
    ('Más personal', 'personal', 'Sumar una persona al equipo del proyecto.', [('departamento', 0)]),
    ('Cambio de responsable', 'responsable', 'Que otra persona quede a cargo del proyecto.', [('departamento', 0), ('direccion', 0)]),
    ('Cambio de alcance', 'ninguno', 'Cambiar lo que se va a entregar.', [('departamento', 0), ('direccion', 0)]),
    ('Otro', 'ninguno', 'Cualquier otro cambio que necesite aprobación.', [('departamento', 0)]),
]
