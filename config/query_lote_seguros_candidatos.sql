-- LM-003A-C v2: Deteccion estricta de candidatos de seguros
-- Solo lectura. No modifica datos.
-- Busca vendedores/intermediarios de seguros (potenciales clientes LeadMaster).
-- La consulta es amplia para capturar todo. La clasificacion estricta se hace en JS.

SELECT
    p.id AS prospecto_id,
    s.id AS stg_id,
    s.cliente_id,
    s.nom,
    s.url_landing,
    p.palabra_clave,
    s.email_extraido,
    s.telefono_extraido,
    s.whatsapp_extraido,
    s.contacto_estado,
    p.texto_extraido,
    CASE
        WHEN p.palabra_clave REGEXP '(broker|productor|organizador|insurtech|sociedad\\s+de\\s+productores)'
             THEN 'keyword_directa'
        WHEN p.palabra_clave REGEXP '(seguros?|asegurador|ART|caucion|flota|poliza|siniestro|cotizador)'
             THEN 'keyword_seguros'
        WHEN s.nom REGEXP '(seguros?|broker|productor|asegurador|insurtech|organizador|ART|caucion)'
             THEN 'nom'
        WHEN s.url_landing REGEXP '(seguro|broker|productor|asegurador|insurtech|cotizador|poliza|art-|caucion)'
             THEN 'url'
        WHEN s.email_extraido REGEXP '(seguro|broker|productor|asegurador|insurtech|ssn)'
             THEN 'email'
        WHEN p.texto_extraido REGEXP '(broker\\s+de\\s+seguros|productor\\s+asesor\\s+de\\s+seguros|sociedad\\s+de\\s+productores|organizador\\s+de\\s+seguros|aseguradora|comp[añn][ií]a\\s+de\\s+seguros|seguros\\s+corporativos|seguros\\s+para\\s+empresas)'
             THEN 'texto_frase_fuerte'
        WHEN p.texto_extraido REGEXP '(seguros?|broker|productor|asegurador|insurtech|ART|caucion|flotas|poliza)'
             THEN 'texto_debil'
        ELSE 'otro'
    END AS senal_detectada
FROM la_prospectos p
LEFT JOIN la_stg_prospectos s ON s.prospecto_id = p.id
WHERE
    p.palabra_clave REGEXP '(broker|productor|seguros?|asegurador|organizador|insurtech|ART|caucion|flota|poliza|siniestro|cotizador|responsabilidad\\s+civil)'
    OR (s.nom IS NOT NULL AND s.nom REGEXP '(seguros?|broker|productor|asegurador|insurtech|organizador|ART|caucion)')
    OR (s.url_landing IS NOT NULL AND s.url_landing REGEXP '(seguro|broker|productor|asegurador|insurtech|cotizador|poliza|art-|caucion)')
    OR (s.email_extraido IS NOT NULL AND s.email_extraido REGEXP '(seguro|broker|productor|asegurador|insurtech|ssn)')
    OR (p.texto_extraido IS NOT NULL AND p.texto_extraido REGEXP '(broker\\s+de\\s+seguros|productor\\s+asesor\\s+de\\s+seguros|sociedad\\s+de\\s+productores|organizador\\s+de\\s+seguros|comp[añn][ií]a\\s+de\\s+seguros|aseguradora|seguros\\s+corporativos|seguros\\s+para\\s+empresas)')
ORDER BY s.prospecto_id;
