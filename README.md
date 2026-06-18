# Wipli

Tablero digital de operaciones para gestión de clientes, proyectos, publicaciones y revisión semanal de equipo.

## Stack

| Capa | Tecnología |
|------|-----------|
| Framework | Next.js 16 (App Router) |
| Lenguaje | TypeScript |
| Estilos | Tailwind CSS v4 + design tokens `--tp-*` |
| Componentes | shadcn/ui |
| Estado | Zustand v5 + `localStorage` |
| Tipografía | Sora (títulos 700/800) · Plus Jakarta Sans (UI 400/500/600) |
| Íconos | Lucide Icons |

## Rutas

| Ruta | Descripción |
|------|-------------|
| `/dashboard` | Métricas, alertas de vencimiento y tareas del día |
| `/board` | Tablero Kanban con 6 columnas de estado |
| `/projects` | Listado de proyectos con estrella para destacar en sidebar |
| `/projects/[id]` | Detalle de proyecto: portada, tareas, archivos, actividad |
| `/timeline` | Vista semanal de entregas por día |
| `/weekly-review` | Revisión de cumplimiento por proyecto y responsable |
| `/users` | Carga de trabajo y cumplimiento por responsable |
| `/chats` | Mensajes directos y grupales (sin WebSockets, localStorage) |
| `/admin/users` | Gestión de usuarios, roles y permisos |
| `/history` | Historial de eventos con filtros por tipo |
| `/settings` | Estado del almacenamiento y restablecimiento de datos |

## Módulos

### Proyectos
- Crear proyectos con nombre, color, portada, descripción y miembros
- Detalle con portada hero, tareas agrupadas por estado y feed de actividad
- **Destacar en sidebar** tocando ★ desde `/projects`

### Tablero Kanban
- 6 estados: Pendiente → En proceso → Para revisión → Programado → Publicado → Bloqueado
- Modal de tarea con checklist, comentarios, imagen de portada, archivos adjuntos y enlaces de referencia
- Drag-and-drop de estado; confirmación antes de eliminar

### Chats
- Conversaciones directas y grupales
- Soporte para archivos adjuntos e hipervínculos en mensajes
- Sin WebSockets — persistencia local

### Administración de usuarios
- Roles: `admin` · `member` · `viewer`
- CRUD de usuarios con avatar, cargo y estado activo/inactivo
- Permisos granulares vía `can(user, action)`

### Notificaciones
- Campana en el header con panel de tareas vencidas y urgentes
- Enlace directo al tablero desde el panel

## Proyectos de muestra

Qenta · Wigilabs · Ainoa · Distrito Pádel · SportSpace · Nuts · Viteri & Co · Planeta Tenis · Otros

## Responsables de muestra

Deisy (admin) · Diseño · Copy · Desarrollo · Cliente · Revisión

## Desarrollo local

```bash
npm install
npm run dev
# http://localhost:3000
```

## Persistencia

| Store | Clave localStorage |
|-------|--------------------|
| Tareas, proyectos, historial | `taskpilot-store` |
| Usuarios | `wipli-users` |
| Chats | `wipli-chats` |

Las imágenes se comprimen con Canvas antes de guardar (avatares ≤ 20 KB, portadas ≤ 80 KB) para evitar el límite de quota.

Para volver a los datos de prueba: **Settings → Restablecer datos de prueba**.

## Sin backend

- Sin base de datos ni API
- Sin autenticación real (usuario mock: Deisy / admin)
- Sin WebSockets ni servicios externos
- Preparado para conectar Supabase Storage (imágenes) y base de datos en una fase futura
