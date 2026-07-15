#!/usr/bin/env bash
# Install or refresh kai-configs at its recommended location.
set -euo pipefail
IFS=$'\n\t'
umask 077

repo_url='git@github.com:kaiwu-astro/kai-configs.git'
repo_dir="${KAI_CONFIGS_DIR:-$HOME/code/kai-configs}"

if ! command -v git >/dev/null 2>&1; then
  echo "需要 git，请先安装后重试。" >&2
  exit 1
fi

if [ -L "$repo_dir" ]; then
  echo "目标目录不能是符号链接：$repo_dir" >&2
  exit 1
fi

if [ -e "$repo_dir" ]; then
  if ! git -C "$repo_dir" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    echo "目标已存在但不是 Git 仓库：$repo_dir" >&2
    exit 1
  fi

  current_url="$(git -C "$repo_dir" remote get-url origin 2>/dev/null || true)"
  if [ "$current_url" != "$repo_url" ]; then
    echo "目标仓库的 origin 不是 kaiwu-astro/kai-configs：$repo_dir" >&2
    exit 1
  fi

  current_branch="$(git -C "$repo_dir" symbolic-ref --quiet --short HEAD 2>/dev/null || true)"
  if [ "$current_branch" != "main" ]; then
    echo "目标仓库必须位于 main 分支：$repo_dir" >&2
    exit 1
  fi
else
  mkdir -p "$(dirname "$repo_dir")"
  git clone --branch main --single-branch "$repo_url" "$repo_dir"
fi

exec "$repo_dir/scripts/update.sh"
