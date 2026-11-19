import { indentUnit, newlineEdit, position } from "./CodeEditor";

describe("code editor text helpers", () => {
  it("finds the line and column of an index", () => {
    expect(position("ab\ncd\nef", 4)).toEqual({ line: 1, column: 1 });
    expect(position("ab", 0)).toEqual({ line: 0, column: 0 });
  });

  it("follows the file's indentation", () => {
    expect(indentUnit("function a() {\n    b();\n}")).toBe("    ");
    expect(indentUnit("a\n  b")).toBe("  ");
    expect(indentUnit("a\n\tb")).toBe("\t");
  });

  it("keeps indentation on a new line and indents after an opening bracket", () => {
    expect(newlineEdit("  foo();", 8, "  ")).toEqual({ text: "\n  ", caret: 11 });
    const code = "if (a) {}";
    expect(newlineEdit(code, 8, "  ")).toEqual({ text: "\n  \n", caret: 11 });
  });
});
