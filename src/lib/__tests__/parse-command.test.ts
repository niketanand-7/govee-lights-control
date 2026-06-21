import { describe, it, expect, vi, beforeEach } from "vitest";
import { parseCommand } from "../parse-command";

// Mock the AI SDK and HF provider. parseCommand asks the model for plain JSON
// text and parses it itself, so we mock generateText to return a `text` string.
vi.mock("ai", () => ({
  generateText: vi.fn(),
}));

vi.mock("@ai-sdk/openai", () => ({
  createOpenAI: vi.fn(() => vi.fn((modelId: string) => ({ modelId }))),
}));

import { generateText } from "ai";
const mockGenerateText = vi.mocked(generateText);

function mockText(value: unknown) {
  mockGenerateText.mockResolvedValueOnce({
    text: JSON.stringify(value),
  } as ReturnType<typeof generateText> extends Promise<infer R> ? R : never);
}

beforeEach(() => {
  mockGenerateText.mockReset();
});

describe("parseCommand", () => {
  it("parses a turn off command", async () => {
    mockText({
      commands: [{ action: "turn_off", target: "all" }],
      reply: "Lights off!",
    });

    const result = await parseCommand("turn off the lights");
    expect(result.commands).toHaveLength(1);
    expect(result.commands[0].action).toBe("turn_off");
    expect(result.commands[0].target).toBe("all");
  });

  it("parses multiple commands for different devices", async () => {
    mockText({
      commands: [
        { action: "set_color", target: "floor lamp", color: { r: 255, g: 0, b: 0 } },
        { action: "set_color", target: "led bulb", color: { r: 255, g: 165, b: 0 } },
      ],
      reply: "Floor lamp red, bulb orange!",
    });

    const result = await parseCommand("floor lamp red and bulb orange");
    expect(result.commands).toHaveLength(2);
    expect(result.commands[0].target).toBe("floor lamp");
    expect(result.commands[1].target).toBe("led bulb");
    expect(result.commands[1].color).toEqual({ r: 255, g: 165, b: 0 });
  });

  it("tolerates JSON wrapped in markdown fences", async () => {
    mockGenerateText.mockResolvedValueOnce({
      text: '```json\n{"commands":[{"action":"turn_on","target":"all"}],"reply":"On!"}\n```',
    } as ReturnType<typeof generateText> extends Promise<infer R> ? R : never);

    const result = await parseCommand("on");
    expect(result.commands[0].action).toBe("turn_on");
  });

  it("throws when the model returns unparseable output", async () => {
    // Both the initial attempt and the single retry return junk.
    mockGenerateText.mockResolvedValue({
      text: "sorry, I can't do that",
    } as ReturnType<typeof generateText> extends Promise<infer R> ? R : never);

    await expect(parseCommand("gibberish")).rejects.toThrow("Failed to parse command");
  });

  it("calls generateText with correct prompt", async () => {
    mockText({
      commands: [{ action: "turn_on", target: "all" }],
      reply: "Done!",
    });

    await parseCommand("lights on");
    expect(mockGenerateText).toHaveBeenCalledWith(
      expect.objectContaining({ prompt: "lights on" })
    );
  });
});
