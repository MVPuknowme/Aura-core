# Speak Standalone Controlled Container Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Speak a standalone MVP-owned proprietary program with its own dev container and explicit runtime/control boundary.

**Architecture:** Speak is hosted in this repository for development only; repository placement does not make it a subsidiary or component of Aura-Core or SKYGRID. A dedicated `.devcontainer/speak/devcontainer.json` owns Speak's Node/Python development runtime, while `apps/speak` owns the program and proprietary notice. Physical sensor acquisition remains outside Codespaces behind an authorized collector boundary.

**Tech Stack:** Dev Containers, Node.js 22, Python 3.12, NumPy, SciPy, Pydantic, pytest, boto3.

**Spec:** `docs/superpowers/specs/2026-09-16-speak-assisted-neural-input-design.md`

## Global Constraints

- Program name is exactly `Speak`.
- Speak is a standalone program owned by Michael Vincent Patrick (MVP); do not describe it as owned, parented, governed, or branded by Aura-Core or SKYGRID.
- Speak source is proprietary; no open-source license is granted for original Speak code.
- Third-party dependency licenses remain controlling for those dependencies.
- No secrets or long-lived AWS credentials may be committed.
- Physical BLE acquisition is not claimed to occur inside GitHub Codespaces.
- Experimental neural candidates remain fail-closed and require confidence/confirmation gates.

---

### Task 1: Establish proprietary program identity

**Files:**
- Create: `apps/speak/PROPRIETARY-LICENSE.md`
- Modify: `apps/speak/README.md`
- Modify: `docs/superpowers/specs/2026-09-16-speak-assisted-neural-input-design.md`

- [ ] Add copyright and all-rights-reserved notice for Michael Vincent Patrick.
- [ ] State that possession/repository access does not grant a license.
- [ ] Preserve third-party license obligations.
- [ ] State that current public hosting does not itself create an organizational relationship.

### Task 2: Split Speak into a dedicated development container

**Files:**
- Create: `.devcontainer/speak/devcontainer.json`
- Create: `.devcontainer/speak/post-create.sh`
- Create: `apps/speak/requirements.txt`
- Remove after replacement is verified: `.devcontainer/devcontainer.json`

- [ ] Name the container `Speak`.
- [ ] Preserve private port 8080 and `apps/speak/dev-server.mjs` startup.
- [ ] Add Python 3.12 via dev-container feature and create `.venv` from `apps/speak/requirements.txt`.
- [ ] Keep AWS configuration environment-based and credential-free in source.

### Task 3: Verify configuration contract

- [ ] Parse the new dev-container JSON successfully.
- [ ] Verify name is exactly `Speak`, port 8080 remains private, and startup targets `apps/speak/dev-server.mjs`.
- [ ] Verify no obvious AWS access keys/secrets exist in the added configuration/docs.
- [ ] Verify the README and license identify Michael Vincent Patrick as owner and do not describe Speak as an Aura-Core/SKYGRID subsidiary.
- [ ] Re-run existing Speak calibration tests where available.
