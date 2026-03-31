const GOVEE_API_BASE = "https://developer-api.govee.com/v1";

function getApiKey(): string {
  const key = process.env.GOVEE_API_KEY;
  if (!key) throw new Error("GOVEE_API_KEY is not set");
  return key;
}

function headers(): HeadersInit {
  return {
    "Govee-API-Key": getApiKey(),
    "Content-Type": "application/json",
  };
}

export interface GoveeDevice {
  device: string;
  model: string;
  deviceName: string;
  controllable: boolean;
  retrievable: boolean;
  supportCmds: string[];
  properties: {
    colorTem?: { range: { min: number; max: number } };
  };
}

export interface GoveeColor {
  r: number;
  g: number;
  b: number;
}

export interface GoveeCommand {
  device: string;
  model: string;
  cmd: {
    name: "turn" | "brightness" | "color" | "colorTem";
    value: string | number | GoveeColor;
  };
}

export async function listDevices(): Promise<GoveeDevice[]> {
  const res = await fetch(`${GOVEE_API_BASE}/devices`, {
    headers: headers(),
  });
  if (!res.ok) throw new Error(`Govee API error: ${res.status}`);
  const data = await res.json();
  return data.data.devices;
}

export async function sendCommand(cmd: GoveeCommand): Promise<void> {
  const res = await fetch(`${GOVEE_API_BASE}/devices/control`, {
    method: "PUT",
    headers: headers(),
    body: JSON.stringify(cmd),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Govee control error ${res.status}: ${text}`);
  }
}

export async function turnLight(
  device: string,
  model: string,
  on: boolean
): Promise<void> {
  await sendCommand({
    device,
    model,
    cmd: { name: "turn", value: on ? "on" : "off" },
  });
}

export async function setBrightness(
  device: string,
  model: string,
  brightness: number
): Promise<void> {
  const clamped = Math.max(1, Math.min(100, Math.round(brightness)));
  await sendCommand({
    device,
    model,
    cmd: { name: "brightness", value: clamped },
  });
}

export async function setColor(
  device: string,
  model: string,
  color: GoveeColor
): Promise<void> {
  await sendCommand({
    device,
    model,
    cmd: { name: "color", value: color },
  });
}

export async function setColorTemperature(
  device: string,
  model: string,
  temperature: number
): Promise<void> {
  await sendCommand({
    device,
    model,
    cmd: { name: "colorTem", value: temperature },
  });
}

// Hardcoded device info to avoid an API call on every message
export const DEVICES = {
  "floor lamp": {
    device: "43:D2:D2:21:C0:C6:46:25",
    model: "H6076",
    name: "Floor Lamp Basic",
  },
  "led bulb": {
    device: "99:7D:98:17:3C:CF:81:AA",
    model: "H6006",
    name: "Smart LED Bulb",
  },
} as const;

export type DeviceKey = keyof typeof DEVICES;

export function getDeviceByName(name: string): (typeof DEVICES)[DeviceKey] | null {
  const lower = name.toLowerCase();
  for (const [key, device] of Object.entries(DEVICES)) {
    const deviceNameLower = device.name.toLowerCase();
    // Check both directions: input contains key/name, or key/name contains input
    if (
      lower.includes(key) ||
      lower.includes(deviceNameLower) ||
      key.includes(lower) ||
      deviceNameLower.includes(lower)
    ) {
      return device;
    }
  }
  return null;
}

export function getAllDevices() {
  return Object.values(DEVICES);
}
