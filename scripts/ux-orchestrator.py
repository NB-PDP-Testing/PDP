#!/usr/bin/env python3
"""
UX Orchestrator v7 - Fixed Agent Execution
- Mode B: Split (coordinator + agent side-by-side)
- Mode C: Windows (each agent in own window)
- Mode D: Grid (all 6 panes visible)
- Preview and edit prompts before running

FIXES in v7:
- Fixed: Agents now use claude -p for non-interactive execution
- Fixed: Added timeout (10 min) for file polling
- Fixed: Proper stdin handling via subprocess
- Fixed: Added --dangerously-skip-permissions for automated tool use

Requires: pip install anthropic
"""

import os
import sys
import json
import subprocess
import tempfile
import time
from pathlib import Path
from datetime import datetime

try:
    import anthropic
except ImportError:
    print("Installing anthropic package...")
    subprocess.run([sys.executable, "-m", "pip", "install", "anthropic", "-q"])
    import anthropic

# ============================================================================
# Configuration
# ============================================================================

SESSION = "ux-agents"
MODEL = "claude-sonnet-4-20250514"
EDITOR = os.environ.get("EDITOR", "nano")  # Default editor

AGENTS = {
    "audit": {
        "name": "UX Auditor",
        "emoji": "🔍",
        "output": "UX_AUDIT_FINDINGS.md",
        "context": ".agents/ux-auditor.md",
        "instruction": """Read .agents/ux-auditor.md and follow those instructions exactly.

Your mission: Audit the current UX implementation.

Reference documents:
- docs/ux/UX_IMPLEMENTATION_PLAN.md (the plan)
- docs/ux/UX_IMPLEMENTATION_AUDIT.md (previous audit - check for accuracy)

Find EVERY gap:
- Missing loading states
- Missing empty states
- Missing error states
- Mobile responsive issues
- UX components that exist but are NOT integrated (see audit doc)

CRITICAL: When complete, you MUST use the Write tool to save your findings to UX_AUDIT_FINDINGS.md in the project root. Do not just output to console - actually create the file."""
    },
    "implement": {
        "name": "UX Implementer",
        "emoji": "🔨",
        "output": "UX_IMPLEMENTATION_LOG.md",
        "context": ".agents/ux-implementer.md",
        "instruction": """Read .agents/ux-implementer.md and follow those instructions exactly.

Your mission: Implement fixes from UX_AUDIT_FINDINGS.md

Reference: .agents/ux-implementer.md has component locations and integration examples.

Rules:
- COMPLETE implementations only (no TODOs)
- Include loading, empty, and error states
- Test at desktop AND mobile sizes
- Integrate EXISTING components from apps/web/src/components/ (don't create new ones if they exist)

CRITICAL: When complete, you MUST use the Write tool to save your implementation log to UX_IMPLEMENTATION_LOG.md in the project root."""
    },
    "quality": {
        "name": "Code Quality",
        "emoji": "✨",
        "output": "CODE_QUALITY_REPORT.md",
        "context": ".agents/code-quality.md",
        "instruction": """Read .agents/code-quality.md and follow those instructions exactly.

Your mission: Run all CI/CD checks and fix what you can

Steps:
1. Run: npx ultracite fix (auto-fix linting)
2. Run: npm run check-types (type checking)
3. Run: npm run check (remaining lint)
4. Search for console.logs, TODOs, "as any"
5. Check for unused UX components (see .agents/code-quality.md for script)

CRITICAL: When complete, you MUST use the Write tool to save your report to CODE_QUALITY_REPORT.md in the project root."""
    },
    "verify": {
        "name": "Code Verifier",
        "emoji": "✅",
        "output": "UX_VERIFICATION_REPORT.md",
        "context": ".agents/code-verifier.md",
        "instruction": """Read .agents/code-verifier.md and follow those instructions exactly.

Your mission: Verify implementations are ACTUALLY complete

IMPORTANT: Check for INTEGRATION not just file existence!
- A component FILE existing is NOT the same as it being USED
- Use grep to find imports: grep -r "ComponentName" apps/web/src/app/

Check the REAL CODE for each item in UX_IMPLEMENTATION_LOG.md:
- Are components actually IMPORTED and RENDERED (not just file exists)?
- Are skeleton components actually used?
- Do empty states have icons, text, CTAs?
- Are error states user-friendly?
- Do mobile breakpoints exist?

CRITICAL: When complete, you MUST use the Write tool to save your report to UX_VERIFICATION_REPORT.md in the project root."""
    },
    "test": {
        "name": "QA Tester",
        "emoji": "🧪",
        "output": "UX_QA_REPORT.md",
        "context": ".agents/qa-tester.md",
        "instruction": """Read .agents/qa-tester.md and follow those instructions exactly.

Your mission: Test every implementation at ALL viewports

Test at: 320px, 375px, 768px, 1024px, 1440px

For each, test:
- Visual layout
- Touch targets
- Loading/empty/error states
- User flows
- Integration verification (see .agents/qa-tester.md for checklist)

CRITICAL: When complete, you MUST use the Write tool to save your test results to UX_QA_REPORT.md in the project root."""
    }
}

