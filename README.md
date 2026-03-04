# StickyDesk

StickyDesk is a desktop sticky notes app built with Tauri, React, and TypeScript.

This is the first stable Tauri release line. The current release target is `v1.0.0`.

## Features

- Quick sticky note capture, edit, sort, and delete
- Future task list with lightweight planning
- Focus timer with completion reminders
- Active time tracking with Windows system idle detection
- Always-on-top support
- Auto-fade when the window is inactive
- Theme, opacity, UI scale, and note sort preferences
- Local data persistence through the Tauri application data directory

## Tech Stack

- Tauri 2
- React 19
- TypeScript
- Vite
- Rust

## Data Storage

The Tauri build stores app data in the operating system application data directory.

On Windows, the current app identity remains bound to the existing Tauri identifier so upgrades can keep using the same stored data path.

## Release

- Current target version: `1.0.0`
- Package version, Tauri bundle version, and Rust crate version are aligned to `1.0.0`

See [使用说明.md](./使用说明.md) for user-facing instructions.
