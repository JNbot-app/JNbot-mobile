import { inventorySections, itemAbbreviation } from "./inventory";

describe("Minecraft inventory layout", () => {
  it("maps a chest followed by storage and hotbar rows", () => {
    const sections = inventorySections({ inventoryStart: 27, isInventory: false });
    expect(sections.map((section) => [section.id, section.slots[0], section.slots.at(-1)])).toEqual([
      ["container", 0, 26],
      ["storage", 27, 53],
      ["hotbar", 54, 62],
    ]);
  });

  it("does not duplicate the personal equipment area as a container", () => {
    expect(inventorySections({ inventoryStart: 9, isInventory: true }).map((section) => section.id)).toEqual(["storage", "hotbar"]);
    expect(itemAbbreviation("diamond_chestplate")).toBe("DC");
  });
});
