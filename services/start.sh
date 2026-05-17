#!/bin/sh
export INFISICAL_TOKEN=$(infisical login --method=universal-auth --client-id=$INFISICAL_MACHINE_CLIENT_ID --client-secret=$INFISICAL_MACHINE_CLIENT_SECRET --plain --silent)
INFISICAL_ENV=${INFISICAL_SECRET_ENV:-$([ "$NODE_ENV" = "production" ] && echo "prod" || echo "dev")}
exec infisical run --token $INFISICAL_TOKEN --projectId 1e4a9be2-aaf8-4e0b-be53-185dac145515 --env $INFISICAL_ENV -- node dist/index.js
