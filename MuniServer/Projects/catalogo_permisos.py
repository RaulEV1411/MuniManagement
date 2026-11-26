"""Catálogo de permisos: qué se puede hacer, en qué módulo y con qué alcance.

Cada rol de la institución guarda `{permiso: alcance}` en `Roles.permisos`. Los roles de proyecto
(Responsable, Supervisor, …) guardan una lista de permisos que valen solo dentro de ese proyecto.
Los valores por defecto reproducen las reglas que tenía el sistema antes de que fueran configurables.
"""

PROPIO = 'propio'
DEPARTAMENTO = 'departamento'
DIRECCION = 'direccion'
TODOS = 'todos'
ALCANCES = [PROPIO, DEPARTAMENTO, DIRECCION, TODOS]
ETIQUETAS_ALCANCE = {
    PROPIO: 'Lo propio',
    DEPARTAMENTO: 'Su departamento',
    DIRECCION: 'Su dirección',
    TODOS: 'Toda la institución',
}

MODULOS = {
    'proyectos': 'Proyectos',
    'tareas': 'Tareas',
    'presupuesto': 'Presupuesto',
    'equipo': 'Equipo del proyecto',
    'comentarios': 'Comentarios',
    'usuarios': 'Usuarios',
    'estructura': 'Direcciones y departamentos',
    'catalogos': 'Estados, prioridades y tipos',
    'configuracion': 'Configuración de la institución',
    'roles': 'Roles y permisos',
    'reportes': 'Reportes',
}

# codigo: (etiqueta, admite alcance, vale dentro de un rol de proyecto)
PERMISOS = {
    'proyectos.ver': ('Ver proyectos', True, True),
    'proyectos.crear': ('Crear proyectos', True, False),
    'proyectos.editar': ('Editar proyectos', True, True),
    'proyectos.eliminar': ('Eliminar proyectos', True, False),
    'tareas.gestionar': ('Crear, editar y borrar tareas', True, True),
    'fotos.subir': ('Subir y borrar fotos', True, True),
    'presupuesto.ajustar': ('Registrar ajustes de presupuesto', True, True),
    'equipo.gestionar': ('Agregar y quitar personas del equipo de un proyecto', True, True),
    'equipo.integrar': ('Puede integrar el equipo de proyectos de otros', False, False),
    'comentarios.moderar': ('Borrar comentarios de otras personas', True, True),
    'usuarios.ver_datos': ('Ver cédula, teléfono y nacimiento de otras personas', True, False),
    'usuarios.gestionar': ('Crear, editar y dar de baja usuarios', True, False),
    'estructura.gestionar': ('Crear y editar direcciones y departamentos', False, False),
    'catalogos.gestionar': ('Editar estados, prioridades y tipos', False, False),
    'configuracion.gestionar': ('Editar los datos de la institución', False, False),
    'roles.gestionar': ('Editar roles y permisos', False, False),
    'reportes.exportar': ('Exportar reportes', True, True),
}


def modulo_de(codigo):
    return codigo.split('.', 1)[0]


def admite_alcance(codigo):
    return PERMISOS[codigo][1]


PERMISOS_DE_PROYECTO = [c for c, (_, _, en_proyecto) in PERMISOS.items() if en_proyecto]

_TODO = {c: TODOS for c in PERMISOS}
_ALCALDIA = {c: TODOS for c in PERMISOS if c not in ('catalogos.gestionar', 'configuracion.gestionar')}


def _jefatura(alcance):
    return {
        'proyectos.ver': alcance, 'proyectos.crear': alcance, 'proyectos.editar': alcance,
        'proyectos.eliminar': alcance, 'tareas.gestionar': alcance, 'fotos.subir': alcance,
        'presupuesto.ajustar': alcance, 'equipo.gestionar': alcance, 'equipo.integrar': TODOS,
        'reportes.exportar': alcance,
    }


_BASE = {
    'proyectos.ver': PROPIO, 'proyectos.editar': PROPIO, 'proyectos.eliminar': PROPIO,
    'tareas.gestionar': PROPIO, 'fotos.subir': PROPIO, 'presupuesto.ajustar': PROPIO,
    'equipo.integrar': TODOS, 'reportes.exportar': PROPIO,
}

PERMISOS_POR_DEFECTO = {
    'Administrador': _TODO,
    'Alcalde': _ALCALDIA,
    'Vicealcalde': _ALCALDIA,
    'Jefe de Dirección': _jefatura(DIRECCION),
    'Jefe de Departamento': _jefatura(DEPARTAMENTO),
    # El Coordinador crea proyectos en su departamento; el Funcionario no (decisión del 26/11, configurable).
    'Coordinador': {**_BASE, 'proyectos.crear': DEPARTAMENTO},
    'Funcionario': dict(_BASE),
}

# Roles de proyecto del sistema. El dueño cuenta como Responsable, y quien tiene tareas, como Colaborador.
RESPONSABLE = 'Responsable'
SUPERVISOR = 'Supervisor'
COLABORADOR = 'Colaborador'
OBSERVADOR = 'Observador'
ROLES_DE_PROYECTO = [
    {'nombre': RESPONSABLE, 'orden': 1, 'descripcion': 'Dueño del proyecto: lo gestiona completo.',
     'permisos': ['proyectos.ver', 'proyectos.editar', 'tareas.gestionar', 'fotos.subir', 'presupuesto.ajustar', 'reportes.exportar']},
    {'nombre': SUPERVISOR, 'orden': 2, 'descripcion': 'Supervisa y edita: reemplaza a la delegación con edición.',
     'permisos': ['proyectos.ver', 'proyectos.editar', 'tareas.gestionar', 'fotos.subir', 'presupuesto.ajustar', 'reportes.exportar']},
    {'nombre': COLABORADOR, 'orden': 3, 'descripcion': 'Trabaja en sus tareas y ve el proyecto.',
     'permisos': ['proyectos.ver']},
    {'nombre': OBSERVADOR, 'orden': 4, 'descripcion': 'Solo ve el proyecto.',
     'permisos': ['proyectos.ver']},
]
