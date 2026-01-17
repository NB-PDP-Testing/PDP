# Ralph Version Archive

This directory contains archived versions of ralph.sh for reference.

## Version History

### Original Version (Archived)
- **File:** `ralph.sh.original-*`
- **Method:** `cat prompt.md | claude` (pipe-based invocation)
- **Pros:**
  - Simple, straightforward approach
  - Reliable completion detection across full output
- **Cons:**
  - Interactive permission prompts block autonomous operation
  - No real-time monitoring capability
  - No structured logging

### Enhanced Version (Current)
- **File:** `../ralph.sh`
- **Date:** 2026-01-15
- **Method:** `claude -p "$PROMPT" --permission-mode bypassPermissions --output-format stream-json`
- **Features:**
  - ✅ Autonomous operation with `bypassPermissions` (no stuck prompts)
  - ✅ Real-time stream logging to `stream.log`
  - ✅ Structured JSON output for better parsing
  - ✅ Robust completion detection across ALL output (hybrid approach)
  - ✅ Compatible with `watch-stream.sh` and `monitor.sh`
  - ✅ Better observability with `--verbose` mode

## Key Improvements

1. **Autonomous Operation:** Ralph now runs unattended without permission prompt interruptions
2. **Real-Time Monitoring:** Stream log enables live progress viewing in separate terminals
3. **Hybrid Completion Detection:** Combines Downloads version's streaming with original's full-output grep
4. **Enhanced Observability:** Verbose JSON logging for debugging and analysis

## Migration Notes

The enhanced version preserves all functionality of the original while adding:
- Permission bypass for autonomous operation
- Stream logging for real-time monitoring
- Better error handling and recovery
- Improved completion signal detection

No breaking changes to:
- PRD format
- progress.txt format
- Session tracking
- Insight extraction
- Archive behavior