WORKFLOW = ["audit", "implement", "quality", "verify", "test"]

# ============================================================================
# Helpers
# ============================================================================

def get_project_root():
    return Path.cwd()

def file_exists(filename):
    return (get_project_root() / filename).exists()

def read_file(filename):
    filepath = get_project_root() / filename
    if filepath.exists():
        return filepath.read_text()
    return None

def get_workflow_status():
    status = {}
    for key, agent in AGENTS.items():
        status[key] = {
            "name": agent["name"],
            "emoji": agent["emoji"],
            "output": agent["output"],
            "exists": file_exists(agent["output"])
        }
    return status

def wait_for_file(filename, timeout=600, poll_interval=3):
    """Wait for a file to exist with timeout (default 10 minutes)"""
    start_time = time.time()
    while not file_exists(filename):
        elapsed = time.time() - start_time
        if elapsed > timeout:
            return False, elapsed
        remaining = int(timeout - elapsed)
        print(f"\r   Waiting for {filename}... ({remaining}s remaining)", end="", flush=True)
        time.sleep(poll_interval)
    print()  # New line after waiting
    return True, time.time() - start_time

def kill_session():
    subprocess.run(["tmux", "kill-session", "-t", SESSION], capture_output=True)

def clear_screen():
    print("\033[2J\033[H", end="")

# ============================================================================
# Prompt Preview and Edit
# ============================================================================

def get_full_prompt(agent_key):
    """Build the complete prompt that will be sent to Claude"""
    agent = AGENTS[agent_key]
    project_root = get_project_root()
    
    # Read context file
    context_path = project_root / agent["context"]
    context_content = ""
    if context_path.exists():
        context_content = context_path.read_text()
    
    # Build full prompt
    full_prompt = f"""{'='*70}
AGENT: {agent['emoji']} {agent['name']}
{'='*70}

CONTEXT FILE: {agent['context']}
{'-'*70}
{context_content if context_content else '[FILE NOT FOUND]'}

{'-'*70}
INSTRUCTION TO CLAUDE:
{'-'*70}
{agent['instruction']}

{'='*70}
OUTPUT FILE: {agent['output']}
{'='*70}
"""
    return full_prompt, agent["instruction"]

def preview_prompt(agent_key):
    """Show prompt preview and allow editing"""
    agent = AGENTS[agent_key]
    full_prompt, instruction = get_full_prompt(agent_key)
    
    clear_screen()
    print(full_prompt)
    print("\n" + "="*70)
    print("OPTIONS:")
    print("  [Enter] Run with this prompt")
    print("  [e]     Edit instruction before running")
    print("  [c]     Edit context file (.agents/*.md)")
    print("  [v]     View related files")
    print("  [s]     Skip this agent")
    print("  [q]     Quit")
    print("="*70)
    
    choice = input("\nChoice: ").strip().lower()
    
    if choice == 'q':
        return None, "quit"
    elif choice == 's':
        return None, "skip"
    elif choice == 'e':
        # Edit instruction in editor
        edited = edit_in_editor(instruction, f"instruction_{agent_key}")
        if edited:
            return edited, "run"
        return instruction, "run"
    elif choice == 'c':
        # Edit context file
        context_path = get_project_root() / agent["context"]
        if context_path.exists():
            subprocess.run([EDITOR, str(context_path)])
            print("\n✓ Context file updated. Press Enter to continue...")
            input()
        return instruction, "preview"  # Re-preview after edit
    elif choice == 'v':
        # View related files
        view_related_files(agent_key)
        return instruction, "preview"  # Re-preview after viewing
    else:
        return instruction, "run"

def edit_in_editor(content, name="prompt"):
    """Open content in editor and return edited version"""
    with tempfile.NamedTemporaryFile(mode='w', suffix=f'_{name}.txt', delete=False) as f:
        f.write(content)
        temp_path = f.name
    
    # Open in editor
    subprocess.run([EDITOR, temp_path])
    
    # Read back
    with open(temp_path, 'r') as f:
        edited = f.read()
    
    os.unlink(temp_path)
    return edited

