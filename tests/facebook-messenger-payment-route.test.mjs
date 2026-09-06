import test from "node:test";
import assert from "node:assert/strict";
import worker from "../src/worker.js";

const ROUTE = "https://example.test/api/payments/messenger";

test("Messenger payment-contact route fails closed when unconfigured", async () => {
  const response = await worker.fetch(new Request(ROUTE), {});
  const body = await response.json();

  assert.equal(response.status, 503);
  assert.equal(body.ok, false);
  assert.equal(body.error, "messenger_route_unconfigured");
  assert.equal(body.route, "/api/payments/messenger");
  assert.equal(body.payment_execution, false);
});

test("Messenger payment-contact route derives m.me URL from username", async () => {
  const response = await worker.fetch(new Request(ROUTE), {
    FACEBOOK_MESSENGER_USERNAME: "@MVPuknowme"
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.ok, true);
  assert.equal(body.purpose, "payment_contact");
  assert.equal(body.messenger_url, "https://m.me/MVPuknowme");
  assert.equal(body.payment_execution, false);
});

test("Explicit Messenger URL takes precedence over username", async () => {
  const response = await worker.fetch(new Request(ROUTE), {
    FACEBOOK_MESSENGER_URL: "https://m.me/custom-route",
    FACEBOOK_MESSENGER_USERNAME: "ignored-user"
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.messenger_url, "https://m.me/custom-route");
  assert.equal(body.payment_execution, false);
});
