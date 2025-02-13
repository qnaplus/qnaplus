#!/bin/bash

if [ "$CF_PAGES_BRANCH" == "dev" ]; then
    yarn build --mode development
else
    yarn build
fi