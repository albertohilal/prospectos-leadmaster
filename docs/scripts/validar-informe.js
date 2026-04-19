#!/usr/bin/env node
/**
 * Validador básico de informes Markdown según REGLAS-INFORMES.md
 * Uso: node validar-informe.js <ruta-al-informe.md>
 */

const fs = require('fs');
const path = require('path');

function main() {
    const args = process.argv.slice(2);
    if (args.length !== 1) {
        console.error('Uso: node validar-informe.js <ruta-al-informe.md>');
        process.exit(1);
    }

    const filePath = args[0];
    if (!fs.existsSync(filePath)) {
        console.error(`❌ Archivo no encontrado: ${filePath}`);
        process.exit(1);
    }

    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    const filename = path.basename(filePath);

    console.log(`📄 Validando informe: ${filename}\n`);

    const checks = {
        tieneTitulo: false,
        tieneFecha: false,
        tieneProyecto: false,
        tieneResumen: false,
        tieneConclusion: false,
        tieneSecciones: false,
    };

    // 1. Título principal (línea que empieza con # seguido de espacio)
    if (lines.some(line => line.startsWith('# ') && !line.startsWith('##'))) {
        checks.tieneTitulo = true;
        console.log('✅ Título principal presente');
    } else {
        console.log('❌ No se encontró título principal (# Título)');
    }

    // 2. Fecha (busca patrón "Fecha:" o "Fecha: " en cualquier línea)
    const fechaRegex = /^Fecha:\s*\d{4}[-/]\d{2}[-/]\d{2}/i;
    const fechaRegex2 = /^Fecha:\s*\d{1,2}\s+de\s+\w+\s+de\s+\d{4}/i;
    if (lines.some(line => fechaRegex.test(line) || fechaRegex2.test(line))) {
        checks.tieneFecha = true;
        console.log('✅ Fecha presente');
    } else {
        console.log('❌ No se encontró fecha (formato: Fecha: YYYY-MM-DD o similar)');
    }

    // 3. Proyecto (busca "Proyecto:")
    if (lines.some(line => line.toLowerCase().includes('proyecto:'))) {
        checks.tieneProyecto = true;
        console.log('✅ Proyecto mencionado');
    } else {
        console.log('❌ No se menciona el proyecto (Proyecto: ...)');
    }

    // 4. Resumen ejecutivo (busca sección ## Resumen, permite emojis antes del texto)
    const resumenSection = lines.findIndex(line => line.match(/^##\s+.*Resumen/i));
    if (resumenSection !== -1) {
        checks.tieneResumen = true;
        console.log('✅ Sección "Resumen" presente');
    } else {
        console.log('⚠️  No se encontró sección "Resumen" (recomendado)');
    }

    // 5. Conclusión o Próximos Pasos (busca ## Conclusión o ## Próximos Pasos, permite emojis)
    const conclusionIndex = lines.findIndex(line => line.match(/^##\s+.*(Conclusión|Conclusiones|Próximos Pasos|Recomendaciones)/i));
    if (conclusionIndex !== -1) {
        checks.tieneConclusion = true;
        console.log('✅ Sección de conclusión o próximos pasos presente');
    } else {
        console.log('❌ No se encontró sección de conclusión o próximos pasos');
    }

    // 6. Al menos otra sección ## además de Resumen/Conclusión (permite emojis)
    const secciones = lines.filter(line => line.match(/^##\s+.*[\w\p{Emoji}]/u)).length;
    if (secciones >= 2) {
        checks.tieneSecciones = true;
        console.log(`✅ Secciones de desarrollo presentes (${secciones} secciones ##)`);
    } else {
        console.log('❌ Muy pocas secciones ## (se espera al menos una de desarrollo)');
    }

    // Resumen
    console.log('\n--- RESUMEN DE VALIDACIÓN ---');
    const totalChecks = Object.keys(checks).length;
    const passed = Object.values(checks).filter(v => v).length;
    const score = Math.round((passed / totalChecks) * 100);

    console.log(`Aprobados: ${passed}/${totalChecks} (${score}%)`);

    if (score >= 80) {
        console.log('🎉 Informe válido según reglas básicas.');
    } else if (score >= 50) {
        console.log('⚠️  Informe parcialmente válido. Revisar secciones faltantes.');
    } else {
        console.log('❌ Informe no cumple con la estructura mínima.');
    }

    // Sugerencia de nombre de archivo
    if (!/^\d{4}-\d{2}-\d{2}-/.test(filename) && !/\.bak\.md$/.test(filename)) {
        console.log('\n💡 Sugerencia: considerar nombrar el archivo con fecha al inicio (YYYY-MM-DD-...).');
    }
}

if (require.main === module) {
    main();
}

module.exports = { main };