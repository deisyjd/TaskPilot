# Conectar TaskPilot (Wipli) por MCP

TaskPilot expone un servidor **MCP (Model Context Protocol)** para conectar
asistentes de IA (Claude, Codex, Cursor…) y gestionar proyectos, tareas, notas
y recordatorios desde ahí.

- **Endpoint HTTP:** `https://wiplitask.com/api/mcp`
- **Autenticación:** header `Authorization: Bearer <token>`

## Paso 1 — Crear tu token

En la app: **Settings → Acceso por API / MCP → Crear token**. Cópialo (se
muestra una sola vez). El token actúa con **tu rol** en la empresa activa.

---

## Paso 2 — Conectar tu cliente

Hay dos formas: **HTTP remoto** (recomendado, sin instalar nada) o **stdio**
(para clientes que solo soportan servidores por comando, como Codex).

### Claude Code (HTTP)

```bash
claude mcp add --scope user --transport http wiplitask \
  https://wiplitask.com/api/mcp \
  --header "Authorization: Bearer aqui_va_tu_token"
```

Verifica con `claude mcp list`. Para quitarlo: `claude mcp remove wiplitask`.

### Cursor (HTTP)

`~/.cursor/mcp.json` (o el `mcp.json` del proyecto):

```json
{
  "mcpServers": {
    "wiplitask": {
      "url": "https://wiplitask.com/api/mcp",
      "headers": { "Authorization": "Bearer aqui_va_tu_token" }
    }
  }
}
```

### VS Code (Copilot, HTTP)

`.vscode/mcp.json`:

```json
{
  "servers": {
    "wiplitask": {
      "type": "http",
      "url": "https://wiplitask.com/api/mcp",
      "headers": { "Authorization": "Bearer aqui_va_tu_token" }
    }
  }
}
```

### Claude.ai (web) y Claude Desktop — Conector con OAuth (sin token)

La forma más simple: agrega un **conector personalizado** solo con la URL
`https://wiplitask.com/api/mcp`. Claude detecta que requiere OAuth, abre el
login de Wipli para que inicies sesión y autorices, y se conecta **sin pegar
ningún token**. El acceso actúa sobre tu empresa activa y puedes revocarlo desde
Settings (los conectores/tokens creados aparecen como accesos activos).

> Internamente usa OAuth 2.1 (registro dinámico + PKCE); los endpoints de
> descubrimiento viven en `/.well-known/oauth-protected-resource` y
> `/.well-known/oauth-authorization-server`.

---

### Codex CLI (stdio)

Codex funciona mejor con servidores por comando. Este repo trae un puente
(`taskpilot-stdio.mjs`) que reenvía todo al endpoint HTTP (necesita Node ≥ 18).

`~/.codex/config.toml`:

```toml
[mcp_servers.wiplitask]
command = "node"
args = ["/ruta/absoluta/al/repo/mcp-server/taskpilot-stdio.mjs"]
env = { TASKPILOT_URL = "https://wiplitask.com", TASKPILOT_TOKEN = "aqui_va_tu_token" }
```

### Claude Desktop / Windsurf / otros clientes stdio

Mismo puente, formato `mcpServers`:

```json
{
  "mcpServers": {
    "wiplitask": {
      "command": "node",
      "args": ["/ruta/absoluta/al/repo/mcp-server/taskpilot-stdio.mjs"],
      "env": {
        "TASKPILOT_URL": "https://wiplitask.com",
        "TASKPILOT_TOKEN": "aqui_va_tu_token"
      }
    }
  }
}
```

> Si tu cliente stdio no tiene el repo a mano, basta con copiar el archivo
> `mcp-server/taskpilot-stdio.mjs` a cualquier carpeta y apuntar `args` ahí.

---

## Paso 3 — Probar

Pídele a tu asistente cosas como:

- "Lista mis proyectos en Wiplitask."
- "Crea una tarea 'Diseñar portada' en el proyecto X para el viernes."
- "¿Qué tareas pendientes tiene Diego?"
- "Marca como completada la tarea Y y deja un comentario."

## Herramientas disponibles

- **Proyectos:** `list_projects`, `create_project`
- **Tareas:** `list_tasks` (filtra por proyecto, estado y responsable — por ID, nombre o correo, o `mine`), `get_task`, `create_task`, `update_task`, `complete_task`, `assign_task`
- **Checklist / comentarios:** `add_checklist_item`, `set_checklist_item`, `add_comment`
- **Notas:** `list_notes`, `create_note`
- **Recordatorios:** `list_reminders`, `create_reminder`, `complete_reminder`
- **Contexto:** `whoami`, `list_users`

## Notas

- El token va atado a una empresa y hereda tu rol; revócalo cuando quieras desde
  Settings.
- Solo entra el correo/rol que ya existe en la app (invitación-solo).
- El endpoint es stateless: no guarda sesión entre llamadas.
