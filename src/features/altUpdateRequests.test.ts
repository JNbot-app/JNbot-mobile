import { buildAltUpdateReview, buildApprovedAltUpdates, defaultApprovedFieldIds } from "./altUpdateRequests";

describe("alt update review", () => {
  const request = {
    id: "review",
    scriptName: "Accounts",
    updates: {
      Alpha: { password: "new-password", ranks: { skyblock: "VIP" }, gkits: { skyblock: ["weekly"] } },
      "bad name": { password: "secret" },
    },
  };
  const jndata = { servers: { jartex: { skyblock: { ranks: { VIP: {} }, gkits: { weekly: {} } } } } } as any;

  it("validates fields and emits only individually approved changes", () => {
    const rows = buildAltUpdateReview(request, [], jndata, "jartex");
    const approved = defaultApprovedFieldIds(rows);
    expect(rows.filter((row) => row.username === "bad name").every((row) => row.error)).toBe(true);
    const password = rows.find((row) => row.username === "Alpha" && row.field === "password")!;
    approved.delete(password.id);
    expect(buildApprovedAltUpdates(request, rows, approved)).toEqual({
      Alpha: { ranks: { skyblock: "VIP" }, gkits: { skyblock: ["weekly"] } },
    });
  });
});
