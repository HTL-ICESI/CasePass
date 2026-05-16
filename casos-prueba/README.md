# Casos De Prueba

Agrega una carpeta por caso dentro de `casos-prueba/`.

## Estructura esperada

```text
casos-prueba/
  caso-001/
    documento-1.pdf
    documento-2.pdf
    metadata.json
```

## `metadata.json`

Cada carpeta debe incluir un `metadata.json` con esta estructura:

```json
{
  "radicado": "11001-31-03-001-2024-00001-00",
  "partes": "Demandante vs Demandado",
  "hechos_clave": [
    "Resumen del hecho 1",
    "Resumen del hecho 2"
  ],
  "preguntas_prueba": [
    "Cual es la pretension principal?",
    "Que pruebas documentales existen?"
  ]
}
```
