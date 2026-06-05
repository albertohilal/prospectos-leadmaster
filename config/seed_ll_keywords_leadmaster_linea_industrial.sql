USE iunaorg_dyd;

INSERT IGNORE INTO ll_keywords_leadmaster
(`keyword`, keyword_hash, sector, perfil, prioridad, estado, origen, notas)
VALUES
(
    'proveedor de válvulas industriales para petróleo y gas',
    SHA2(LOWER(TRIM('proveedor de válvulas industriales para petróleo y gas')), 256),
    'petroleo_gas',
    'b2b',
    'alta',
    'pendiente',
    'linea_industrial',
    'Nueva keyword industrial B2B orientada a petróleo y gas'
),
(
    'compra de bombas industriales para minería',
    SHA2(LOWER(TRIM('compra de bombas industriales para minería')), 256),
    'mineria',
    'b2b',
    'alta',
    'pendiente',
    'linea_industrial',
    'Nueva keyword industrial B2B orientada a minería'
),
(
    'proveedor de cañerías para obras industriales',
    SHA2(LOWER(TRIM('proveedor de cañerías para obras industriales')), 256),
    'industria',
    'b2b',
    'alta',
    'pendiente',
    'linea_industrial',
    'Nueva keyword industrial B2B'
),
(
    'cotizar compresores industriales para fábrica',
    SHA2(LOWER(TRIM('cotizar compresores industriales para fábrica')), 256),
    'industria',
    'b2b',
    'alta',
    'pendiente',
    'linea_industrial',
    'Nueva keyword industrial B2B'
),
(
    'alquiler de equipos para obra vial',
    SHA2(LOWER(TRIM('alquiler de equipos para obra vial')), 256),
    'obra_vial',
    'b2b',
    'media',
    'pendiente',
    'linea_industrial',
    'Nueva keyword B2B orientada a obra vial'
),
(
    'proveedor de repuestos para maquinaria agrícola',
    SHA2(LOWER(TRIM('proveedor de repuestos para maquinaria agrícola')), 256),
    'agro',
    'b2b',
    'alta',
    'pendiente',
    'linea_industrial',
    'Nueva keyword B2B orientada a agro'
),
(
    'compra de neumáticos para maquinaria pesada',
    SHA2(LOWER(TRIM('compra de neumáticos para maquinaria pesada')), 256),
    'maquinaria_pesada',
    'b2b',
    'alta',
    'pendiente',
    'linea_industrial',
    'Nueva keyword B2B orientada a maquinaria pesada'
),
(
    'proveedor de lubricantes industriales por mayor',
    SHA2(LOWER(TRIM('proveedor de lubricantes industriales por mayor')), 256),
    'industria',
    'b2b',
    'alta',
    'pendiente',
    'linea_industrial',
    'Nueva keyword industrial B2B'
),
(
    'mantenimiento de grupos electrógenos industriales',
    SHA2(LOWER(TRIM('mantenimiento de grupos electrógenos industriales')), 256),
    'mantenimiento',
    'b2b',
    'alta',
    'pendiente',
    'linea_industrial',
    'Nueva keyword B2B de mantenimiento industrial'
),
(
    'servicio de calibración de instrumentos industriales',
    SHA2(LOWER(TRIM('servicio de calibración de instrumentos industriales')), 256),
    'mantenimiento',
    'b2b',
    'media',
    'pendiente',
    'linea_industrial',
    'Nueva keyword B2B de servicio técnico industrial'
),
(
    'proveedor de elementos de protección personal para empresas',
    SHA2(LOWER(TRIM('proveedor de elementos de protección personal para empresas')), 256),
    'seguridad_industrial',
    'b2b',
    'media',
    'pendiente',
    'linea_industrial',
    'Nueva keyword B2B orientada a seguridad industrial'
),
(
    'compra de uniformes industriales por mayor',
    SHA2(LOWER(TRIM('compra de uniformes industriales por mayor')), 256),
    'seguridad_industrial',
    'b2b',
    'media',
    'pendiente',
    'linea_industrial',
    'Nueva keyword B2B orientada a empresas'
),
(
    'proveedor de sensores industriales para automatización',
    SHA2(LOWER(TRIM('proveedor de sensores industriales para automatización')), 256),
    'automatizacion',
    'b2b',
    'alta',
    'pendiente',
    'linea_industrial',
    'Nueva keyword industrial B2B orientada a automatización'
),
(
    'instalación de tableros eléctricos industriales',
    SHA2(LOWER(TRIM('instalación de tableros eléctricos industriales')), 256),
    'energia',
    'b2b',
    'alta',
    'pendiente',
    'linea_industrial',
    'Nueva keyword B2B de instalaciones industriales'
),
(
    'mantenimiento eléctrico industrial para plantas',
    SHA2(LOWER(TRIM('mantenimiento eléctrico industrial para plantas')), 256),
    'energia',
    'b2b',
    'alta',
    'pendiente',
    'linea_industrial',
    'Nueva keyword B2B de mantenimiento industrial'
),
(
    'proveedor de equipos hidráulicos para maquinaria',
    SHA2(LOWER(TRIM('proveedor de equipos hidráulicos para maquinaria')), 256),
    'maquinaria_pesada',
    'b2b',
    'alta',
    'pendiente',
    'linea_industrial',
    'Nueva keyword B2B orientada a maquinaria'
),
(
    'servicio de reparación de autoelevadores',
    SHA2(LOWER(TRIM('servicio de reparación de autoelevadores')), 256),
    'equipamiento_industrial',
    'b2b',
    'media',
    'pendiente',
    'linea_industrial',
    'Nueva keyword B2B de servicio técnico'
),
(
    'alquiler de autoelevadores para empresas',
    SHA2(LOWER(TRIM('alquiler de autoelevadores para empresas')), 256),
    'equipamiento_industrial',
    'b2b',
    'media',
    'pendiente',
    'linea_industrial',
    'Nueva keyword B2B de alquiler de equipamiento'
),
(
    'proveedor de racks industriales para depósitos',
    SHA2(LOWER(TRIM('proveedor de racks industriales para depósitos')), 256),
    'equipamiento_industrial',
    'b2b',
    'media',
    'pendiente',
    'linea_industrial',
    'Nueva keyword B2B orientada a depósitos'
),
(
    'instalación de sistemas contra incendio para industrias',
    SHA2(LOWER(TRIM('instalación de sistemas contra incendio para industrias')), 256),
    'seguridad_industrial',
    'b2b',
    'alta',
    'pendiente',
    'linea_industrial',
    'Nueva keyword B2B de seguridad industrial'
),
(
    'proveedor de insumos para perforación minera',
    SHA2(LOWER(TRIM('proveedor de insumos para perforación minera')), 256),
    'mineria',
    'b2b',
    'alta',
    'pendiente',
    'linea_industrial',
    'Nueva keyword B2B orientada a minería'
),
(
    'transporte de cargas industriales sobredimensionadas',
    SHA2(LOWER(TRIM('transporte de cargas industriales sobredimensionadas')), 256),
    'logistica_industrial',
    'b2b',
    'alta',
    'pendiente',
    'linea_industrial',
    'Nueva keyword B2B de logística industrial'
),
(
    'servicio de izaje con grúas para obras industriales',
    SHA2(LOWER(TRIM('servicio de izaje con grúas para obras industriales')), 256),
    'logistica_industrial',
    'b2b',
    'alta',
    'pendiente',
    'linea_industrial',
    'Nueva keyword B2B de servicios industriales'
),
(
    'proveedor de bombas sumergibles para minería',
    SHA2(LOWER(TRIM('proveedor de bombas sumergibles para minería')), 256),
    'mineria',
    'b2b',
    'alta',
    'pendiente',
    'linea_industrial',
    'Nueva keyword B2B orientada a minería'
),
(
    'compra de mangueras hidráulicas industriales',
    SHA2(LOWER(TRIM('compra de mangueras hidráulicas industriales')), 256),
    'industria',
    'b2b',
    'media',
    'pendiente',
    'linea_industrial',
    'Nueva keyword industrial B2B'
),
(
    'servicio de mantenimiento para plantas de tratamiento de agua',
    SHA2(LOWER(TRIM('servicio de mantenimiento para plantas de tratamiento de agua')), 256),
    'tratamiento_agua',
    'b2b',
    'media',
    'pendiente',
    'linea_industrial',
    'Nueva keyword B2B de mantenimiento técnico'
),
(
    'proveedor de filtros industriales por mayor',
    SHA2(LOWER(TRIM('proveedor de filtros industriales por mayor')), 256),
    'industria',
    'b2b',
    'media',
    'pendiente',
    'linea_industrial',
    'Nueva keyword industrial B2B'
),
(
    'proveedor de rodamientos industriales por mayor',
    SHA2(LOWER(TRIM('proveedor de rodamientos industriales por mayor')), 256),
    'industria',
    'b2b',
    'media',
    'pendiente',
    'linea_industrial',
    'Reemplazo de keyword informática descartada'
),
(
    'reparación de motores eléctricos industriales',
    SHA2(LOWER(TRIM('reparación de motores eléctricos industriales')), 256),
    'mantenimiento',
    'b2b',
    'media',
    'pendiente',
    'linea_industrial',
    'Reemplazo de keyword CRM/software descartada'
),
(
    'proveedor de correas transportadoras industriales',
    SHA2(LOWER(TRIM('proveedor de correas transportadoras industriales')), 256),
    'industria',
    'b2b',
    'alta',
    'pendiente',
    'linea_industrial',
    'Reemplazo de keyword competidora de generación de leads'
);
