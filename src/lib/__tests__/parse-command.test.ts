import { describe, it, expect, vi, beforeEach } from "vitest";
import { parseCommand } from "../parse-command";

// Mock the AI SDK's generateText
vi.mock("ai", () => ({
  generateText: vi.fn(),
  Output: {
    object: vi.fn(({ schema }) => ({ schema, type: "object" })),
  },
}));

import { generateText } from "ai";
const mockGenerateText = vi.mocked(generateText);

beforeEach(() => {
  mockGenerateText.mockReset();
});

describe("parseCommand", () => {
  it("parses a turn off command", async () => {
    const mockOutput = {
      action: "turn_off" as const,
      target: "all" as const,
      reply: "Lights off!",
    };

    mockGenerateText.mockResolvedValueOnce({
      output: mockOutput,
    } as ReturnType<typeof generateText> extends Promise<infer R> ? R : never);

    const result = await parseCommand("turn off the lights");
    expect(result.action).toBe("turn_off");
    expect(result.target).toBe("all");
  });

  it("parses a color command", async () => {
    const mockOutput = {
      action: "set_color" as const,
      target: "floor lamp" as const,
      color: { r: 255, g: 0, b: 0 },
      reply: "Floor lamp is now red!",
    };

    mockGenerateText.mockResolvedValueOnce({
      output: mockOutput,
    } as ReturnType<typeof generateText> extends Promise<infer R> ? R : never);

    const result = await parseCommand("make the floor lamp red");
    expect(result.action).toBe("set_color");
    expect(result.color).toEqual({ r: 255, g: 0, b: 0 });
  });

  it("throws when output is null", async () => {
    mockGenerateText.mockResolvedValueOnce({
      output: null,
    } as ReturnType<typeof generateText> extends Promise<infer R> ? R : never);

    await expect(parseCommand("gibberish")).rejects.toThrow(
      "Failed to parse command"
    );
  });

  it("calls generateText with correct model and schema", async () => {
    mockGenerateText.mockResolvedValueOnce({
      output: {
        action: "turn_on",
        target: "all",
        reply: "Done!",
      },
    } as ReturnType<typeof generateText> extends Promise<infer R> ? R : never);

    await parseCommand("lights on");

    expect(mockGenerateText).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "anthropic/claude-haiku-4.5",
        prompt: "lights on",
      })
    );
  });
});
