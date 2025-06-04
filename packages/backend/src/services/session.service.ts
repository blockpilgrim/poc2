/**
 * Session Service for managing authentication flow state
 * Stores PKCE parameters and other auth flow data temporarily
 */

interface AuthSession {
  state: string;
  pkceVerifier: string;
  pkceChallenge: string;
  timestamp: number;
  redirectUrl?: string;
}

export class SessionService {
  // In-memory store for auth sessions
  // In production, this should be Redis or similar
  private sessions: Map<string, AuthSession> = new Map();
  
  // Session expiry time (10 minutes)
  private readonly SESSION_TTL = 10 * 60 * 1000;

  /**
   * Store auth session data
   */
  storeSession(state: string, pkceVerifier: string, pkceChallenge: string, redirectUrl?: string): void {
    this.sessions.set(state, {
      state,
      pkceVerifier,
      pkceChallenge,
      timestamp: Date.now(),
      redirectUrl,
    });
    
    // Clean up old sessions
    this.cleanupExpiredSessions();
  }

  /**
   * Retrieve and remove auth session data
   */
  getAndRemoveSession(state: string): AuthSession | null {
    const session = this.sessions.get(state);
    
    if (!session) {
      return null;
    }
    
    // Check if session is expired
    if (Date.now() - session.timestamp > this.SESSION_TTL) {
      this.sessions.delete(state);
      return null;
    }
    
    // Remove session after retrieval (one-time use)
    this.sessions.delete(state);
    return session;
  }

  /**
   * Validate that a session exists and is not expired
   */
  validateSession(state: string): boolean {
    const session = this.sessions.get(state);
    
    if (!session) {
      return false;
    }
    
    if (Date.now() - session.timestamp > this.SESSION_TTL) {
      this.sessions.delete(state);
      return false;
    }
    
    return true;
  }

  /**
   * Clean up expired sessions
   */
  private cleanupExpiredSessions(): void {
    const now = Date.now();
    
    for (const [state, session] of this.sessions.entries()) {
      if (now - session.timestamp > this.SESSION_TTL) {
        this.sessions.delete(state);
      }
    }
  }

  /**
   * Get session count (for monitoring)
   */
  getSessionCount(): number {
    this.cleanupExpiredSessions();
    return this.sessions.size;
  }

  /**
   * Clear all sessions (for testing)
   */
  clearAllSessions(): void {
    this.sessions.clear();
  }
}

// Export singleton instance
export const sessionService = new SessionService();