#!/bin/bash

set -euo pipefail

docker build -f Dockerfile-lobby -t keyteki-lobby .
docker build -f Dockerfile-node -t keyteki-node .