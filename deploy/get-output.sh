#!/bin/bash

# --------------------
# get tofu outputs
# --------------------
pushd ./tf
OUTPUT=$(
    tofu output -json 2>/dev/null
)
popd
