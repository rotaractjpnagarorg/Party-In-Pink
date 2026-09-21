// Party In Pink 5.0 — Monetary Utilities (Integer Paise Rule per Document 03)

/**
 * Converts a rupee amount (decimal or integer) to integer paise.
 * Avoids IEEE-754 floating point issues using Math.round.
 */
export const toPaise = (rupees: number): number => {
  if (isNaN(rupees) || !isFinite(rupees)) {
    throw new Error('Invalid rupee value for paise conversion');
  }
  return Math.round(rupees * 100);
};

/**
 * Converts an integer paise amount to rupee floating-point display value.
 */
export const toRupees = (paise: number): number => {
  if (!Number.isInteger(paise)) {
    throw new Error('Paise value must be an integer');
  }
  return paise / 100;
};

/**
 * Formats an integer paise amount into an Indian Rupee string (e.g. "₹199" or "₹1,499.50").
 */
export const formatINR = (paise: number, includeDecimals = false): string => {
  const rupees = toRupees(paise);
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: includeDecimals ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(rupees);
};

/**
 * Calculates single order total in paise.
 */
export const calculateSingleOrderTotal = (count = 1, unitPricePaise: number): number => {
  if (count <= 0 || !Number.isInteger(count)) {
    throw new Error('Participant count must be a positive integer');
  }
  if (!Number.isInteger(unitPricePaise) || unitPricePaise <= 0) {
    throw new Error('Unit price must be a positive integer paise amount');
  }
  return count * unitPricePaise;
};

/**
 * Calculates bulk order total in paise with validation of minimum participant count.
 */
export const calculateBulkOrderTotal = (
  participantCount: number,
  unitPricePaise: number,
  bulkMin = 5
): number => {
  if (participantCount < bulkMin || !Number.isInteger(participantCount)) {
    throw new Error(`Bulk orders require at least ${bulkMin} participants`);
  }
  if (!Number.isInteger(unitPricePaise) || unitPricePaise <= 0) {
    throw new Error('Unit price must be a positive integer paise amount');
  }
  return participantCount * unitPricePaise;
};
