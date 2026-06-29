/**
 * Token revocation.
 *
 * Two complementary mechanisms (see ADR-0005):
 *  - Token version: stored per user; bumping it (e.g. when a volunteer is set to
 *    `Inactivo` in Block 4) invalidates all previously issued tokens.
 *  - Denylist by `jti`: immediate revocation of an individual token.
 *
 * The in-memory store below is for development/tests. In production (serverless)
 * a shared store (Supabase/Upstash) is required so revocation holds across
 * function instances — wired in a later block.
 */
export interface RevocationStore {
  isRevoked(jti: string): Promise<boolean>;
  revoke(jti: string, expiresAtMs: number): Promise<void>;
}

export class InMemoryRevocationStore implements RevocationStore {
  private readonly revoked = new Map<string, number>();

  async isRevoked(jti: string): Promise<boolean> {
    const expiresAt = this.revoked.get(jti);
    if (expiresAt === undefined) {
      return false;
    }
    if (expiresAt <= Date.now()) {
      this.revoked.delete(jti);
      return false;
    }
    return true;
  }

  async revoke(jti: string, expiresAtMs: number): Promise<void> {
    this.revoked.set(jti, expiresAtMs);
  }
}
