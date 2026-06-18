# TaskPilot

Tablero digital de operación diaria para gestión de clientes, publicaciones, entregas y revisión semanal.

## Stack

- **Next.js 16** con App Router
- **TypeScript**
- **Tailwind CSS v4**
- **shadcn/ui** para componentes base
- **Zustand** con persistencia en `localStorage`
- **Lucide Icons**

## Vistas

| Ruta | Descripción |
|------|-------------|
| `/dashboard` | Resumen general: métricas, alertas, tareas del día |
| `/board` | Tablero Kanban con 6 columnas de estado |
| `/timeline` | Vista semanal de tareas por día |
| `/weekly-review` | Revisión de cumplimiento semanal por proyecto y responsable |
| `/users` | Carga de trabajo y cumplimiento por responsable |
| `/history` | Historial de eventos con filtros por tipo |
| `/settings` | Estado del almacenamiento y opción de restablecer datos |

## Proyectos de muestra

Qenta · Wigilabs · Ainoa · Distrito Pádel · SportSpace · Nuts · Viteri & Co · Planeta Tenis · Otros

## Responsables

Deisy · Diseño · Copy · Desarrollo · Cliente · Revisión

## Estados de tarea

`Pendiente` → `En proceso` → `Para revisión` → `Publicación programada` → `Publicado/Terminado` | `Bloqueado`

## Desarrollo local

```bash
npm install
npm run dev
# http://localhost:3000
```

## Persistencia

Todos los cambios se guardan automáticamente en `localStorage` del navegador (`taskpilot-store`). Para volver a los datos de prueba, usa **Settings → Restablecer datos de prueba**.

## Sin dependencias externas

- Sin backend ni base de datos
- Sin autenticación
- Sin APIs de terceros
