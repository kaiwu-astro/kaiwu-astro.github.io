#!/usr/bin/env python3
import argparse
import subprocess
import sys


def run(args, check=True):
    proc = subprocess.run(args, text=True, capture_output=True)
    if check and proc.returncode != 0:
        msg = proc.stderr.strip() or proc.stdout.strip() or f"command failed: {' '.join(args)}"
        raise SystemExit(msg)
    return proc


def git(args, check=True):
    return run(["git", *args], check=check)


def ensure_repo():
    if git(["rev-parse", "--show-toplevel"], check=False).returncode != 0:
        raise SystemExit("commit: current directory is not inside a Git repository")


def parse_porcelain_z(data):
    if not data:
        return set()
    parts = data.split("\0")
    paths = set()
    i = 0
    while i < len(parts):
        entry = parts[i]
        if not entry:
            i += 1
            continue
        status = entry[:2]
        path = entry[3:]
        if path:
            paths.add(path)
        i += 1
        if status[0] == "R" or status[1] == "R":
            if i < len(parts) and parts[i]:
                paths.add(parts[i])
            i += 1
    return paths


def changed_paths(pathspec=None, staged=False):
    args = ["status", "--porcelain", "-z"]
    if staged:
        args.insert(1, "--untracked-files=no")
    if pathspec:
        args.extend(["--", *pathspec])
    return parse_porcelain_z(git(args).stdout)


def staged_paths():
    out = git(["diff", "--cached", "--name-only", "-z"]).stdout
    return {p for p in out.split("\0") if p}


def has_staged_changes():
    return git(["diff", "--cached", "--quiet"], check=False).returncode == 1


def parse_args(argv):
    normalized = []
    message = None
    for arg in argv:
        if arg.startswith("message="):
            message = arg[len("message="):]
        else:
            normalized.append(arg)

    parser = argparse.ArgumentParser(description="Commit explicit Git changes.")
    parser.add_argument("--message", "-m", dest="message")
    parser.add_argument("--all", action="store_true", help="Commit all changes.")
    parser.add_argument("paths", nargs="*", help="Pathspecs to commit.")
    args = parser.parse_args(normalized)
    if message is not None and args.message is not None:
        parser.error("use either message=MSG or --message MSG, not both")
    args.message = args.message if args.message is not None else message
    if not args.message:
        parser.error("--message MSG is required")
    if args.all and args.paths:
        parser.error("use --all or pathspecs, not both")
    if not args.all and not args.paths:
        parser.error("use --all or provide pathspecs")
    return args


def stage(args):
    if args.all:
        git(["add", "-A"])
        return

    allowed = changed_paths(args.paths)
    if not allowed:
        raise SystemExit("commit: no changes found in requested pathspec")

    outside = staged_paths() - allowed
    if outside:
        listed = "\n".join(sorted(outside))
        raise SystemExit(f"commit: staged changes outside requested scope:\n{listed}")
    git(["add", "--", *args.paths])


def commit(message):
    return git(["commit", "-m", message], check=False)


def main(argv=None):
    args = parse_args(sys.argv[1:] if argv is None else argv)
    ensure_repo()

    stage(args)
    if not has_staged_changes():
        raise SystemExit("commit: no staged changes to commit")

    proc = commit(args.message)
    if proc.returncode == 0:
        print(proc.stdout.strip())
        return 0

    # Some hooks rewrite files and abort the first commit. Restage the requested
    # scope once, then retry without expanding the user's selected range.
    stage(args)
    if not has_staged_changes():
        raise SystemExit(proc.stderr.strip() or proc.stdout.strip() or "commit: commit failed")
    retry = commit(args.message)
    if retry.returncode != 0:
        raise SystemExit(retry.stderr.strip() or retry.stdout.strip() or "commit: commit failed")
    print(retry.stdout.strip())
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

