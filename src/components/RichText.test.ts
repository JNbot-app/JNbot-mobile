import { minecraftToAnsi, parseRichText } from "./RichText";

describe("rich Minecraft text", () => {
  it("converts legacy colors and formatting without removing content", () => {
    const ansi = minecraftToAnsi("§aGreen §lBold§r plain");
    expect(ansi).toContain("\u001b[92mGreen");
    expect(ansi).toContain("\u001b[1mBold");
    expect(parseRichText(ansi).map((part) => part.content).join("")).toBe("Green Bold plain");
  });

  it("converts Minecraft RGB sequences", () => {
    expect(minecraftToAnsi("§x§1§2§a§b§e§fColor")).toContain("\u001b[38;2;18;171;239mColor");
  });
});
