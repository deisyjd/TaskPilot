// Copia solo las claves permitidas del body a un objeto de datos para Prisma.
// Para los campos de texto que aceptan null (portada, descripción, avatar…),
// convierte '' en null: así el cliente puede LIMPIAR el campo enviando '' —
// antes enviaba undefined y JSON.stringify lo eliminaba del body, por lo que el
// servidor nunca lo actualizaba y el valor viejo quedaba intacto.
export function pickFields(
  body: Record<string, unknown>,
  keys: readonly string[],
  nullableKeys: readonly string[] = []
): Record<string, unknown> {
  const nullable = new Set(nullableKeys)
  const data: Record<string, unknown> = {}
  for (const key of keys) {
    if (key in body) {
      const value = body[key]
      data[key] = nullable.has(key) && value === '' ? null : value
    }
  }
  return data
}
