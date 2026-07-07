# src/worker — Pipeline de saneamiento de prospectos

Worker local para procesamiento offline de prospectos LeadMaster.
No requiere dependencias externas: solo Node.js estándar.

## 📁 Scripts

| Script | Función | Entrada | Salida |
|--------|---------|---------|--------|
| `normalize-prospectos.js` | Normaliza campos: trim, minúsculas, URLs canónicas, whitespace | Datos crudos (simulados) | Datos normalizados |
| `dedupe-prospectos.js` | Detecta duplicados por dominio, email, teléfono normalizado | Datos normalizados | Reporte de duplicados |
| `score-prospectos.js` | Asigna score 1-10 basado en completitud de datos y señales | Datos normalizados | Datos con score |
| `export-prospectos.js` | Exporta a CSV/JSON con estructura canónica | Datos procesados | Archivo exportable |

## 🔒 Condiciones de uso

- **Solo Node.js estándar.** Sin `require()` de paquetes externos.
- **Solo lectura o simulación.** No modifica base de datos real.
- **Esqueletos funcionales.** Cada script acepta `--help` y muestra su contrato.
- **Sin efectos destructivos.** Las funciones de escritura están comentadas y protegidas.

## ▶️ Ejecución

```bash
# Ver contrato de cada script
node src/worker/normalize-prospectos.js --help
node src/worker/dedupe-prospectos.js --help
node src/worker/score-prospectos.js --help
node src/worker/export-prospectos.js --help

# Pipeline completo (cuando haya datos reales)
# node src/worker/normalize-prospectos.js < input.json | node src/worker/dedupe-prospectos.js | node src/worker/score-prospectos.js | node src/worker/export-prospectos.js
```

## ⚠️ Estado

**Fase 1 — Esqueletos.** Scripts con contratos definidos, lógica mínima y sin procesamiento de datos reales. Pendiente: fase 2 con integración real a DB y scraping.
