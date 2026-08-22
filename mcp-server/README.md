# TaskPilot MCP

TaskPilot expone un servidor MCP (Model Context Protocol) para conectar
asistentes de IA (Claude, Codex, Cursor…) y gestionar proyectos, tareas, notas
y recordatorios desde ahí.

Primero crea un token en la app: **Settings → Acceso por API / MCP → Crear token**.
El token actúa con tu rol en la empresa activa.

## Opción A — HTTP remoto (recomendado)

Para clientes que soportan MCP por HTTP (Claude Code, Claude.ai, Cursor):

```bash
claude mcp add --transport http taskpilot \
  https://wipli.adminainoa.com/api/mcp \
  --header "Authorization: Bearer tp_live_xxx"
```

## Opción B — stdio (para Codex y clientes solo-stdio)

Este repo incluye un puente stdio→HTTP (`taskpilot-stdio.mjs`) que no necesita
instalar nada más (usa Node ≥ 18).

**Codex** (`~/.codex/config.toml`):

```toml
[mcp_servers.taskpilot]
command = "node"
args = ["/ruta/absoluta/al/repo/mcp-server/taskpilot-stdio.mjs"]
env = { TASKPILOT_URL = "https://wipli.adminainoa.com", TASKPILOT_TOKEN = "tp_live_xxx" }
```

**Otros clientes stdio** (formato `mcpServers` JSON):

```json
{
  "mcpServers": {
    "taskpilot": {
      "command": "node",
      "args": ["/ruta/absoluta/al/repo/mcp-server/taskpilot-stdio.mjs"],
      "env": { "TASKPILOT_URL": "https://wipli.adminainoa.com", "TASKPILOT_TOKEN": "tp_live_xxx" }
    }
  }
}
```

## Herramientas disponibles

- **Proyectos**: `list_projects`, `create_project`
- **Tareas**: `list_tasks`, `get_task`, `create_task`, `update_task`, `complete_task`, `assign_task`
- **Checklist / comentarios**: `add_checklist_item`, `set_checklist_item`, `add_comment`
- **Notas**: `list_notes`, `create_note`
- **Recordatorios**: `list_reminders`, `create_reminder`, `complete_reminder`
- **Contexto**: `whoami`, `list_users`
