# Plan Proyecto LeadMaster

## Objetivo
Crear un sistema automatizado que, usando OpenClaw, realice búsquedas en Google Chrome por palabras clave, haga clic en anuncios patrocinados, capture landing pages, extraiga texto (OCR) y guarde la información en una base de datos MySQL. Meta: 100 prospectos-leadmaster válidos.

## Arquitectura
1. **Agente Principal (OpenClaw)**: Orquesta el flujo, gestiona la lista de palabras clave, lanza subprocesos, programa ejecuciones.
2. **Script Node.js**: Realiza las tareas de navegación, captura, OCR y guardado en BD. Se ejecutará desde OpenClaw via `exec`.
3. **Base de datos MySQL**: Almacena los prospectos con metadatos y texto extraído.
4. **Posible integración con OpenAI API**: Para análisis de calidad del prospecto (opcional).

## Fases

### Estado de verificación (2026-05-07)
- Criterio: se marca `[x]` cuando hay evidencia directa en el repositorio (código/scripts/SQL) o confirmación operativa explícita del entorno.
- Confirmación operativa recibida: la base de datos vive en este servidor (`leadmaster`).

### Fase 1: Instalación de dependencias del sistema
- [ ] Instalar MySQL Server y cliente
- [ ] Instalar Tesseract OCR (español e inglés)
- [ ] Instalar Chrome/Chromium
- [x] Instalar dependencias Node.js (playwright, mysql2, tesseract.js)
- [ ] Verificar que OpenClaw tenga permisos de `exec` y `browser`

### Fase 2: Configuración de base de datos
- [x] Crear base de datos `leadmaster`
- [x] Crear tabla `prospectos` con campos: id, palabra_clave, url_anuncio, url_landing, texto_extraido, fecha_hora, es_valido, etc.
- [ ] Configurar usuario y permisos

### Fase 3: Desarrollo del script Node.js (una palabra clave)
- [x] Escribir script `leadmaster_scraper.js` que:
  1. Tome una palabra clave como argumento
  2. Abra Chrome con Playwright
  3. Busque en Google la palabra clave
  4. Identifique y haga clic en los anuncios patrocinados (selectores específicos)
  5. Navegue a la landing page
  6. Tome captura de pantalla completa (scroll)
  7. Extraiga texto de la imagen con Tesseract.js
  8. Conecte a MySQL y guarde el registro
  9. Maneje errores y timeouts
- [ ] Probar cada componente por separado
- [x] Crear `package.json` con dependencias

### Fase 4: Prueba integral con una palabra clave
- [ ] Ejecutar script manualmente desde terminal SSH
- [ ] Verificar que el registro se guarde en MySQL
- [ ] Validar calidad del texto extraído
- [x] Ajustar selectores y parámetros según resultados

### Fase 5: Integración con OpenClaw
- [ ] Crear un Skill de OpenClaw que envuelva el script
- [ ] Configurar agente principal para iterar sobre las 20 palabras clave
- [ ] Programar ejecuciones periódicas con `cron` (ej. cada 6 horas)
- [ ] Implementar lógica para detener al alcanzar 100 prospectos válidos

### Fase 6: Escalado y monitoreo
- [ ] Ejecutar para las 20 palabras clave
- [ ] Revisar prospectos, marcar válidos/inválidos
- [x] Optimizar selectores para mejorar tasa de acierto
- [ ] Considerar uso de OpenAI API para clasificación automática (opcional)

## Lista de palabras clave
1. presupuesto para reforma de oficinas en CABA
2. contratar logística de distribución para alimentos
3. cotizar seguro de responsabilidad civil para empresas
4. alquiler de generadores eléctricos para industrias
5. compra de insumos odontológicos por mayor
6. servicio de mantenimiento de ascensores para edificios
7. auditoría de seguridad e higiene para fábricas
8. gestión de recupero de créditos para PYMES
9. presupuesto para pintura industrial de tanques
10. contratar vigilancia privada para obras en construcción
11. servicio de fumigación para plantas industriales
12. cotización de viáticos corporativos para empleados
13. alquiler de andamios para construcción en altura
14. compra de envases de vidrio para vinotecas
15. servicio de traducción técnica para exportadores
16. presupuesto para impermeabilización de terrazas comerciales
17. contratar escolta privada para transporte de valores
18. gestión de patentes municipales para flotas de camiones
19. cotizar instalación de paneles solares para fábricas
20. servicio de limpieza de tanques de agua para hoteles

## Stack técnico (Node.js)
- **Playwright**: Automatización del navegador
- **Tesseract.js**: OCR para extraer texto de imágenes
- **mysql2**: Conexión a base de datos MySQL
- **OpenClaw**: Orquestación y programación (cron)

## Regla de equivalencia de cliente (IUNAORG)

- La clave de tenencia de datos **no es arbitraria**.
- Equivalencia oficial: `iunaorg_dyd.ll_usuarios.cliente_id = iunaorg_dyd.llbx_societe.rowid`.
- En altas de usuarios (`ll_usuarios`), el valor de `cliente_id` debe derivarse de la sociedad (`llbx_societe`) correspondiente al cliente.

### SQL de validación de equivalencia

```sql
SELECT u.id,
       u.usuario,
       u.cliente_id,
       s.rowid AS societe_rowid,
       s.nom   AS cliente_nombre
FROM iunaorg_dyd.ll_usuarios u
JOIN iunaorg_dyd.llbx_societe s
  ON s.rowid = u.cliente_id
ORDER BY u.id DESC;
```

### SQL recomendado para alta de usuario respetando equivalencia

```sql
INSERT INTO iunaorg_dyd.ll_usuarios (cliente_id, usuario, passh, tipo, activo)
SELECT s.rowid, 'usuario_nuevo', '$2b$10$HASH_BCRYPT', 'cliente', 1
FROM iunaorg_dyd.llbx_societe s
WHERE s.nom = 'leadmaster'
  AND NOT EXISTS (
    SELECT 1
    FROM iunaorg_dyd.ll_usuarios u
    WHERE u.usuario = 'usuario_nuevo'
  );
```

## Próximos pasos inmediatos
1. Verificar en servidor instalaciones reales pendientes: Tesseract y Chrome/Chromium.
2. Confirmar credenciales/permisos del usuario MySQL en entorno productivo.
3. Ejecutar validación integral (1 keyword): corrida + registro en MySQL + revisión de OCR.
4. Definir integración real con OpenClaw (skill + permisos `exec`/`browser`) o formalizar orquestación con `scripts/run-daily-batch.sh`.
5. Implementar criterio de corte por meta de 100 prospectos válidos y ejecución programada (`cron`).

## Partes faltantes detectadas
- Operación en servidor no verificada desde repo: instalación efectiva de Tesseract y Chrome/Chromium.
- Evidencia de ejecución integral pendiente: corrida SSH + validación OCR + verificación explícita en MySQL.
- Integración OpenClaw pendiente: no se detecta Skill o configuración del agente principal en el repo.
- Automatización periódica pendiente: no hay `crontab` versionado en este proyecto.
- Criterio de meta pendiente: no está implementado el corte explícito al llegar a 100 registros con `es_valido = TRUE`.