def view_related_files(agent_key):
    """Show files relevant to this agent"""
    agent = AGENTS[agent_key]
    project_root = get_project_root()
    
    clear_screen()
    print(f"\n📁 Related Files for {agent['emoji']} {agent['name']}")
    print("="*50)
    
    # Show context file info
    context_path = project_root / agent["context"]
    print(f"\n1. Context: {agent['context']}")
    if context_path.exists():
        lines = context_path.read_text().split('\n')
        print(f"   ({len(lines)} lines)")
    else:
        print("   [NOT FOUND]")
    
    # Show output file if exists
    output_path = project_root / agent["output"]
    print(f"\n2. Output: {agent['output']}")
    if output_path.exists():
        content = output_path.read_text()
        print(f"   ({len(content)} chars)")
        print(f"   Preview: {content[:200]}...")
    else:
        print("   [Not created yet]")
    
    # Show dependencies
    print(f"\n3. Dependencies:")
    if agent_key == "implement":
        if file_exists("UX_AUDIT_FINDINGS.md"):
            print("   ✓ UX_AUDIT_FINDINGS.md exists")
        else:
            print("   ⚠ UX_AUDIT_FINDINGS.md missing!")
    elif agent_key == "verify":
        if file_exists("UX_IMPLEMENTATION_LOG.md"):
            print("   ✓ UX_IMPLEMENTATION_LOG.md exists")
        else:
            print("   ⚠ UX_IMPLEMENTATION_LOG.md missing!")
    else:
        print("   None")
    
    print("\n" + "="*50)
    print("\nOptions:")
    print("  [1] View full context file")
    print("  [2] View output file (if exists)")
    print("  [Enter] Back to preview")
    
    choice = input("\nChoice: ").strip()
    
    if choice == '1' and context_path.exists():
        clear_screen()
        print(f"\n📄 {agent['context']}")
        print("="*50)
        print(context_path.read_text())
        input("\n[Press Enter to continue]")
    elif choice == '2' and output_path.exists():
        clear_screen()
        print(f"\n📄 {agent['output']}")
        print("="*50)
        print(output_path.read_text())
        input("\n[Press Enter to continue]")

# ============================================================================
# API Coordinator
# ============================================================================

def get_coordinator_decision(status, last_agent=None):
    client = anthropic.Anthropic()
    
    status_summary = "\n".join([
        f"- {v['name']}: {'✓ Complete' if v['exists'] else '○ Not done'}"
        for k, v in status.items()
    ])
    
    context = f"""You are the UX Workflow Coordinator.

Current status:
{status_summary}

Workflow order: audit → implement → quality → verify → test

{"Last agent: " + last_agent if last_agent else "No agents run yet."}

Respond with JSON only:
{{"next_agent": "audit|implement|quality|verify|test|complete", "reason": "brief explanation"}}"""

    response = client.messages.create(
        model=MODEL,
        max_tokens=200,
        messages=[{"role": "user", "content": context}]
    )
    
    try:
        text = response.content[0].text
        start = text.find('{')
        end = text.rfind('}') + 1
        if start >= 0 and end > start:
            return json.loads(text[start:end])
    except:
        pass
    
    # Fallback
    for agent_key in WORKFLOW:
        if not status[agent_key]["exists"]:
            return {"next_agent": agent_key, "reason": "Next in workflow"}
    return {"next_agent": "complete", "reason": "All done"}

# ============================================================================
# Agent Execution
# ============================================================================

def run_agent_inline(agent_key, custom_instruction=None, skip_permissions=False):
    """Run a single agent in current terminal using Claude CLI properly

    SECURITY NOTE:
    - By default, requires user confirmation for permissions
    - Use skip_permissions=True only in trusted, sandboxed environments
    """
    agent = AGENTS[agent_key]
    project_root = get_project_root()

    instruction = custom_instruction or agent["instruction"]

    print(f"\n{'='*50}")
    print(f"{agent['emoji']} Starting {agent['name']}")
    print(f"{'='*50}\n")

    # Build command - only skip permissions if explicitly requested
    cmd = ["claude", "-p"]
    if skip_permissions:
        print("⚠️  Running with --dangerously-skip-permissions")
        cmd.append("--dangerously-skip-permissions")

    try:
        process = subprocess.Popen(
            cmd,
            cwd=str(project_root),
            stdin=subprocess.PIPE,
            stdout=sys.stdout,
            stderr=sys.stderr,
            text=True
        )

        # Send instruction via stdin and close to signal EOF
        process.communicate(input=instruction, timeout=600)  # 10 min timeout
        return process.returncode

    except subprocess.TimeoutExpired:
        print(f"\n⚠️  Agent timed out after 10 minutes")
        process.kill()
        return 1

