import type {
  PurchaseInput,
  ReceivePurchaseInput,
  SupplierInput,
  SupplierPaymentInput,
  PurchaseReturnInput,
} from "./types";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const DECIMAL_PATTERN = /^\d+(\.\d{1,6})?$/;

function positiveDecimal(value: string): boolean {
  return DECIMAL_PATTERN.test(value) && Number(value) > 0;
}

function nonNegativeDecimal(value: string): boolean {
  return DECIMAL_PATTERN.test(value) && Number(value) >= 0;
}

export function validateSupplier(input: SupplierInput): string[] {
  const errors: string[] = [];

  if (!input.name?.trim()) {
    errors.push("El nombre del proveedor es obligatorio.");
  }

  if (input.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) {
    errors.push("El correo del proveedor no es válido.");
  }

  return errors;
}

export function validatePurchase(input: PurchaseInput): string[] {
  const errors: string[] = [];

  if (!UUID_PATTERN.test(input.supplierId)) {
    errors.push("El proveedor no es válido.");
  }

  if (!input.documentNumber.trim()) {
    errors.push("El número de documento es obligatorio.");
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.documentDate)) {
    errors.push("La fecha del documento debe tener formato AAAA-MM-DD.");
  }

  if (!input.lines.length) {
    errors.push("La compra debe tener al menos un producto.");
  }

  input.lines.forEach((line, index) => {
    if (!UUID_PATTERN.test(line.productId)) {
      errors.push(`Producto inválido en la línea ${index + 1}.`);
    }

    if (!positiveDecimal(line.quantity)) {
      errors.push(`Cantidad inválida en la línea ${index + 1}.`);
    }

    if (!nonNegativeDecimal(line.unitCost)) {
      errors.push(`Costo inválido en la línea ${index + 1}.`);
    }

    if (!nonNegativeDecimal(line.discountAmount ?? "0")) {
      errors.push(`Descuento inválido en la línea ${index + 1}.`);
    }

    if (!nonNegativeDecimal(line.attributableExpenses ?? "0")) {
      errors.push(`Gastos inválidos en la línea ${index + 1}.`);
    }
  });

  return errors;
}

export function validateReceipt(
  input: ReceivePurchaseInput,
): string[] {
  const errors: string[] = [];

  if (!UUID_PATTERN.test(input.purchaseId)) {
    errors.push("La compra no es válida.");
  }

  if (!UUID_PATTERN.test(input.warehouseId)) {
    errors.push("El almacén no es válido.");
  }

  if (!input.idempotencyKey.trim()) {
    errors.push("Falta la clave de idempotencia.");
  }

  if (!input.lines.length) {
    errors.push("La recepción debe contener líneas.");
  }

  input.lines.forEach((line, index) => {
    if (!UUID_PATTERN.test(line.purchaseLineId)) {
      errors.push(`Línea de compra inválida: ${index + 1}.`);
    }

    if (!positiveDecimal(line.quantityReceived)) {
      errors.push(`Cantidad recibida inválida: línea ${index + 1}.`);
    }

    if (!nonNegativeDecimal(line.quantityMissing ?? "0")) {
      errors.push(`Cantidad faltante inválida: línea ${index + 1}.`);
    }

    if (!nonNegativeDecimal(line.quantityDamaged ?? "0")) {
      errors.push(`Cantidad dañada inválida: línea ${index + 1}.`);
    }
  });

  return errors;
}

export function validatePayment(
  input: SupplierPaymentInput,
): string[] {
  const errors: string[] = [];

  if (!UUID_PATTERN.test(input.payableId)) {
    errors.push("La cuenta por pagar no es válida.");
  }

  if (!positiveDecimal(input.amount)) {
    errors.push("El pago debe ser mayor que cero.");
  }

  if (!input.idempotencyKey.trim()) {
    errors.push("Falta la clave de idempotencia.");
  }
  if (!input.method?.trim()) {
    errors.push("El método de pago es obligatorio.");
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.paymentDate)) {
    errors.push("La fecha del pago debe tener formato AAAA-MM-DD.");
  }
  if (input.exchangeRate !== undefined && !positiveDecimal(input.exchangeRate)) {
    errors.push("La tasa de cambio debe ser mayor que cero y tener hasta seis decimales.");
  }

  return errors;
}

export function validatePurchaseReturn(
  input: PurchaseReturnInput,
): string[] {
  const errors: string[] = [];

  if (!UUID_PATTERN.test(input.receiptId)) {
    errors.push("La recepción no es válida.");
  }

  if (!input.idempotencyKey.trim()) {
    errors.push("Falta la clave de idempotencia.");
  }

  if (!input.reason.trim()) {
    errors.push("Debe indicar el motivo de la devolución.");
  }

  if (!input.lines.length) {
    errors.push("La devolución debe contener productos.");
  }

  input.lines.forEach((line, index) => {
    if (!UUID_PATTERN.test(line.receiptLineId)) {
      errors.push(`Línea de recepción inválida: ${index + 1}.`);
    }

    if (!positiveDecimal(line.quantity)) {
      errors.push(`Cantidad inválida: línea ${index + 1}.`);
    }
  });

  return errors;
}