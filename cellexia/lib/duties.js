// Landed-cost maths for the duties explainer. Pure functions; rates come from data/duties.js.

const r2 = n => Math.round(n * 100) / 100;

/** Duty, tax and courier fee for one order, in the market's currency. */
export function importCharges(cfg, value) {
  const v = Math.max(0, +value || 0);
  const duty = v >= cfg.threshold && cfg.threshold >= 0 ? r2(v * cfg.duty / 100) : 0;
  const tax = v >= cfg.taxFrom ? r2((v + duty) * cfg.tax / 100) : 0;
  return { duty, tax, fee: cfg.fee, ddpFee: cfg.ddpFee };
}

/**
 * What the customer pays and when.
 * mode 'today'   – duties unpaid: pays the order at checkout, then duty + tax + courier fee at the door.
 * mode 'prepaid' – duties shown and collected at checkout: one price, nothing at the door.
 */
export function landedCost(cfg, value, mode = 'today') {
  const v = Math.max(0, +value || 0);
  const c = importCharges(cfg, v);
  if (mode === 'prepaid') {
    const checkout = r2(v + c.duty + c.tax + c.ddpFee);
    return { checkout, atDoor: 0, total: checkout, surprise: 0, ...c };
  }
  const atDoor = c.duty + c.tax > 0 ? r2(c.duty + c.tax + c.fee) : 0;
  return { checkout: v, atDoor, total: r2(v + atDoor), surprise: v ? Math.round(atDoor / v * 100) : 0, ...c };
}
