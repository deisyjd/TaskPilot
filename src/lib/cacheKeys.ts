// Constructores de claves de caché compartidas entre el endpoint que lee y los
// que invalidan. Centralizar el formato evita que una ruta cachee con una clave
// y otra invalide con otra distinta (bug silencioso de datos obsoletos).

// Lista de miembros de una empresa (GET /api/users). Se invalida al crear/editar/
// borrar usuarios o cambiar membresías de esa empresa.
export const usersCacheKey = (companyId: string) => `users:${companyId}`
