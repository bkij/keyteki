#!/bin/bash

set -euo pipefail

npm run build
docker build -f Dockerfile-prod -t keyteki-frontend .