def run_agent_in_pane(agent_key, pane_id, custom_instruction=None, session=SESSION, skip_permissions=False):
    """Run agent in specific tmux pane

    SECURITY NOTE: tmux mode requires skip_permissions for automation.
    Only use in trusted environments.
    """
    agent = AGENTS[agent_key]
    project_root = get_project_root()

    instruction = custom_instruction or agent["instruction"]

    # Use secure temp file with restricted permissions
    import secrets
    temp_file = f"/tmp/ux_agent_{secrets.token_hex(8)}.txt"

    # Write instruction to temp file with restricted permissions
    with open(temp_file, 'w') as f:
        os.chmod(temp_file, 0o600)  # Only owner can read/write
        f.write(instruction)

    # Build claude command
    perm_flag = "--dangerously-skip-permissions" if skip_permissions else ""

    cmd = f'''clear
echo "{agent['emoji']} {agent['name']} - RUNNING"
echo "─────────────────────────────"
cd {project_root}
cat {temp_file} | claude -p {perm_flag}
echo ""
echo "✓ {agent['name']} complete!"
rm -f {temp_file}
'''

    subprocess.run([
        "tmux", "send-keys", "-t", f"{session}:{pane_id}",
        cmd, "C-m"
    ])

def run_agent_in_window(agent_key, window_name, custom_instruction=None, session=SESSION, skip_permissions=False):
    """Run agent in specific tmux window

    SECURITY NOTE: tmux mode requires skip_permissions for automation.
    Only use in trusted environments.
    """
    agent = AGENTS[agent_key]
    project_root = get_project_root()

    instruction = custom_instruction or agent["instruction"]

    # Use secure temp file with restricted permissions
    import secrets
    temp_file = f"/tmp/ux_agent_{secrets.token_hex(8)}.txt"

    # Write instruction to temp file with restricted permissions
    with open(temp_file, 'w') as f:
        os.chmod(temp_file, 0o600)  # Only owner can read/write
        f.write(instruction)

    # Build claude command
    perm_flag = "--dangerously-skip-permissions" if skip_permissions else ""

    padding = max(0, 44 - len(agent['name']))
    cmd = f'''clear
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║  {agent['emoji']} {agent['name']} - RUNNING{' ' * padding} ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""
cd {project_root}
cat {temp_file} | claude -p {perm_flag}
echo ""
echo "✓ Complete! Output: {agent['output']}"
rm -f {temp_file}
'''

    subprocess.run([
        "tmux", "send-keys", "-t", f"{session}:{window_name}",
        cmd, "C-m"
    ])

# ============================================================================
# MODE B: Split View
# ============================================================================

def setup_split_mode():
    project_root = get_project_root()
    kill_session()
    
    subprocess.run([
        "tmux", "new-session", "-d", "-s", SESSION, "-n", "main",
        "-c", str(project_root)
    ])
    
    subprocess.run([
        "tmux", "split-window", "-h", "-t", f"{SESSION}:main",
        "-c", str(project_root)
    ])
    
    return True

