export const ITV_DOCUMENTOS_BUCKET = "coches-documentacion"
export const ITV_DOCUMENTOS_CARPETA = "ITVs"
export const ITV_DOCUMENTO_MAX_BYTES = 20 * 1024 * 1024

function limpiarSegmento(valor: string) {
  return valor.trim().replace(/[^a-zA-Z0-9_-]/g, "_")
}

export function obtenerRutaDocumentosITV(matricula: string, itvId: number) {
  return `${ITV_DOCUMENTOS_CARPETA}/${limpiarSegmento(matricula)}/${itvId}`
}
