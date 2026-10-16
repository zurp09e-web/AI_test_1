# Blockcraft Sandbox

A small browser-first voxel sandbox with an optional Java Edition server bridge. It is designed to be easy to run locally and uses generated, original pixel-art textures rather than Minecraft assets.

## Run it

Requirements: Node.js 20 or newer.

```bash
npm install
npm run dev
```

Open the Vite URL printed in the terminal (normally `http://localhost:5173`). The dev script starts both the web app and the local server bridge. For a production build:

```bash
npm run build
npm start
```

`npm start` serves the built app and its API on port `3001` by default. Set `PORT` to change that port.

## Included

- Seeded, procedurally generated block terrain with hills, water, trees, and small ore veins.
- First-person movement, jumping, sprinting, sneaking, mining, block placement, a nine-slot hotbar, a curated creative inventory, quick crafting, and Creative/Survival modes.
- Day/night lighting, simple weather toggles, health/hunger indicators, local commands, and automatic local saves in browser storage.
- A local Java Edition server bridge powered by Mineflayer. It can join servers that accept the chosen account mode, stream nearby blocks and chat into the app, send movement/look controls, and relay basic mine/place actions.
- Microsoft device-code sign-in for servers requiring an authenticated Java account. Sign-in profiles are kept on the machine running the bridge in `~/.blockcraft/profiles`.

## Controls

- **WASD** move · **Space** jump · **Ctrl** sprint · **Shift** sneak
- **Mouse** look · **Left-click** mine · **Right-click** place · **1–9 / wheel** select hotbar
- **E** inventory/crafting · **T** chat or commands · **Esc** pause
- Local commands include `/help`, `/seed`, `/time set day|night`, `/weather clear|rain`, `/gamemode creative|survival`, `/tp x y z`, and `/setblock x y z block`.

## Important scope notes

This is an original, playable voxel-sandbox prototype—not a complete reimplementation of Minecraft. It does **not** include every vanilla block, recipe, mob, redstone system, dimension, resource pack, or game rule. The server bridge targets **Minecraft Java Edition**; it is not a Bedrock client, and compatibility depends on the server version, plugins, and authentication requirements. The streamed remote view is a lightweight nearby-block preview, not a full Mojang client renderer. The server bridge must be able to reach the target server from the machine running Node.

Use only accounts and servers you are authorized to access. The app does not collect passwords; Microsoft authentication uses the library's device-code flow.