def run_split_mode():
    print("\n🖥️  Setting up Split Mode (B)...")
    setup_split_mode()
    
    project_root = get_project_root()
    
    # Left pane: status display
    status_script = f'''
clear
echo "╔═══════════════════════════════════════╗"
echo "║     🎨 UX ORCHESTRATOR                ║"
echo "╚═══════════════════════════════════════╝"
echo ""
echo "📊 Status:"
while true; do
    echo ""
    [ -f "UX_AUDIT_FINDINGS.md" ] && echo "  ✓ Audit" || echo "  ○ Audit"
    [ -f "UX_IMPLEMENTATION_LOG.md" ] && echo "  ✓ Implement" || echo "  ○ Implement"
    [ -f "CODE_QUALITY_REPORT.md" ] && echo "  ✓ Quality" || echo "  ○ Quality"
    [ -f "UX_VERIFICATION_REPORT.md" ] && echo "  ✓ Verify" || echo "  ○ Verify"
    [ -f "UX_QA_REPORT.md" ] && echo "  ✓ Test" || echo "  ○ Test"
    echo ""
    echo "─────────────────────────────────────────"
    echo "Right pane: Agent working"
    echo "─────────────────────────────────────────"
    sleep 5
    clear
    echo "╔═══════════════════════════════════════╗"
    echo "║     🎨 UX ORCHESTRATOR                ║"
    echo "╚═══════════════════════════════════════╝"
    echo ""
    echo "📊 Status:"
done
'''
    
    subprocess.run([
        "tmux", "send-keys", "-t", f"{SESSION}:main.0",
        status_script, "C-m"
    ])
    
    print("✓ Split view ready")
    print("\nAttaching to tmux...")
    print("─" * 40)
    print("LEFT:  Status (auto-refreshes)")
    print("RIGHT: Agent workspace")
    print("─" * 40)
    print("\nControls:")
    print("  Ctrl+B then ←/→  Switch panes")
    print("  Ctrl+B then d    Detach")
    print("")
    
    orchestrator_cmd = f"cd {project_root} && python3 scripts/ux-orchestrator.py _run_agents"
    subprocess.run([
        "tmux", "send-keys", "-t", f"{SESSION}:main.1",
        orchestrator_cmd, "C-m"
    ])
    
    subprocess.run(["tmux", "attach", "-t", SESSION])

# ============================================================================
# MODE C: Separate Windows
# ============================================================================

def setup_windows_mode():
    project_root = get_project_root()
    kill_session()
    
    subprocess.run([
        "tmux", "new-session", "-d", "-s", SESSION, "-n", "coordinator",
        "-c", str(project_root)
    ])
    
    for i, key in enumerate(WORKFLOW):
        agent = AGENTS[key]
        subprocess.run([
            "tmux", "new-window", "-t", SESSION, "-n", f"{i+1}-{key}",
            "-c", str(project_root)
        ])
        
        header = f'''clear
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║  {agent['emoji']} {agent['name']:<55} ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""
echo "Output: {agent['output']}"
echo ""
echo "Waiting for coordinator to start this agent..."
echo ""
'''
        subprocess.run([
            "tmux", "send-keys", "-t", f"{SESSION}:{i+1}-{key}",
            header, "C-m"
        ])
    
    return True

def run_windows_mode():
    print("\n🖥️  Setting up Windows Mode (C)...")
    setup_windows_mode()
    
    project_root = get_project_root()
    
    print("✓ Windows created")
    print("\nWindow layout:")
    print("  0: Coordinator (status + control)")
    print("  1: 🔍 Auditor")
    print("  2: 🔨 Implementer")
    print("  3: ✨ Quality")
    print("  4: ✅ Verifier")
    print("  5: 🧪 Tester")
    print("\nControls:")
    print("  Ctrl+B then 0-5  Switch windows")
    print("  Ctrl+B then d    Detach")
    print("")
    
    orchestrator_cmd = f"cd {project_root} && python3 scripts/ux-orchestrator.py _run_agents_windows"
    subprocess.run([
        "tmux", "send-keys", "-t", f"{SESSION}:coordinator",
        orchestrator_cmd, "C-m"
    ])
    
    subprocess.run(["tmux", "attach", "-t", SESSION])

# ============================================================================
# MODE D: Grid
# ============================================================================

def setup_grid_mode():
    project_root = get_project_root()
    kill_session()
    
    subprocess.run([
        "tmux", "new-session", "-d", "-s", SESSION, "-n", "grid",
        "-c", str(project_root)
    ])
    
    subprocess.run(["tmux", "split-window", "-h", "-t", f"{SESSION}:grid"])
    subprocess.run(["tmux", "split-window", "-v", "-t", f"{SESSION}:grid.0"])
    subprocess.run(["tmux", "split-window", "-v", "-t", f"{SESSION}:grid.0"])
    subprocess.run(["tmux", "split-window", "-v", "-t", f"{SESSION}:grid.3"])
    subprocess.run(["tmux", "split-window", "-v", "-t", f"{SESSION}:grid.3"])
    
    pane_map = {
        0: ("coordinator", "🎯", "Coordinator"),
        1: ("audit", "🔍", "Auditor"),
        2: ("implement", "🔨", "Implementer"),
        3: ("verify", "✅", "Verifier"),
        4: ("test", "🧪", "Tester"),
        5: ("quality", "✨", "Quality"),
    }
    
    for pane_id, (key, emoji, name) in pane_map.items():
        header = f'''clear
echo "{emoji} {name}"
echo "─────────────"
'''
        subprocess.run([
            "tmux", "send-keys", "-t", f"{SESSION}:grid.{pane_id}",
            header, "C-m"
        ])
    
    return pane_map

