import { describe,expect,it } from "vitest";
import { escapeLike } from "./query-helpers";

describe("escapeLike", () => {
  it("escapa % y _ para que se busquen literalmente", () => {
    expect(escapeLike("50%_off")).toBe("50\\%\\_off");
  });

  it("recorta espacios y deja el resto igual", () => {
    expect(escapeLike("  juan pérez ")).toBe("juan pérez");
  });
});
