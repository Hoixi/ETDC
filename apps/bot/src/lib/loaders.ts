// commands/ ve events/ klasörlerini tarayıp modülleri yükler.
// Hem dev (.ts, tsx ile) hem build (.js) çalışsın diye iki uzantıyı da kabul eder.
import { readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import type { HoixiClient } from "../client.js";
import type { BotEvent, Command } from "../types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const srcRoot = resolve(__dirname, "..");

const isModuleFile = (f: string) =>
  (f.endsWith(".ts") || f.endsWith(".js")) && !f.endsWith(".d.ts");

async function importDir<T>(dir: string): Promise<T[]> {
  const abs = join(srcRoot, dir);
  if (!existsSync(abs)) return [];
  const files = (await readdir(abs)).filter(isModuleFile);
  const mods: T[] = [];
  for (const file of files) {
    const mod = await import(pathToFileURL(join(abs, file)).href);
    mods.push((mod.default ?? mod) as T);
  }
  return mods;
}

export async function loadCommands(client: HoixiClient): Promise<Command[]> {
  const commands = await importDir<Command>("commands");
  for (const cmd of commands) {
    if (!cmd?.data || !cmd?.execute) continue;
    client.commands.set(cmd.data.name, cmd);
  }
  return commands;
}

export async function loadEvents(client: HoixiClient): Promise<void> {
  const events = await importDir<BotEvent>("events");
  for (const event of events) {
    if (!event?.name || !event?.execute) continue;
    if (event.once) {
      client.once(event.name, (...args) => event.execute(...args));
    } else {
      client.on(event.name, (...args) => event.execute(...args));
    }
  }
}