def run_grid_mode():
    print("\n🖥️  Setting up Grid Mode (D)...")
    setup_grid_mode()
    
    project_root = get_project_root()
    
    print("✓ Grid created")
    print("\nLayout:")
    print("  ┌─────────────┬─────────────┐")
    print("  │ Coordinator │ Verifier    │")
    print("  ├─────────────┼─────────────┤")
    print("  │ Auditor     │ Tester      │")
    print("  ├─────────────┼─────────────┤")
    print("  │ Implementer │ Quality     │")
    print("  └─────────────┴─────────────┘")
    print("\nControls:")
    print("  Ctrl+B then arrows  Move between panes")
    print("  Ctrl+B then z       Zoom current pane")
    print("  Ctrl+B then d       Detach")
    print("")
    
    orchestrator_cmd = f"cd {project_root} && python3 scripts/ux-orchestrator.py _run_agents_grid"
    subprocess.run([
        "tmux", "send-keys", "-t", f"{SESSION}:grid.0",
        orchestrator_cmd, "C-m"
    ])
    
    subprocess.run(["tmux", "attach", "-t", SESSION])

# ============================================================================
# Orchestration Loops (with prompt preview)
# ============================================================================

def orchestrate_inline():
    """Inline orchestration with prompt preview"""
    print("\n🎨 UX Orchestrator v6 - Running agents...\n")
    
    last_agent = None
    
    while True:
        status = get_workflow_status()
        
        # Show status
        clear_screen()
        print("\n" + "="*50)
        print("🎨 UX ORCHESTRATOR")
        print("="*50)
        print("\n📊 Status:")
        for key, s in status.items():
            icon = "✓" if s["exists"] else "○"
            print(f"   {icon} {s['emoji']} {s['name']}")
        
        # Get decision
        print("\n🤔 Deciding next step...")
        decision = get_coordinator_decision(status, last_agent)
        
        if decision["next_agent"] == "complete":
            print("\n" + "="*50)
            print("✅ WORKFLOW COMPLETE!")
            print("="*50)
            print("\nAll output files created:")
            for key, agent in AGENTS.items():
                print(f"  • {agent['output']}")
            break
        
        agent_key = decision["next_agent"]
        print(f"\n▶ Recommended: {AGENTS[agent_key]['emoji']} {AGENTS[agent_key]['name']}")
        print(f"  Reason: {decision['reason']}")
        
        # Prompt to preview
        print("\n" + "-"*50)
        print("Options:")
        print("  [Enter] Preview prompt before running")
        print("  [r]     Run without preview")
        print("  [s]     Skip to next")
        print("  [q]     Quit")
        
        choice = input("\nChoice: ").strip().lower()
        
        if choice == 'q':
            break
        elif choice == 's':
            continue
        elif choice == 'r':
            # Run without preview
            run_agent_inline(agent_key)
            last_agent = agent_key
        else:
            # Preview and optionally edit
            while True:
                instruction, action = preview_prompt(agent_key)
                
                if action == "quit":
                    return
                elif action == "skip":
                    break
                elif action == "preview":
                    continue  # Re-show preview
                elif action == "run":
                    run_agent_inline(agent_key, instruction)
                    last_agent = agent_key
                    break
        
        time.sleep(2)

