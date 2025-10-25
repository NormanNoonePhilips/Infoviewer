#!/bin/bash

# Custom deployment script for Azure App Service
# This preserves web.config during deployment

set -e

# 1. KuduSync - sync files
if [[ -n "$KUDU_SYNC_CMD" ]]; then
    echo "Running KuduSync..."
    "$KUDU_SYNC_CMD" -v 50 -f "$DEPLOYMENT_SOURCE" -t "$DEPLOYMENT_TARGET" -n "$NEXT_MANIFEST_PATH" -p "$PREVIOUS_MANIFEST_PATH" -i ".git;.hg;.deployment;deploy.sh"
    exitWithMessageOnError "Kudu Sync failed"
fi

# 2. Install npm packages
if [ -e "$DEPLOYMENT_TARGET/package.json" ]; then
    cd "$DEPLOYMENT_TARGET"
    echo "Running npm install..."
    npm install --production
    exitWithMessageOnError "npm install failed"
fi

# 3. Preserve web.config - copy it AFTER other operations
if [ -e "$DEPLOYMENT_SOURCE/web.config" ]; then
    echo "Copying custom web.config..."
    cp -f "$DEPLOYMENT_SOURCE/web.config" "$DEPLOYMENT_TARGET/web.config"
    echo "web.config preserved!"
fi

echo "Deployment completed successfully!"