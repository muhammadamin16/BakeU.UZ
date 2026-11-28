import test from "node:test";
import assert from "node:assert/strict";
import { deliveryInstant, deliveryPayload, nextStatuses, validCoordinates } from "./domain.js";

test("pickup and delivery controls expose only their valid next statuses", () => {
  assert.deepEqual(nextStatuses("ready", "pickup"), ["completed", "cancelled"]);
  assert.deepEqual(nextStatuses("ready", "delivery"), ["delivering", "cancelled"]);
  for (const status of ["completed", "cancelled", "rejected", "unknown"]) assert.deepEqual(nextStatuses(status, "pickup"), []);
});
test("delivery dates use Tashkent and reject impossible, past or distant dates", () => {
  const now = Date.parse("2026-11-28T00:00:00Z");
  assert.equal(deliveryInstant("2026-11-29", "10:30", now), "2026-11-29T05:30:00.000Z");
  for (const [date, time] of [["2026-02-30", "10:00"], ["0005-05-05", "05:04"], ["2026-11-29", "25:00"], ["2028-01-01", "12:00"]]) {
    assert.throws(() => deliveryInstant(date, time, now));
  }
});
test("pickup payload does not leak delivery address/GPS; zero GPS is valid", () => {
  const data = { fulfillment: "pickup", address: "private address", location: { latitude: 0, longitude: 0 }, date: "2026-11-29", time: "10:00" };
  const payload = deliveryPayload(data, Date.parse("2026-11-28T00:00:00Z"));
  assert.equal(payload.deliveryAddress, ""); assert.equal(payload.location, null);
  assert.equal(validCoordinates(data.location), true);
  assert.equal(validCoordinates({ latitude: 91, longitude: 0 }), false);
});
