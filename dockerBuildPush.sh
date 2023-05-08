#!/bin/bash
docker build . -t jfoclpf/geoapi.pt:latest
docker image prune -f
docker push jfoclpf/geoapi.pt:latest
