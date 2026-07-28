// Notas sin createdById (creadas antes de esta funcionalidad, o cuyo nombre
// de creador no se pudo emparejar con un usuario real) conservan el
// comportamiento anterior: visibles y editables por cualquiera con acceso
// al proyecto. La privacidad estricta solo aplica a notas con dueño
// identificado — y en ese caso, ni siquiera un admin tiene acceso automático.

export function noteVisibilityFilter(session: { userId: string }) {
  return {
    OR: [
      { createdById: null },
      { createdById: session.userId },
      { shares: { some: { userId: session.userId } } },
    ],
  }
}

export function canEditNoteServer(
  session: { userId: string },
  note: { createdById: string | null; shares: { userId: string; role: string }[] }
): boolean {
  if (note.createdById === null) return true
  if (note.createdById === session.userId) return true
  return note.shares.some((s) => s.userId === session.userId && s.role === 'editor')
}

export function canManageNoteSharingServer(
  session: { userId: string },
  note: { createdById: string | null }
): boolean {
  return note.createdById === null || note.createdById === session.userId
}

export function serializeNote<
  T extends { createdById: string | null; shares: { userId: string; role: string }[] }
>(note: T, currentUserId: string) {
  return {
    ...note,
    isOwner: note.createdById === null || note.createdById === currentUserId,
    sharedWith: note.shares.map((s) => ({ userId: s.userId, role: s.role })),
  }
}
