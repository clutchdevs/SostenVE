#!/usr/bin/env bash
# Genera la documentación oficial de PPV en PDF (ClutchDevs).
# Requiere: gem install asciidoctor-pdf rouge
set -euo pipefail

cd "$(dirname "$0")"

if ! command -v asciidoctor-pdf >/dev/null 2>&1; then
  echo "ERROR: asciidoctor-pdf no está instalado." >&2
  echo "  Instálalo con: gem install asciidoctor-pdf rouge" >&2
  exit 1
fi

asciidoctor-pdf \
  -a pdf-themesdir=theme \
  -a pdf-theme=ppv \
  -a imagesdir=images \
  -o documentation.pdf \
  documentation.adoc

echo "OK → $(pwd)/documentation.pdf"
