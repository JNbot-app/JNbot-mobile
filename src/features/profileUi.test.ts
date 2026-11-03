import { profileUiSections } from "./profileUi";
import type { ProfileUiJson } from "../generated/client-contract/profileUiSchema";

describe("profileUiSections", () => {
  it("stacks the left column before the right and drops hidden sections", () => {
    const json: ProfileUiJson = {
      player: { username: "Steve" },
      sections: [
        { id: "ranks", type: "ranks", column: "right", data: { items: [] } },
        { id: "identity", type: "identity", data: {} },
        { id: "hidden", type: "gkits", visible: false, data: { groups: [] } },
        { id: "kpis", type: "kpiStrip", column: "left", data: { items: [] } },
      ],
    };
    expect(profileUiSections(json).map((s) => s.id)).toEqual(["identity", "kpis", "ranks"]);
  });
});
