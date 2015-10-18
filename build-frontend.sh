#!/usr/bin/env bash

browserify -t babelify --outfile static/js/dist.js static/js/app.js
