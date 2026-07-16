# Documentación oficial de PPV (AsciiDoc)

Fuente de la **documentación técnica oficial** de PPV, generada por ClutchDevs. Produce un PDF tipo
libro (portada con logo de ClutchDevs, índice, pies de página con `clutchdevs.com`).

## Estructura

```
docs/asciidoc/
  documentation.adoc      # Documento maestro (portada + includes)
  sections/               # Una sección por archivo
    01-resumen-ejecutivo.adoc
    02-arquitectura.adoc
    03-integraciones.adoc
    04-event-driven.adoc
    05-requisitos-y-reglas.adoc
    06-seguridad-y-privacidad.adoc
    07-api.adoc
    08-despliegue-y-operacion.adoc
    09-ai-dlc.adoc
    10-referencias-y-docs.adoc
    99-anexo-c4.adoc
  theme/ppv-theme.yml     # Tema PDF (marca ClutchDevs)
  images/                 # Logos + diagramas (C4 canónicos y vistas derivadas)
  build.sh                # Genera el PDF
```

## Requisitos

- [Asciidoctor PDF](https://docs.asciidoctor.org/pdf-converter/latest/) (Ruby):
  ```sh
  gem install asciidoctor-pdf rouge
  ```

## Generar el PDF

```sh
cd docs/asciidoc
./build.sh
# → documentation.pdf
```

O directamente:

```sh
asciidoctor-pdf -a pdf-themesdir=theme -a pdf-theme=ppv \
  -a imagesdir=images -o documentation.pdf documentation.adoc
```

El PDF (`documentation.pdf`) es un **artefacto generado** y está en `.gitignore`.

## Diagramas

Los diagramas en `images/` se generan desde los C4 en Mermaid (`docs/architecture/*.md`):

- `c4-*.png` — render directo de los diagramas C4 canónicos (Anexo A).
- `arch-*.png`, `comp-*.png` — vistas derivadas (flowchart/sequence) para las secciones de
  arquitectura y event-driven, con mejor legibilidad de etiquetas.

Para regenerarlos hace falta un render de Mermaid (p. ej. `@mermaid-js/mermaid-cli`) sobre las
fuentes de `docs/architecture/`. Los PNG se versionan en el repo para que el PDF sea reproducible sin
la cadena de Mermaid.
