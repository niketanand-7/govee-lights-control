import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  DEVICES,
  getDeviceByName,
  getAllDevices,
  turnLight,
  setBrightness,
  setColor,
  setColorTemperature,
} from "../govee";

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

beforeEach(() => {
  vi.stubEnv("GOVEE_API_KEY", "test-api-key");
  mockFetch.mockReset();
});

describe("getDeviceByName", () => {
  it("finds floor lamp by partial match", () => {
    const device = getDeviceByName("floor lamp");
    expect(device).toEqual(DEVICES["floor lamp"]);
  });

  it("finds led bulb by partial match", () => {
    const device = getDeviceByName("bulb");
    expect(device).toEqual(DEVICES["led bulb"]);
  });

  it("finds device by full name", () => {
    const device = getDeviceByName("Floor Lamp Basic");
    expect(device).toEqual(DEVICES["floor lamp"]);
  });

  it("is case insensitive", () => {
    const device = getDeviceByName("FLOOR LAMP");
    expect(device).toEqual(DEVICES["floor lamp"]);
  });

  it("returns null for unknown device", () => {
    expect(getDeviceByName("kitchen light")).toBeNull();
  });
});

describe("getAllDevices", () => {
  it("returns both devices", () => {
    const devices = getAllDevices();
    expect(devices).toHaveLength(2);
  });
});

describe("turnLight", () => {
  it("sends correct turn on command", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true });

    await turnLight("device-id", "H6076", true);

    expect(mockFetch).toHaveBeenCalledWith(
      "https://developer-api.govee.com/v1/devices/control",
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify({
          device: "device-id",
          model: "H6076",
          cmd: { name: "turn", value: "on" },
        }),
      })
    );
  });

  it("sends correct turn off command", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true });

    await turnLight("device-id", "H6076", false);

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.cmd.value).toBe("off");
  });
});

describe("setBrightness", () => {
  it("clamps brightness to 0-100", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true });
    await setBrightness("device-id", "H6076", 150);

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.cmd.value).toBe(100);
  });

  it("clamps negative brightness to 0", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true });
    await setBrightness("device-id", "H6076", -10);

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.cmd.value).toBe(0);
  });
});

describe("setColor", () => {
  it("sends correct RGB values", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true });
    await setColor("device-id", "H6076", { r: 255, g: 0, b: 128 });

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.cmd).toEqual({
      name: "color",
      value: { r: 255, g: 0, b: 128 },
    });
  });
});

describe("setColorTemperature", () => {
  it("sends correct temperature value", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true });
    await setColorTemperature("device-id", "H6076", 5000);

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.cmd).toEqual({ name: "colorTem", value: 5000 });
  });
});

describe("error handling", () => {
  it("throws on API error", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 429,
      text: async () => "Rate limit exceeded",
    });

    await expect(turnLight("device-id", "H6076", true)).rejects.toThrow(
      "Govee control error 429"
    );
  });
});
