/** Redimensiona a logo no navegador (máx. 600px) e garante ≤ 500 KB. Retorna PNG/JPEG/WebP. */
export async function resizeLogo(file: File, maxSide = 600, maxBytes = 500 * 1024): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
  const w = Math.round(bitmap.width * scale)
  const h = Math.round(bitmap.height * scale)
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, w, h)

  const toBlob = (type: string, q?: number) =>
    new Promise<Blob | null>((res) => canvas.toBlob(res, type, q))

  // PNG preserva transparência (logos). Se passar do limite, cai para JPEG (o PDF não lê WebP)
  // com fundo branco e qualidade decrescente.
  let blob = await toBlob('image/png')
  if (!blob || blob.size > maxBytes) {
    const ctx = canvas.getContext('2d')!
    ctx.globalCompositeOperation = 'destination-over'
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, w, h)
    for (let q = 0.9; (!blob || blob.size > maxBytes) && q > 0.3; q -= 0.15) {
      blob = await toBlob('image/jpeg', q)
    }
  }
  if (!blob || blob.size > maxBytes) throw new Error('Imagem muito grande')
  return blob
}
