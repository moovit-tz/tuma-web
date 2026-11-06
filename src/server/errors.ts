/** A rule-level failure with a stable code and the HTTP status the API answers with. */
export class DomainError extends Error {
  constructor(
    public code: string,
    message: string,
    public status = 422,
  ) {
    super(message);
  }
}
