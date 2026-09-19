import { test } from "node:test";
import assert from "node:assert/strict";

import { MENU, byCategory, inStock, placeOrder, validateMenuItem } from "../src/catalog.ts";

test("every menu item validates", () => {
  for (const item of MENU) {
    assert.deepEqual(validateMenuItem(item), []);
  }
});

test("sections exist", () => {
  for (const category of ["starters", "mains", "desserts", "drinks"]) {
    assert.ok(byCategory(category as "starters").length > 0, `missing ${category}`);
  }
});

test("out-of-stock items are filtered", () => {
  assert.ok(inStock().every((item) => item.stock > 0));
  assert.equal(inStock().some((item) => item.id === "veg-thali"), false);
});

test("a valid order totals correctly", () => {
  const result = placeOrder([
    { id: "chicken-biryani", quantity: 2 },
    { id: "masala-chai", quantity: 1 },
  ]);
  assert.equal(result.ok, true);
  assert.equal(result.total, 26);
});

test("an oversized quantity is rejected", () => {
  const result = placeOrder([{ id: "chicken-biryani", quantity: 21 }]);
  assert.equal(result.ok, false);
});

test("insufficient stock is rejected", () => {
  const result = placeOrder([{ id: "veg-thali", quantity: 1 }]);
  assert.equal(result.ok, false);
  assert.match(result.problem ?? "", /stock/);
});

test("an unknown id is rejected", () => {
  const result = placeOrder([{ id: "no-such-dish", quantity: 1 }]);
  assert.equal(result.ok, false);
});

test("an empty order is rejected", () => {
  assert.equal(placeOrder([]).ok, false);
});

test("validateMenuItem flags bad prices", () => {
  const item = { ...MENU[0]!, price: -1 };
  assert.ok(validateMenuItem(item).some((problem) => problem.includes("price")));
});