#!/usr/bin/env python3
"""Install the cqf skill into the current working directory."""

from __future__ import annotations

import argparse
import os
import shutil
import subprocess
import sys
from pathlib import Path


REPO_URL = "https://github.com/6maple/c-skills.git"
CACHE_RELATIVE_PATH = Path(".cache") / "c-skills"
GIT_DIR_NAME = ".git"
HIDDEN_GIT_DIR_NAME = ".git-lock"
SOURCE_SKILLS_RELATIVE_PATH = Path("skills")
CANONICAL_SKILLS_RELATIVE_PATH = Path(".agents") / "skills"
CLAUDE_SKILLS_RELATIVE_PATH = Path(".claude") / "skills"


def run(args: list[str], cwd: Path | None = None) -> str:
    result = subprocess.run(
        args,
        cwd=cwd,
        check=True,
        text=True,
        encoding="utf-8",
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    return result.stdout.strip()


def ensure_inside_root(path: Path, root: Path) -> Path:
    resolved = path.resolve()
    resolved.relative_to(root)
    return resolved


def sync_repo(cache_dir: Path) -> None:
    git_dir = cache_dir / GIT_DIR_NAME
    hidden_git_dir = cache_dir / HIDDEN_GIT_DIR_NAME

    if cache_dir.exists():
        if git_dir.is_dir():
            if hidden_git_dir.exists():
                raise RuntimeError(
                    f"Both {GIT_DIR_NAME} and {HIDDEN_GIT_DIR_NAME} exist in cache: {cache_dir}"
                )
            git_dir.rename(hidden_git_dir)
        if not hidden_git_dir.is_dir():
            raise RuntimeError(f"Cache path exists but is not a git repository: {cache_dir}")
        run(
            ["git", "--git-dir", HIDDEN_GIT_DIR_NAME, "--work-tree", ".", "fetch", "--prune", "origin"],
            cwd=cache_dir,
        )
        run(
            ["git", "--git-dir", HIDDEN_GIT_DIR_NAME, "--work-tree", ".", "reset", "--hard", "origin/main"],
            cwd=cache_dir,
        )
        return

    cache_dir.parent.mkdir(parents=True, exist_ok=True)
    run(["git", "clone", REPO_URL, str(cache_dir)])
    git_dir.rename(hidden_git_dir)


def remove_path(path: Path) -> None:
    """Remove a file, directory, symlink, or Windows junction at an explicit path."""
    if not os.path.lexists(path):
        return

    is_junction = getattr(os.path, "isjunction", None)
    if path.is_symlink() or (is_junction is not None and os.path.isjunction(path)):
        path.unlink()
    elif path.is_dir():
        shutil.rmtree(path)
    else:
        path.unlink()


def create_directory_link(target: Path, link: Path) -> bool:
    """Create a portable local directory link, returning false when unsupported."""
    try:
        remove_path(link)
        link.parent.mkdir(parents=True, exist_ok=True)
        if sys.platform == "win32":
            # Junctions do not require Developer Mode or symlink privileges.
            subprocess.run(
                ["cmd", "/c", "mklink", "/J", str(link), str(target)],
                check=True,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
            )
        else:
            link.symlink_to(os.path.relpath(target, link.parent), target_is_directory=True)
        return True
    except (OSError, subprocess.CalledProcessError):
        remove_path(link)
        return False


def install_skills(source: Path, canonical_destination: Path) -> None:
    remove_path(canonical_destination)
    shutil.copytree(source, canonical_destination)


def install_for_agent(
    source: Path,
    canonical_destination: Path,
    agent: str,
    copy_mode: bool,
) -> tuple[Path, bool]:
    install_skills(source, canonical_destination)

    if agent == "codex":
        return canonical_destination, False

    claude_destination = canonical_destination.parent.parent / CLAUDE_SKILLS_RELATIVE_PATH
    if copy_mode:
        remove_path(claude_destination)
        shutil.copytree(canonical_destination, claude_destination)
        return claude_destination, False

    if create_directory_link(canonical_destination, claude_destination):
        return claude_destination, False

    shutil.copytree(canonical_destination, claude_destination)
    return claude_destination, True


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Pull 6maple/c-skills into .cache/c-skills and install the cqf skill."
    )
    parser.add_argument(
        "-a",
        "--agent",
        choices=("claude", "codex"),
        required=True,
        help="Agent type to install for.",
    )
    parser.add_argument(
        "--copy",
        action="store_true",
        help="For Claude, copy skills instead of creating a directory link.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    execution_root = Path.cwd().resolve()

    try:
        cache_dir = ensure_inside_root(execution_root / CACHE_RELATIVE_PATH, execution_root)
        canonical_destination = ensure_inside_root(
            execution_root / CANONICAL_SKILLS_RELATIVE_PATH, execution_root
        )

        sync_repo(cache_dir)
        source = cache_dir / SOURCE_SKILLS_RELATIVE_PATH
        installed_path, used_copy_fallback = install_for_agent(
            source, canonical_destination, args.agent, args.copy
        )

        print(f"Installed cqf for {args.agent}.")
        print(f"Repository cache: {cache_dir}")
        print(f"Canonical skills: {canonical_destination}")
        print(f"Agent skills: {installed_path}")
        if used_copy_fallback:
            print("Warning: directory link creation failed; installed a copy for Claude.")
        return 0
    except (OSError, RuntimeError, subprocess.CalledProcessError, ValueError) as error:
        print(f"install failed: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
