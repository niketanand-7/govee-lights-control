import { describe, it, expect, vi, beforeEach } from "vitest";
import { parseCommand } from "../parse-command";

// Mock the AI SDK and HF provider
vi.mock("ai", () => ({
  generateText: vi.fn(),
  Output: {
    object: vi.fn(({ schema }) => ({ schema, type: "object" })),
  },
}));

vi.mock("@ai-sdk/openai", () => ({
  createOpenAI: vi.fn(() => vi.fn((modelId: string) => ({ modelId }))),
}));

import { generateText } from "ai";
const mockGenerateText = vi.mocked(generateText);

beforeEach(() => {
  mockGenerateText.mockReset();
});

describe("parseCommand", () => {
  it("parses a turn off command", async () => {
    mockGenerateText.mockResolvedValueOnce({
      output: {
        commands: [{ action: "turn_off", target: "all" }],
        reply: "Lights off!",
      },
    } as ReturnType<typeof generateText> extends Promise<infer R> ? R : never);

    const result = await parseCommand("turn off the lights");
    expect(result.commands).toHaveLength(1);
    expect(result.commands[0].action).toBe("turn_off");
    expect(result.commands[0].target).toBe("all");
  });

  it("parses multiple commands for different devices", async () => {
    mockGenerateText.mockResolvedValueOnce({
      output: {
        commands: [
          { action: "set_color", target: "floor lamp", color: { r: 255, g: 0, b: 0 } },
          { action: "set_color", target: "led bulb", color: { r: 255, g: 165, b: 0 } },
        ],
        reply: "Floor lamp red, bulb orange!",
      },
    } as ReturnType<typeof generateText> extends Promise<infer R> ? R : never);

    const result = await parseCommand("floor lamp red and bulb orange");
    expect(result.commands).toHaveLength(2);
    expect(result.commands[0].target).toBe("floor lamp");
    expect(result.commands[1].target).toBe("led bulb");
    expect(result.commands[1].color).toEqual({ r: 255, g: 165, b: 0 });
  });

  it("throws when output is null", async () => {
    mockGenerateText.mockResolvedValueOnce({
      output: null,
    } as ReturnType<typeof generateText> extends Promise<infer R> ? R : never);

    await expect(parseCommand("gibberish")).rejects.toThrow("Failed to parse command");
  });

  it("calls generateText with correct prompt", async () => {
    mockGenerateText.mockResolvedValueOnce({
      output: {
        commands: [{ action: "turn_on", target: "all" }],
        reply: "Done!",
      },
    } as ReturnType<typeof generateText> extends Promise<infer R> ? R : never);

    await parseCommand("lights on");
    expect(mockGenerateText).toHaveBeenCalledWith(
      expect.objectContaining({ prompt: "lights on" })
    );
  });
});
