# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.1] - 2025-12-01

### Removed
- Removed redundant code in `app/api/copilotkit/route.ts` related to redundant JSON parsing and request object recreation.
- Cleaned up unused imports and commented-out code in `agent-js/src/model.ts`.

### Fixed
- Resolved `EADDRINUSE` error by ensuring port 8123 is properly managed.
- Fixed `EPERM` permission errors in `agent-js` by reinstalling dependencies.
- Addressed dependency version mismatch for `@langchain/langgraph` and `@langchain/core`.
