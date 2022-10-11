#!/bin/bash

set -euo pipefail

npm run build
docker build -f Dockerfile-lobby -t keyteki-lobby .
docker build -f Dockerfile-node -t keyteki-node .