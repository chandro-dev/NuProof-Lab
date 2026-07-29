export class DomainError extends Error {
  public constructor(
    public readonly code: string,
    message: string,
    public readonly status: number
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class TransactionNotFoundError extends DomainError {
  public constructor() {
    super("TRANSACTION_NOT_FOUND", "Transaction was not found.", 404);
  }
}

export class ReceiptNotFoundError extends DomainError {
  public constructor() {
    super("RECEIPT_NOT_FOUND", "Receipt could not be verified.", 404);
  }
}

export class InvalidVerificationTokenError extends DomainError {
  public constructor() {
    super("INVALID_VERIFICATION_TOKEN", "Receipt could not be verified.", 403);
  }
}

export class InvalidSignatureError extends DomainError {
  public constructor() {
    super("INVALID_SIGNATURE", "Receipt integrity could not be verified.", 422);
  }
}

export class InvalidTransactionStateError extends DomainError {
  public constructor(message = "Transaction state does not allow this operation.") {
    super("INVALID_TRANSACTION_STATE", message, 409);
  }
}

export class ReceiptAlreadyIssuedError extends DomainError {
  public constructor() {
    super("RECEIPT_ALREADY_ISSUED", "A receipt already exists for this transaction.", 409);
  }
}

export class DemoModeDisabledError extends DomainError {
  public constructor() {
    super(
      "DEMO_MODE_DISABLED",
      "El emisor de demostración no está habilitado en este entorno.",
      403
    );
  }
}

export class UnauthorizedError extends DomainError {
  public constructor() {
    super("UNAUTHORIZED", "This operation requires issuer access.", 401);
  }
}
