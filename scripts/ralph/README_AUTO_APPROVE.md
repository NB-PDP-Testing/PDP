# Running Ralph with Auto-Approve

To run Ralph autonomously without manual approval prompts:

## Option 1: Claude Code CLI Auto-Approve Setting
If using Claude Code CLI, enable auto-approve in your workspace settings:

1. Open VS Code settings (Cmd+,)
2. Search for "cline auto approve"
3. Enable auto-approve for safe operations

## Option 2: Run with Pre-Approved Context
When starting Ralph, pre-approve common operations:
- File reads/writes to scripts/ralph/ directory
- Typecheck commands
- Git operations

## Option 3: Manual Approval Mode
If you prefer manual control:
- Ralph will pause at each file write
- You approve each operation
- This is slower but gives you full control

## Current Issue
You're seeing permission blocks because Claude Code CLI requires approval
for file modifications. This is a safety feature to prevent unwanted changes.

For Ralph to work autonomously, you need auto-approve enabled.
