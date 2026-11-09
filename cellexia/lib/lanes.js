// Delivery lanes: on-time rates and stuck-parcel detection. Pure functions, no DOM.

const D = 864e5;

/** Per-lane summary from delivered shipments [{m, days}]. */
export function laneSummary(shipments, lanes) {
  return lanes.map(l => {
    const s = shipments.filter(x => x.m === l.m);
    const n = s.length;
    const avg = n ? s.reduce((a, x) => a + x.days, 0) / n : 0;
    const onTime = n ? s.filter(x => x.days <= l.max).length / n : 1;
    return { ...l, orders: n, avg: Math.round(avg * 10) / 10, onTime: Math.round(onTime * 100), late: avg > l.max };
  });
}

/** Share of all shipments delivered within their lane's promise, 0–100. */
export function overallOnTime(summary) {
  const n = summary.reduce((a, l) => a + l.orders, 0);
  return n ? Math.round(summary.reduce((a, l) => a + l.onTime * l.orders, 0) / n) : 100;
}

export const daysSince = (date, now) => Math.floor((now - date) / D);

/**
 * Check one in-transit parcel against its lane.
 * stuck: no scan for longer than the lane's stuckLimit.
 * pastPromise: shipped longer ago than the lane's maximum promise.
 */
export function parcelStatus(p, lane, now) {
  const sinceScan = daysSince(p.lastScanAt, now);
  const sinceShip = daysSince(p.shippedAt, now);
  const stuck = sinceScan > lane.stuckLimit;
  const pastPromise = sinceShip > lane.max;
  return { ...p, sinceScan, sinceShip, limit: lane.stuckLimit, promiseMax: lane.max, stuck, pastPromise, flagged: stuck || pastPromise };
}

/** All in-transit parcels with their status, flagged first, then longest without a scan. */
export function findStuck(parcels, laneMap, now) {
  return parcels
    .map(p => parcelStatus(p, laneMap[p.m], now))
    .sort((a, z) => (z.flagged - a.flagged) || (z.sinceScan - a.sinceScan));
}
