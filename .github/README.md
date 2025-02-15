
 <div align="center">
    <img src="./assets/qnaplus.png">
    <h1>qnaplus</h1>
    <p>Quality of Life for the <a href="https://www.robotevents.com/V5RC/2024-2025/QA/">VEX Robotics Q&A</a>.
    </p>
    <a href="https://github.com/qnaplus/qnaplus/stargazers">
        <img src="https://img.shields.io/github/stars/qnaplus/qnaplus?color=577BB5&labelColor=1A1B26&style=for-the-badge">
    </a>
    <a href="../LICENSE.md">
        <img src="https://img.shields.io/github/license/qnaplus/qnaplus?color=C0CAF5&labelColor=1A1B26&style=for-the-badge">
    </a>
</div>

## About

qnaplus is a project with the purpose of improving the quality of life for the VEX Robotics Q&A. The VEX Robotics Q&A system allows competitors to ask clarifying questions in regards to the current season's game and receive authoritative answers. Because these answers are extensions of the game manual, knowing when questions are answered is pivotal. There is no built-in system for receiving notifications from the Q&A, which is where qnaplus comes in.

## Features
- **Discord Bot:** qnaplus informs competitors of updates through a Discord bot, which is the primary means of communication for most competitors. The notifications come through on the [VRC Nexus](https://discord.gg/2SNGQXuQCs), a server hub for VEX-related news and information, and competitors can subscribe receive updates in their own servers.
- **Web Client:** qnaplus comes with a [web client](https://qnaplus.pages.dev) that has improved rendering. The client is offline first and comes as a PWA (you can install it as an "app" on your phone), making it an ideal tool in competitions where internet connection is flaky.

## Architecture

- The core of qnaplus is the `updater`. The `updater` checks for new answers 3 times an hour and propagates any updates it detects to a database.
- The `bot` subscribes to changes on the database, specifically listening for new answers.


## Structure

This project uses [Yarn Workspaces](https://yarnpkg.com/features/workspaces) and [Turborepo](https://turbo.build/repo/docs) to manage structure.

- `packages`: Internal packages that are used by services.
  - `dotenv`: Type-safe library for accessing environment variables.
  - `store`: Supabase-related abstractions.
  - `logger`: For creating service-unique loggers.
  - `typescript-config`: Shared config for all packages/services.
  - `utils`: Library for shared utility functions.
- `services`: Applications that tie together the functionality in `packages`
  - `updater`: Service for continuously watching for updates on the Q&A.
  - `bot`: Discord Bot for announcing new answers.
  - `web`: Alternative Q&A web/mobile client

## Features and Bugs

Have a new idea for a feature or found a bug? 
1. Look through the list of [open issues](https://github.com/qnaplus/qnaplus/issues) to see if it already exists.
2. If nothing exists, create an issue [here](https://github.com/qnaplus/qnaplus/issues/new).
