import { nextInitialDrawHidden } from "./GuandanStartGate";

describe("initial draw lifecycle", () => {
  test("stays visible for a brand-new deal before Start or any real play", () => {
    expect(nextInitialDrawHidden(false, true, false, false)).toBe(false);
  });

  test("hides immediately when Start is pressed", () => {
    expect(nextInitialDrawHidden(false, false, true, false)).toBe(true);
  });

  test("hides when the first real play reaches the client", () => {
    expect(nextInitialDrawHidden(false, false, false, true)).toBe(true);
  });

  test("does not reappear when lastPlay and tablePlays clear between tricks", () => {
    const afterFirstPlay = nextInitialDrawHidden(false, false, false, true);
    expect(afterFirstPlay).toBe(true);
    expect(nextInitialDrawHidden(afterFirstPlay, false, false, false)).toBe(true);
  });

  test("only a genuinely new full deal resets the per-hand hide latch", () => {
    expect(nextInitialDrawHidden(true, true, false, false)).toBe(false);
  });
});
