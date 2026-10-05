/** Textos fijos del certificado en español e inglés (misma tabla existe en frontend/src/pages/Certificados/textosCertificado.js). */
const T = {
  tituloCert: { es: "CERTIFICADO DE CALIBRACIÓN", en: "CALIBRATION CERTIFICATE" },
  subtituloCert: { es: "Calibration Certificate", en: "Certificado de calibración" },
  acreditacion: { es: "Acreditación", en: "Accreditation" },
  vistaPrevia: { es: "VISTA PREVIA — sin folio ni QR hasta que Calidad autorice y se emita el certificado", en: "PREVIEW — no folio or QR until Quality authorizes and the certificate is issued" },

  secCliente: { es: "Datos del cliente", en: "Customer Information" },
  secEquipo: { es: "Datos del equipo", en: "Equipment Information" },
  secCalibracion: { es: "Datos de la calibración", en: "Calibration Information" },
  secPatrones: { es: "Patrones utilizados", en: "Instrument Used" },
  secObservaciones: { es: "Observaciones", en: "Remarks" },
  secCreditos: { es: "Créditos", en: "Credits" },

  cliente: { es: "Cliente:", en: "Company Name:" },
  direccion: { es: "Dirección:", en: "Address:" },
  descripcion: { es: "Descripción:", en: "Description:" },
  idInstrumento: { es: "ID del instrumento:", en: "Instrument ID:" },
  serie: { es: "No. de serie:", en: "Serial No.:" },
  unidades: { es: "Unidades:", en: "Units:" },
  fabricante: { es: "Fabricante:", en: "Manufacturer:" },
  alcance: { es: "Alcance:", en: "Range:" },
  modelo: { es: "Modelo:", en: "Model:" },
  resolucion: { es: "Resolución:", en: "Resolution:" },
  ubicacion: { es: "Ubicación:", en: "Location:" },
  rangoCal: { es: "Rango calibrado:", en: "Range Cal.:" },
  reporteServicio: { es: "Reporte de servicio:", en: "Service Report:" },
  rangoUso: { es: "Rango de uso:", en: "Range Used:" },
  motivo: { es: "Motivo del servicio:", en: "Reason of Service:" },
  procedimiento: { es: "Procedimiento:", en: "Procedure:" },
  tipoServicio: { es: "Tipo de servicio:", en: "Type of Service:" },
  fechaIngreso: { es: "Fecha de ingreso:", en: "Receipt Date:" },
  fechaCalibracion: { es: "Fecha de calibración:", en: "Calibration Date:" },
  fechaLiberacion: { es: "Fecha de liberación:", en: "Release Date:" },
  fechaVencimiento: { es: "Vencimiento del certificado:", en: "Certificate Due Date:" },
  comoSeEncontro: { es: "Como se encontró:", en: "As Found:" },
  comoSeDejo: { es: "Como se dejó:", en: "As Left:" },
  temperatura: { es: "Temperatura:", en: "Temperature:" },
  humedad: { es: "Humedad:", en: "Humidity:" },
  informeCal: { es: "Informe de calibración:", en: "Calibration Report:" },
  comentarios: { es: "Comentarios:", en: "Comments:" },
  dentroTol: { es: "Dentro de Tolerancia", en: "In Tolerance" },
  fueraTol: { es: "Fuera de Tolerancia", en: "Out of Tolerance" },

  thIdPatron: { es: "ID del patrón", en: "Instrument ID No." },
  thTrazable: { es: "No. certificado (trazable)", en: "NIST Traceable #" },
  thDescripcion: { es: "Descripción", en: "Description" },
  thModelo: { es: "Modelo", en: "Model#" },
  thVencePatron: { es: "Vencimiento cal.", en: "Cal Due Date" },

  remarksDefault: {
    es: "El/los instrumento(s) listados en este certificado fueron calibrados contra patrones trazables al N.I.S.T. (National Institute of Standards and Technology) derivados de mediciones tipo razón, o comparados con patrones nacionales o internacionales de consenso reconocido. Se mantuvo una razón de incertidumbre de calibración de 4:1 y un factor de cobertura K=2 con un nivel de confianza del 95 %, salvo que se indique lo contrario. El sistema de calidad de {lab} cumple con los requisitos aplicables de ISO/IEC 17025:2017. Todos los resultados contenidos en este certificado se refieren únicamente al/los elemento(s) calibrado(s). Este informe de calibración no debe reproducirse excepto en su totalidad y con el consentimiento por escrito de {lab}. Regla de decisión: Aceptación simple / Riesgo compartido.",
    en: "The instrument(s) listed in this certification have been calibrated against standards traceable to N.I.S.T. (National Institute of Standards and Technology) derived from ratio type measurements, or compared to national or internationally recognized consensus standards. A calibration uncertainty ratio of 4:1 was maintained and a K=2 coverage factor with a confidence level of 95%, unless otherwise stated. {lab} quality system complies with applicable requirements of ISO/IEC 17025:2017. All results contained within this certification relate only to item(s) calibrated. This calibration report shall not be reproduced except in full and with the written consent of {lab}. Decision rule: Simple acceptance / Shared risk.",
  },

  tituloInforme: { es: "INFORME DE CALIBRACIÓN", en: "CALIBRATION REPORT" },
  subtituloInforme: { es: "Calibration Report", en: "Informe de calibración" },
  instrumento: { es: "INSTRUMENTO:", en: "INSTRUMENT:" },
  alcanceMayus: { es: "ALCANCE:", en: "RANGE:" },
  identificacion: { es: "IDENTIFICACIÓN:", en: "IDENTIFICATION:" },
  resolucionMayus: { es: "RESOLUCIÓN:", en: "RESOLUTION:" },
  sinPuntos: { es: "SIN PUNTOS DE CALIBRACIÓN LIGADOS", en: "NO CALIBRATION POINTS LINKED" },
  grpEncontrado: { es: "COMO SE ENCONTRÓ", en: "AS FOUND" },
  grpDejado: { es: "COMO SE DEJÓ", en: "AS LEFT" },
  grpResultados: { es: "RESULTADOS", en: "RESULTS" },
  grpResultadosCal: { es: "RESULTADOS DE CALIBRACIÓN", en: "CALIBRATION RESULTS" },
  thNominal: { es: "NOMINAL", en: "NOMINAL" },
  thPromedio: { es: "PROMEDIO", en: "AVERAGE" },
  thDesv: { es: "DESVIACIÓN STD", en: "STD DEVIATION" },
  thCriterio: { es: "CRITERIO", en: "CRITERION" },
  thU: { es: "U Expan.", en: "Expanded U" },
  critPasa: { es: "PASÓ", en: "PASS" },
  critNoPasa: { es: "NO PASA", en: "FAIL" },
  tituloGrafica: { es: "DIAGRAMA DE CALIBRACIÓN", en: "CALIBRATION DIAGRAM" },
  puntoNominal: { es: "Punto nominal", en: "Nominal point" },

  elaboro: { es: "Elaboró", en: "Prepared by" },
  aprobTecnica: { es: "Aprobación técnica", en: "Technical Approval" },
  aseguramiento: { es: "Aseguramiento de calidad", en: "Quality Assurance" },
  selloVerif: { es: "SELLO DE VERIFICACIÓN", en: "VERIFICATION SEAL" },
  selloNota: { es: "Escanea para comprobar la autenticidad de este certificado en línea.", en: "Scan to verify the authenticity of this certificate online." },
  pieEmitido: { es: "emitido", en: "issued" },
  pieConfianza: { es: "nivel de confianza", en: "confidence level" },
  pieNotaDefault: {
    es: "método GUM (JCGM 100:2008) — cálculo determinístico. Verificable en línea con el QR del certificado.",
    en: "GUM method (JCGM 100:2008) — deterministic calculation. Verifiable online with the certificate QR.",
  },
};

function idiomaValido(i) {
  return i === "en" ? "en" : "es";
}

/** Devuelve el traductor `t(clave)` del idioma pedido ("es" por defecto). */
function traductor(idioma) {
  const lang = idiomaValido(idioma);
  return (clave) => T[clave]?.[lang] ?? clave;
}

module.exports = { traductor, idiomaValido };
