#!/bin/sh
set -eu

repo_name="${SVN_REPO_NAME:-Test}"
repo_path="/home/svn/${repo_name}"

if [ ! -d "$repo_path/conf" ]; then
  echo "[svn-bootstrap] creating repository ${repo_name}"
  svnadmin create "$repo_path"
else
  echo "[svn-bootstrap] repository ${repo_name} already exists"
fi

if [ "${SVN_CREATE_LAYOUT:-true}" = "true" ]; then
  if [ ! -d "$repo_path/db/revs/0" ] || ! svnlook tree "$repo_path" | grep -q "^trunk/$"; then
    echo "[svn-bootstrap] creating standard trunk/branches/tags layout"
    svn mkdir -m "Initialize standard layout" \
      "file://${repo_path}/trunk" \
      "file://${repo_path}/branches" \
      "file://${repo_path}/tags" >/dev/null
  else
    echo "[svn-bootstrap] standard layout already present"
  fi
fi

echo "[svn-bootstrap] repository bootstrap complete"
