/**
 * Base error for violated domain invariants. Thrown by domain factories and
 * rules; never carries PII or clinical content (see CONTRIBUTING.md logging rule).
 */
export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DomainError';
  }
}