def orchestrate_windows():
    """Windows mode orchestration with prompt preview"""
    print("\n🎨 UX Orchestrator v6 - Windows Mode\n")
    
    last_agent = None
    window_map = {
        "audit": "1-audit",
        "implement": "2-implement",
        "quality": "3-quality",
        "verify": "4-verify",
        "test": "5-test"
    }
    
    while True:
        status = get_workflow_status()
        
        clear_screen()
        print("\n" + "="*50)
        print("🎨 UX ORCHESTRATOR - Windows Mode")
        print("="*50)
        print("\n📊 Status:")
        for key, s in status.items():
            icon = "✓" if s["exists"] else "○"
            print(f"   {icon} {s['emoji']} {s['name']}")
        
        print("\n🤔 Deciding next step...")
        decision = get_coordinator_decision(status, last_agent)
        
        if decision["next_agent"] == "complete":
            print("\n" + "="*50)
            print("✅ WORKFLOW COMPLETE!")
            print("="*50)
            break
        
        agent_key = decision["next_agent"]
        window = window_map[agent_key]
        
        print(f"\n▶ Next: {AGENTS[agent_key]['emoji']} {AGENTS[agent_key]['name']}")
        print(f"  Window: {window}")
        print(f"  Reason: {decision['reason']}")
        
        print("\n" + "-"*50)
        print("Options:")
        print("  [Enter] Preview prompt")
        print("  [r]     Run without preview")
        print("  [s]     Skip")
        print("  [q]     Quit")
        
        choice = input("\nChoice: ").strip().lower()
        
        if choice == 'q':
            break
        elif choice == 's':
            continue
        elif choice == 'r':
            run_agent_in_window(agent_key, window)
        else:
            while True:
                instruction, action = preview_prompt(agent_key)
                
                if action == "quit":
                    return
                elif action == "skip":
                    break
                elif action == "preview":
                    continue
                elif action == "run":
                    run_agent_in_window(agent_key, window, instruction)
                    break
        
        if choice != 's':
            print(f"\n⏳ Agent running in window {window}")
            print(f"   Switch: Ctrl+B then {window[0]}")

            agent = AGENTS[agent_key]
            success, elapsed = wait_for_file(agent['output'], timeout=600)

            if success:
                print(f"   ✓ {agent['output']} created! ({int(elapsed)}s)")
                last_agent = agent_key
            else:
                print(f"\n   ⚠️  Timeout waiting for {agent['output']}")
                print("   Agent may have failed. Check the window for errors.")
                print("   Options: [r] Retry  [s] Skip  [q] Quit")
                retry = input("   Choice: ").strip().lower()
                if retry == 'q':
                    break
                elif retry == 'r':
                    continue  # Will retry same agent

        time.sleep(2)

def orchestrate_grid():
    """Grid mode orchestration with prompt preview"""
    print("🎯 Coordinator")
    print("─" * 20)
    
    last_agent = None
    pane_map = {
        "audit": "grid.1",
        "implement": "grid.2",
        "quality": "grid.5",
        "verify": "grid.3",
        "test": "grid.4"
    }
    
    while True:
        status = get_workflow_status()
        
        print("\nStatus:", end=" ")
        for key, s in status.items():
            icon = "✓" if s["exists"] else "○"
            print(f"{icon}", end="")
        print()
        
        decision = get_coordinator_decision(status, last_agent)
        
        if decision["next_agent"] == "complete":
            print("\n✅ DONE!")
            break
        
        agent_key = decision["next_agent"]
        pane = pane_map[agent_key]
        
        print(f"Next: {AGENTS[agent_key]['emoji']} {agent_key}")
        print("[Enter]=preview [r]=run [s]=skip [q]=quit")
        
        choice = input(": ").strip().lower()
        
        if choice == 'q':
            break
        elif choice == 's':
            continue
        elif choice == 'r':
            run_agent_in_pane(agent_key, pane)
        else:
            while True:
                instruction, action = preview_prompt(agent_key)
                
                if action == "quit":
                    return
                elif action == "skip":
                    break
                elif action == "preview":
                    continue
                elif action == "run":
                    run_agent_in_pane(agent_key, pane, instruction)
                    break
        
        if choice not in ['s', 'q']:
            agent = AGENTS[agent_key]
            success, elapsed = wait_for_file(agent['output'], timeout=600)

            if success:
                print(f"✓ Done ({int(elapsed)}s)")
                last_agent = agent_key
            else:
                print(f"⚠️  Timeout! [r]=retry [s]=skip [q]=quit")
                retry = input(": ").strip().lower()
                if retry == 'q':
                    break
                elif retry == 'r':
                    continue

        time.sleep(1)

# ============================================================================
# Main
# ============================================================================

def check_requirements():
    if not os.environ.get("ANTHROPIC_API_KEY"):
        print("⚠️  ANTHROPIC_API_KEY not set")
        print("\nSet it with:")
        print("  export ANTHROPIC_API_KEY='your-key-here'")
        sys.exit(1)
    
    if not file_exists("CLAUDE.md"):
        print("❌ Not in project root (CLAUDE.md not found)")
        sys.exit(1)
    
    if not (get_project_root() / ".agents").is_dir():
        print("❌ .agents/ directory not found")
        sys.exit(1)

