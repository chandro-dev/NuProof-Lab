import type { VerificationResult } from "@nuproof/shared";
import { apiRequest, ApiError } from "./apiClient";

export async function verifyReceipt(
  receiptId: string,
  verificationToken: string
): Promise<VerificationResult> {
  try {
    return await apiRequest<VerificationResult>("/api/verify", {
      method: "POST",
      body: JSON.stringify({ receiptId, verificationToken })
    });
  } catch (error) {
    if (
      error instanceof ApiError &&
      ["NOT_FOUND", "INVALID_TOKEN", "INVALID_SIGNATURE"].includes(error.code)
    ) {
      return {
        code:
          error.code === "NOT_FOUND"
            ? "NOT_FOUND"
            : error.code === "INVALID_TOKEN"
              ? "INVALID_TOKEN"
              : "INVALID_SIGNATURE",
        authentic: false,
        signatureValid: false,
        integrityValid: false,
        verificationId: "not-issued"
      };
    }
    throw error;
  }
}

export async function verifyTamperedAmount(
  receiptId: string,
  verificationToken: string,
  tamperedAmount: number
): Promise<VerificationResult> {
  return apiRequest<VerificationResult>("/api/lab/verify-tampered", {
    method: "POST",
    body: JSON.stringify({ receiptId, verificationToken, tamperedAmount })
  });
}
