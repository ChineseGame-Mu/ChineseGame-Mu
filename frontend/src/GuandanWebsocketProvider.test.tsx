import { cleanroomDeploymentRoom } from "./GuandanWebsocketProvider";

describe("cleanroom deployment room isolation", () => {
  test("isolates the same visible room across immutable Vercel deployments", () => {
    const a = cleanroomDeploymentRoom("0004", "yihua-lespj0j5h-chinese-game.vercel.app");
    const b = cleanroomDeploymentRoom("0004", "yihua-4txtp2xs5-chinese-game.vercel.app");
    expect(a).not.toBe(b);
    expect(a).toContain("0004");
    expect(b).toContain("0004");
  });

  test("keeps local/non-Vercel room ids unchanged", () => {
    expect(cleanroomDeploymentRoom("0004", "localhost")).toBe("0004");
    expect(cleanroomDeploymentRoom("0002", "example.com")).toBe("0002");
  });

  test("rejects an empty visible room", () => {
    expect(cleanroomDeploymentRoom(null, "yihua-example.vercel.app")).toBeNull();
    expect(cleanroomDeploymentRoom("   ", "yihua-example.vercel.app")).toBeNull();
  });
});
