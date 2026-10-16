# Blockcraft Sandbox

A browser-first voxel sandbox with a Mineflayer-powered Java Edition server bridge. The local creative menu, block variants, and recipe registry are driven by the versioned `minecraft-data` registry for Minecraft Java 1.12.2. The project uses original procedural pixel-art textures rather than Minecraft assets.

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

## Local sandbox features

- Seeded hills and valleys with plains, forests, taiga, jungle, savanna, mountains, snowy ground, deserts, swamps, rivers, caves, water, varied trees, flowers, and underground ore deposits.
- A searchable 1.12.2 creative catalogue populated from the versioned data registry: 254 block definitions, 410 item types, metadata variants, and their display names.
- First-person movement, jumping, sprinting, sneaking, block mining and placement, a nine-slot hotbar, and Creative/Survival modes.
- 432 versioned crafting recipes and a small furnace/smelting recipe set, including ingredient and fuel checks in Survival.
- Survival health and hunger, food use, fall damage, harvest-tool checks, experience, loot, and simple passive/hostile mobs (pigs, cows, sheep, chickens, rabbits, wolves, ocelots, horses, villagers, squids, zombies, skeletons, creepers, spiders, endermen, and witches).
- Day/night lighting, clear/rain/thunder weather settings, four difficulty settings, local commands, and automatic saves in browser storage.

The local catalog API is version-specific: `/api/game-data?version=1.12.2`. The server connection form also includes Minecraft Java 1.12.2.

## Controls

- **WASD** move · **Space** jump · **Ctrl** sprint · **Shift** sneak
- **Mouse** look · **Left-click** mine or attack · **Right-click** place or eat · **1–9 / wheel** select hotbar
- **E** inventory, search, and recipes · **T** chat or commands · **Esc** pause
- Commands include `/help`, `/seed`, `/time set day|night`, `/weather clear|rain|thunder`, `/difficulty peaceful|easy|normal|hard`, `/gamemode creative|survival`, `/tp`, `/spawnpoint`, `/give`, `/summon`, `/kill`, `/setblock`, `/fill`, and `/xp add`.

## Java server bridge

- Mineflayer connects to Java servers that accept the chosen account mode and protocol version, streams nearby blocks and chat, sends movement/look controls, and relays basic mine/place actions.
- Microsoft device-code sign-in is available for servers requiring an authenticated Java account. Sign-in profiles are kept on the machine running the bridge in `~/.blockcraft/profiles`.
- This is not a Mojang client, a Bedrock client, or a complete substitute for Minecraft multiplayer. Server compatibility depends on the server version, plugins, authentication requirements, and its network policies.

## Scope and limitations

This is an original playable prototype—not a complete reimplementation of Minecraft 1.12.2. Its broad catalogue and recipe data are versioned, but the local world uses simplified cube rendering and procedural terrain. It does not implement the complete vanilla engine: many block shapes and interactions are approximated, mob AI is basic, and features such as full redstone circuitry, dimensions and portals, villages/structures, enchantments, potions, achievements, networking, and all game rules are not implemented. The furnace recipes are quick local simulations, not a full furnace interface or ticking machine.

The server bridge must be able to reach the target server from the machine running Node. In an Arena/live preview, that machine is a cloud sandbox, so some servers may reject its IP under anti-VPN rules even when you personally are not using a VPN. For those servers, run the app locally on your normal connection with VPN/proxy disabled, or ask the server staff to review the IP. The bridge does not attempt to bypass server IP filters.

Use only accounts and servers you are authorized to access. The app does not collect passwords; Microsoft authentication uses the library's device-code flow.
