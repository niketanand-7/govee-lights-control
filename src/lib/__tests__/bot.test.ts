import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  turnLight,
  setBrightness,
  setColor,
  setColorTemperature,
  getAllDevices,
  getDeviceByName,
  DEVICES,
} from "../govee";

// Test the executeCommand logic inline (same logic as bot.ts)
// This avoids mocking the Chat SDK constructor which is complex

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

beforeEach(() => {
  vi.stubEnv("GOVEE_API_KEY", "test-key");
  mockFetch.mockReset();
  mockFetch.mockResolvedValue({ ok: true });
});

type Command = {
  action: "turn_on" | "turn_off" | "set_color" | "set_brightness" | "set_temperature";
  target: "all" | "floor lamp" | "led bulb";
  color?: { r: number; g: number; b: number };
  brightness?: number;
  colorTemperature?: number;
  reply: string;
};

async function executeCommand(command: Command) {
  const targets =
    command.target === "all"
      ? getAllDevices()
      : [getDeviceByName(command.target)].filter(Boolean);

  if (targets.length === 0) {
    throw new Error(`Unknown device: ${command.target}`);
  }

  for (const device of targets) {
    if (!device) continue;
    switch (command.action) {
      case "turn_on":
        await turnLight(device.device, device.model, true);
        break;
      case "turn_off":
        await turnLight(device.device, device.model, false);
        break;
      case "set_color":
        if (command.color) {
          await setColor(device.device, device.model, command.color);
        }
        break;
      case "set_brightness":
        if (command.brightness !== undefined) {
          await setBrightness(device.device, device.model, command.brightness);
        }
        break;
      case "set_temperature":
        if (command.colorTemperature !== undefined) {
          await setColorTemperature(device.device, device.model, command.colorTemperature);
        }
        break;
    }
  }
}

describe("executeCommand", () => {
  it("turns off all lights", async () => {
    await executeCommand({
      action: "turn_off",
      target: "all",
      reply: "Lights off!",
    });

    // Should call fetch twice (one for each device)
    expect(mockFetch).toHaveBeenCalledTimes(2);

    const call1Body = JSON.parse(mockFetch.mock.calls[0][1].body);
    const call2Body = JSON.parse(mockFetch.mock.calls[1][1].body);

    expect(call1Body.cmd).toEqual({ name: "turn", value: "off" });
    expect(call2Body.cmd).toEqual({ name: "turn", value: "off" });
  });

  it("turns on a single device", async () => {
    await executeCommand({
      action: "turn_on",
      target: "floor lamp",
      reply: "Floor lamp on!",
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.device).toBe(DEVICES["floor lamp"].device);
    expect(body.cmd).toEqual({ name: "turn", value: "on" });
  });

  it("sets color on led bulb", async () => {
    await executeCommand({
      action: "set_color",
      target: "led bulb",
      color: { r: 255, g: 0, b: 128 },
      reply: "Bulb is now pink!",
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.cmd).toEqual({
      name: "color",
      value: { r: 255, g: 0, b: 128 },
    });
  });

  it("sets brightness on all devices", async () => {
    await executeCommand({
      action: "set_brightness",
      target: "all",
      brightness: 50,
      reply: "Brightness set to 50%!",
    });

    expect(mockFetch).toHaveBeenCalledTimes(2);
    const body1 = JSON.parse(mockFetch.mock.calls[0][1].body);
    const body2 = JSON.parse(mockFetch.mock.calls[1][1].body);
    expect(body1.cmd).toEqual({ name: "brightness", value: 50 });
    expect(body2.cmd).toEqual({ name: "brightness", value: 50 });
  });

  it("sets color temperature", async () => {
    await executeCommand({
      action: "set_temperature",
      target: "floor lamp",
      colorTemperature: 3000,
      reply: "Warm and cozy!",
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.cmd).toEqual({ name: "colorTem", value: 3000 });
  });
});
