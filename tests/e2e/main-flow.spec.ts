import { expect, test } from "@playwright/test";

test("issuer creates, issues and verifies a receipt", async ({ page }) => {
  await page.goto("/issuer");
  await page.getByRole("button", { name: "Crear transferencia" }).click();
  await expect(page.getByText("Transferencia realizada")).toBeVisible();
  await page.getByRole("button", { name: "Generar comprobante" }).click();
  await expect(page).toHaveURL(/\/receipt\/[0-9a-f-]+#token=/);
  await expect(page.getByText("Protegido mediante firma digital")).toBeVisible();
  await page.getByRole("link", { name: "Verificar ahora" }).click();
  await expect(page.getByRole("heading", { name: "COMPROBANTE AUTÉNTICO" })).toBeVisible();
  await expect(page.getByText("Completada").last()).toBeVisible();
});

test("the security lab simulates a reversal in the browser session", async ({ page }) => {
  await page.goto("/security-lab");
  await page.getByRole("button", { name: "Preparar laboratorio" }).click();
  await page.getByRole("button", { name: "Ejecutar escenario: Operación reversada" }).click();
  await expect(page.getByRole("heading", { name: "VERIFIED_REVERSED" })).toBeVisible();
  await expect(page.getByText("Reversada", { exact: true }).last()).toBeVisible();
  await expect(page.getByText("Completada", { exact: true }).last()).toBeVisible();
});

test("security lab explains which cryptographic stages fail", async ({ page }) => {
  await page.goto("/security-lab");
  await page.getByRole("button", { name: "Preparar laboratorio" }).click();
  await expect(page.getByRole("heading", { name: "VERIFIED" })).toBeVisible();
  await expect(page.getByText("Ruta de validación")).toBeVisible();
  await expect(page.getByText("Aprobado")).toHaveCount(7);

  await page.getByRole("button", { name: "Ejecutar escenario: Monto modificado" }).click();
  await expect(page.getByRole("heading", { name: "INVALID_SIGNATURE" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Integridad SHA-256/ })).toContainText("Falló");
  await expect(page.getByRole("button", { name: /Firma Ed25519/ })).toContainText("Falló");
  await expect(page.getByText("Los hashes son diferentes.").first()).toBeVisible();
});
