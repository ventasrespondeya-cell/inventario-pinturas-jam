import type {
  Currency,
  PurchaseCostSnapshot,
  PurchaseLineInput,
} from "./types";

const SCALE = 1_000_000n;

function toMicros(value: string): bigint {
  if (!/^\d+(\.\d{1,6})?$/.test(value)) {
    throw new Error(`Cantidad decimal inválida: ${value}`);
  }

  const [whole, fraction = ""] = value.split(".");
  return BigInt(whole) * SCALE +
    BigInt((fraction + "000000").slice(0, 6));
}

function fromMicros(value: bigint): string {
  const negative = value < 0n;
  const absolute = negative ? -value : value;
  const whole = absolute / SCALE;
  const fraction = (absolute % SCALE)
    .toString()
    .padStart(6, "0")
    .replace(/0+$/, "");

  return `${negative ? "-" : ""}${whole}${
    fraction ? `.${fraction}` : ""
  }`;
}

export function add(...values: string[]): string {
  return fromMicros(
    values.reduce((sum, value) => sum + toMicros(value), 0n),
  );
}

export function subtract(a: string, b: string): string {
  const result = toMicros(a) - toMicros(b);

  if (result < 0n) {
    throw new Error("El resultado no puede ser negativo.");
  }

  return fromMicros(result);
}

export function multiply(a: string, b: string): string {
  return fromMicros((toMicros(a) * toMicros(b)) / SCALE);
}

export function divide(a: string, b: string): string {
  const divisor = toMicros(b);

  if (divisor === 0n) {
    throw new Error("No se puede dividir entre cero.");
  }

  return fromMicros((toMicros(a) * SCALE) / divisor);
}

export function calculateLineTotal(
  line: PurchaseLineInput,
): string {
  const quantity = toMicros(line.quantity);
  const unitCost = toMicros(line.unitCost);
  const discount = toMicros(line.discountAmount ?? "0");

  const gross = (quantity * unitCost) / SCALE;

  if (discount > gross) {
    throw new Error("El descuento supera el importe de la línea.");
  }

  return fromMicros(gross - discount);
}

export function calculatePurchaseTotal(
  lines: PurchaseLineInput[],
): string {
  return add(...lines.map(calculateLineTotal));
}

export function calculateFinalUnitCost(
  input: {
    unitCost: string;
    discountPerUnit: string;
    attributableExpensePerUnit: string;
  },
): string {
  const discounted = subtract(
    input.unitCost,
    input.discountPerUnit,
  );

  return add(discounted, input.attributableExpensePerUnit);
}

export function convertToVes(
  amount: string,
  currency: Currency,
  rate: string,
): string {
  if (currency === "VES") return amount;

  if (toMicros(rate) <= 0n) {
    throw new Error("La tasa de cambio debe ser mayor que cero.");
  }

  return multiply(amount, rate);
}

export function createCostSnapshot(input: {
  currency: Currency;
  originalUnitCost: string;
  discountPerUnit: string;
  attributableExpensePerUnit: string;
  exchangeRate?: string;
  exchangeRateId?: string | null;
  exchangeRateDate?: string | null;
  exchangeRateSource?: string | null;
  capturedAt: string;
}): PurchaseCostSnapshot {
  const finalOriginal = calculateFinalUnitCost({
    unitCost: input.originalUnitCost,
    discountPerUnit: input.discountPerUnit,
    attributableExpensePerUnit:
      input.attributableExpensePerUnit,
  });

  const rate = input.currency === "VES"
    ? "1"
    : input.exchangeRate;

  if (!rate) {
    throw new Error("Falta la tasa BCV para convertir la compra.");
  }

  if (input.currency === "USD" && !input.exchangeRateDate) {
    throw new Error("Falta la fecha de la tasa BCV.");
  }

  return {
    currency: input.currency,
    originalUnitCost: input.originalUnitCost,
    discountPerUnit: input.discountPerUnit,
    attributableExpensePerUnit:
      input.attributableExpensePerUnit,
    finalUnitCostOriginalCurrency: finalOriginal,
    exchangeRate: rate,
    exchangeRateId: input.exchangeRateId ?? null,
    exchangeRateDate: input.exchangeRateDate ?? null,
    exchangeRateSource: input.exchangeRateSource ?? null,
    finalUnitCostVes: convertToVes(
      finalOriginal,
      input.currency,
      rate,
    ),
    valuationCurrency: "VES",
    capturedAt: input.capturedAt,
  };
}