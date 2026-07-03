# Wipli

Tablero digital de operaciones para gestión de clientes, proyectos, publicaciones y revisión semanal de equipo.

## Stack

| Capa | Tecnología |
|------|-----------|
| Framework | Next.js 16 (App Router) |
| Lenguaje | TypeScript |
| Estilos | Tailwind CSS v4 + design tokens `--tp-*` |
| Componentes | shadcn/ui |
| Estado | Zustand v5 (caché cliente) |
| Base de datos | MySQL 8+ con Prisma ORM v5 |
| Autenticación | JWT via `jose` + cookies httpOnly |
| Tipografía | Sora (títulos) · Plus Jakarta Sans (UI) |
| Íconos | Lucide Icons |

---

## Requisitos previos

- Node.js 18+
- MySQL 8+ corriendo localmente (o en servidor)
- npm

---

## Instalación

### 1. Clonar el repositorio

```bash
git clone https://github.com/deisyjd/TaskPilot.git
cd TaskPilot
npm install
```

### 2. Configurar variables de entorno

Crear el archivo `.env` en la raíz del proyecto:

```env
DATABASE_URL="mysql://root@localhost:3306/wipli"
JWT_SECRET="cambia-esto-por-una-clave-secreta-larga"
```

> Reemplaza `root` y el host si tu MySQL usa usuario/contraseña diferente.  
> Ejemplo con contraseña: `mysql://usuario:contraseña@localhost:3306/wipli`

### 3. Crear la base de datos

```bash
mysql -u root -e "CREATE DATABASE IF NOT EXISTS wipli;"
```

> Si tu MySQL tiene contraseña: `mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS wipli;"`

### 4. Crear las tablas

```bash
npx prisma db push
```

### 5. Cargar datos iniciales

```bash
npm run seed
```

Esto crea:
- 4 usuarios (Deisy, Diego, Karol, Julian) — contraseña: `wipli2024`
- 9 proyectos de muestra
- 3 tareas de prueba

### 6. Iniciar el servidor

```bash
npm run dev
# http://localhost:3000
```

---

## Credenciales de acceso

| Usuario | Email | Contraseña | Rol |
|---------|-------|------------|-----|
| Deisy | deisy@wipli.app | wipli2024 | Admin |
| Diego | diego@wipli.app | wipli2024 | Member |
| Karol | karol@wipli.app | wipli2024 | Member |
| Julian | julian@wipli.app | wipli2024 | Member |

---

## Rutas

| Ruta | Descripción |
|------|-------------|
| `/login` | Acceso con email y contraseña |
| `/dashboard` | Métricas, alertas de vencimiento y tareas del día |
| `/board` | Tablero Kanban con 6 columnas de estado |
| `/projects` | Listado de proyectos con estrella para destacar en sidebar |
| `/projects/[id]` | Detalle de proyecto: portada, tareas, archivos, actividad |
| `/timeline` | Vista semanal de entregas por día |
| `/weekly-review` | Revisión de cumplimiento por proyecto y responsable |
| `/users` | Carga de trabajo y cumplimiento por responsable |
| `/chats` | Mensajes directos y grupales |
| `/admin/users` | Gestión de usuarios, roles y permisos |
| `/history` | Historial de eventos con filtros por tipo |
| `/settings` | Estado del almacenamiento y restablecimiento de datos |

---

## API Routes

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/auth/login` | POST | Iniciar sesión — retorna cookie JWT |
| `/api/auth/logout` | POST | Cerrar sesión — elimina cookie |
| `/api/auth/me` | GET | Verificar sesión activa |
| `/api/users` | GET, POST | Listar / crear usuarios |
| `/api/users/[id]` | PATCH, DELETE | Editar / eliminar usuario |
| `/api/tasks` | GET, POST | Listar / crear tareas |
| `/api/tasks/[id]` | GET, PATCH, DELETE | Obtener / editar / eliminar tarea |
| `/api/projects` | GET, POST | Listar / crear proyectos |
| `/api/projects/[id]` | PATCH, DELETE | Editar / eliminar proyecto |
| `/api/history` | GET, POST | Listar / registrar eventos de historial |

Todos los endpoints (excepto login) requieren sesión activa. Solo el rol `admin` puede crear/editar/eliminar usuarios y proyectos.

---

## Estructura del proyecto

```
src/
├── app/
│   ├── api/            # API Routes (auth, users, tasks, projects, history)
│   ├── login/          # Página de acceso
│   ├── dashboard/
│   ├── board/
│   ├── projects/
│   └── ...
├── components/
│   ├── layout/         # ClientShell, Sidebar, Header
│   └── ui/             # shadcn/ui components
├── lib/
│   ├── auth.ts         # JWT: createSession, verifyToken, deleteSession
│   └── prisma.ts       # Singleton de PrismaClient
├── store/              # Zustand stores (caché del cliente)
└── types/              # TypeScript interfaces

prisma/
├── schema.prisma       # Modelos de base de datos
└── seed.ts             # Datos iniciales
```

---

## Módulos

### Autenticación
- Login con email y contraseña verificados contra MySQL
- Contraseñas hasheadas con bcrypt (factor 12)
- Sesión via cookie httpOnly con JWT firmado (7 días)
- Protección de rutas en el cliente (ClientShell)

### Proyectos
- Crear proyectos con nombre, color, portada y descripción
- Detalle con portada hero, tareas agrupadas por estado y feed de actividad
- Destacar en sidebar tocando ★ desde `/projects`

### Tablero Kanban
- 6 estados: Pendiente → En proceso → Para revisión → Programado → Publicado → Bloqueado
- Modal de tarea con checklist, comentarios, imagen de portada y archivos
- Drag-and-drop de estado; confirmación antes de eliminar

### Chats
- Conversaciones directas y grupales
- Soporte para archivos adjuntos e hipervínculos

### Administración de usuarios
- Roles: `admin` · `member` · `viewer`
- CRUD con avatar, cargo y estado activo/inactivo
- Admin puede cambiar contraseñas desde el panel
- Permisos granulares vía `can(user, action)`

---

## Modelos de base de datos

| Modelo | Tabla | Descripción |
|--------|-------|-------------|
| User | `users` | Usuarios del sistema |
| Project | `projects` | Proyectos/clientes |
| Task | `tasks` | Tareas con estado, prioridad y tipo |
| ChecklistItem | `checklist_items` | Ítems de checklist por tarea |
| Comment | `comments` | Comentarios por tarea |
| HistoryEvent | `history_events` | Registro de actividad |
| Conversation | `conversations` | Hilos de chat |
| Message | `messages` | Mensajes por conversación |
| Note | `notes` | Notas por proyecto |

---

## Scripts disponibles

```bash
npm run dev      # Servidor de desarrollo (puerto 3000)
npm run build    # Build de producción
npm run start    # Servidor de producción
npm run seed     # Cargar datos iniciales a la base de datos
```

---

## Despliegue en producción

1. Asegurarse de tener MySQL accesible desde el servidor
2. Configurar las variables de entorno en el hosting:
   - `DATABASE_URL` con la URL de producción
   - `JWT_SECRET` con una clave larga y segura (mínimo 32 caracteres)
3. Ejecutar `npx prisma db push` para crear las tablas
4. Ejecutar `npm run seed` para los datos iniciales (solo primera vez)
5. Ejecutar `npm run build && npm run start`
