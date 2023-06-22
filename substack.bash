#!/bin/bash
mainStack=$(pulumi stack --show-name)
subStack="$1"
# Get the rest of the arguments
shift
command="$@"
pulumi --stack $currentStack.$substack $command