def show_help():
    print("""
🎨 UX Orchestrator v7 - Fixed Agent Execution

Usage:
  python3 scripts/ux-orchestrator.py <mode> [--unsafe]

Modes:
  split    Mode B: Coordinator + Agent side-by-side (tmux)
  windows  Mode C: Each agent in separate window (tmux)
  grid     Mode D: All 6 panes visible at once (tmux)
  direct   Run single agent directly (for testing)
  status   Check current file status
  reset    Remove all output files

Options:
  --unsafe   Skip permission prompts (SECURITY RISK - use only in sandboxes)

Direct Mode (for testing):
  python3 scripts/ux-orchestrator.py direct audit
  python3 scripts/ux-orchestrator.py direct audit --unsafe

SECURITY:
  By default, Claude will prompt for permission before file/command operations.
  Use --unsafe only in trusted, sandboxed environments where you accept all risks.

Examples:
  python3 scripts/ux-orchestrator.py status        # Check progress
  python3 scripts/ux-orchestrator.py direct audit  # Test (with prompts)
  python3 scripts/ux-orchestrator.py split         # Full workflow (with prompts)
  python3 scripts/ux-orchestrator.py split --unsafe  # Automated (no prompts)

Editor:
  Set EDITOR environment variable (default: nano)
  export EDITOR=vim
""")

def main():
    if len(sys.argv) < 2:
        show_help()
        sys.exit(0)

    # Parse --unsafe flag
    skip_permissions = "--unsafe" in sys.argv
    args = [a for a in sys.argv[1:] if a != "--unsafe"]

    if not args:
        show_help()
        sys.exit(0)

    cmd = args[0].lower()

    # Security warning for --unsafe
    if skip_permissions:
        print("\n⚠️  WARNING: Running with --unsafe (skipping permission prompts)")
        print("   This allows Claude to read/write files and run commands without confirmation.")
        print("   Only use in trusted, sandboxed environments.\n")

    # Internal commands (called from within tmux) - these inherit the flag from env
    if cmd == "_run_agents":
        orchestrate_inline()
        return
    elif cmd == "_run_agents_windows":
        orchestrate_windows()
        return
    elif cmd == "_run_agents_grid":
        orchestrate_grid()
        return

    # Check requirements for main commands
    if cmd in ["split", "windows", "grid", "direct"]:
        check_requirements()

    if cmd == "split":
        # For tmux modes, we need to pass the flag via environment
        if skip_permissions:
            os.environ["UX_SKIP_PERMISSIONS"] = "1"
        run_split_mode()
    elif cmd == "windows":
        if skip_permissions:
            os.environ["UX_SKIP_PERMISSIONS"] = "1"
        run_windows_mode()
    elif cmd == "grid":
        if skip_permissions:
            os.environ["UX_SKIP_PERMISSIONS"] = "1"
        run_grid_mode()
    elif cmd == "status":
        status = get_workflow_status()
        print("\n📊 Status:")
        for key, s in status.items():
            icon = "✓" if s["exists"] else "○"
            print(f"  {icon} {s['emoji']} {s['name']}: {s['output']}")
        print()
    elif cmd == "reset":
        for agent in AGENTS.values():
            path = get_project_root() / agent["output"]
            if path.exists():
                path.unlink()
                print(f"  ✓ Removed {agent['output']}")
        kill_session()
        print("\n✅ Reset complete!")
    elif cmd == "direct":
        # Direct mode - run single agent for testing
        if len(args) < 2:
            print("Usage: python3 scripts/ux-orchestrator.py direct <agent> [--unsafe]")
            print("Agents: audit, implement, quality, verify, test")
            sys.exit(1)
        agent_key = args[1].lower()
        if agent_key not in AGENTS:
            print(f"Unknown agent: {agent_key}")
            print(f"Available: {', '.join(AGENTS.keys())}")
            sys.exit(1)
        print(f"\n🔧 Direct Mode - Running {AGENTS[agent_key]['emoji']} {AGENTS[agent_key]['name']}")
        print("=" * 50)
        if not skip_permissions:
            print("\nClaude will prompt for permission before file/command operations.")
            print("Use --unsafe to skip prompts (not recommended).")
        print("Press Ctrl+C to cancel.\n")
        returncode = run_agent_inline(agent_key, skip_permissions=skip_permissions)
        if returncode == 0:
            print(f"\n✅ Agent completed successfully!")
            if file_exists(AGENTS[agent_key]['output']):
                print(f"   Output: {AGENTS[agent_key]['output']}")
        else:
            print(f"\n❌ Agent exited with code {returncode}")
    elif cmd == "help" or cmd == "-h" or cmd == "--help":
        show_help()
    else:
        print(f"Unknown command: {cmd}")
        show_help()

if __name__ == "__main__":
    main()
