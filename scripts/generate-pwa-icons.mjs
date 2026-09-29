import { readFileSync, mkdirSync, writeFileSync } from "node:fs"
import { deflateSync, inflateSync } from "node:zlib"

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])

function crc32(buffer) {
  let crc = 0xffffffff
  for (const byte of buffer) {
    crc ^= byte
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1))
    }
  }
  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const typeBuffer = Buffer.from(type)
  const result = Buffer.alloc(data.length + 12)
  result.writeUInt32BE(data.length, 0)
  typeBuffer.copy(result, 4)
  data.copy(result, 8)
  result.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), data.length + 8)
  return result
}

function decodeRgbPng(file) {
  const png = readFileSync(file)
  if (!png.subarray(0, 8).equals(PNG_SIGNATURE)) throw new Error("El icono no es un PNG válido")

  let offset = 8
  let width
  let height
  const compressedParts = []

  while (offset < png.length) {
    const length = png.readUInt32BE(offset)
    const type = png.toString("ascii", offset + 4, offset + 8)
    const data = png.subarray(offset + 8, offset + 8 + length)
    if (type === "IHDR") {
      width = data.readUInt32BE(0)
      height = data.readUInt32BE(4)
      if (data[8] !== 8 || data[9] !== 2 || data[12] !== 0) {
        throw new Error("Se esperaba un PNG RGB de 8 bits no entrelazado")
      }
    } else if (type === "IDAT") {
      compressedParts.push(data)
    }
    offset += length + 12
  }

  const bytesPerPixel = 3
  const stride = width * bytesPerPixel
  const filtered = inflateSync(Buffer.concat(compressedParts))
  const pixels = Buffer.alloc(width * height * bytesPerPixel)

  for (let y = 0; y < height; y += 1) {
    const rowStart = y * (stride + 1)
    const filter = filtered[rowStart]
    for (let x = 0; x < stride; x += 1) {
      const raw = filtered[rowStart + x + 1]
      const left = x >= bytesPerPixel ? pixels[y * stride + x - bytesPerPixel] : 0
      const above = y > 0 ? pixels[(y - 1) * stride + x] : 0
      const upperLeft = y > 0 && x >= bytesPerPixel
        ? pixels[(y - 1) * stride + x - bytesPerPixel]
        : 0
      let value = raw
      if (filter === 1) value += left
      if (filter === 2) value += above
      if (filter === 3) value += Math.floor((left + above) / 2)
      if (filter === 4) {
        const prediction = left + above - upperLeft
        const leftDistance = Math.abs(prediction - left)
        const aboveDistance = Math.abs(prediction - above)
        const diagonalDistance = Math.abs(prediction - upperLeft)
        value += leftDistance <= aboveDistance && leftDistance <= diagonalDistance
          ? left
          : aboveDistance <= diagonalDistance ? above : upperLeft
      }
      pixels[y * stride + x] = value & 0xff
    }
  }

  return { width, height, pixels }
}

function resize(source, size, contentSize = size) {
  const output = Buffer.alloc(size * size * 3)
  const background = source.pixels.subarray(0, 3)
  for (let index = 0; index < output.length; index += 3) background.copy(output, index)

  const inset = Math.floor((size - contentSize) / 2)
  for (let y = 0; y < contentSize; y += 1) {
    const sourceY = Math.max(0, Math.min(source.height - 1, ((y + 0.5) * source.height) / contentSize - 0.5))
    const y0 = Math.floor(sourceY)
    const y1 = Math.min(source.height - 1, y0 + 1)
    const yWeight = sourceY - y0
    for (let x = 0; x < contentSize; x += 1) {
      const sourceX = Math.max(0, Math.min(source.width - 1, ((x + 0.5) * source.width) / contentSize - 0.5))
      const x0 = Math.floor(sourceX)
      const x1 = Math.min(source.width - 1, x0 + 1)
      const xWeight = sourceX - x0
      const outputOffset = ((y + inset) * size + x + inset) * 3
      for (let channel = 0; channel < 3; channel += 1) {
        const topLeft = source.pixels[(y0 * source.width + x0) * 3 + channel]
        const topRight = source.pixels[(y0 * source.width + x1) * 3 + channel]
        const bottomLeft = source.pixels[(y1 * source.width + x0) * 3 + channel]
        const bottomRight = source.pixels[(y1 * source.width + x1) * 3 + channel]
        const top = topLeft + (topRight - topLeft) * xWeight
        const bottom = bottomLeft + (bottomRight - bottomLeft) * xWeight
        output[outputOffset + channel] = Math.round(top + (bottom - top) * yWeight)
      }
    }
  }
  return output
}

function encodeRgbPng(width, height, pixels) {
  const stride = width * 3
  const raw = Buffer.alloc((stride + 1) * height)
  for (let y = 0; y < height; y += 1) {
    raw[y * (stride + 1)] = 0
    pixels.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride)
  }

  const header = Buffer.alloc(13)
  header.writeUInt32BE(width, 0)
  header.writeUInt32BE(height, 4)
  header[8] = 8
  header[9] = 2

  return Buffer.concat([
    PNG_SIGNATURE,
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ])
}

const source = decodeRgbPng(new URL("../public/favicon.png", import.meta.url))
const outputDirectory = new URL("../public/icons/", import.meta.url)
mkdirSync(outputDirectory, { recursive: true })

for (const [name, size, contentSize] of [
  ["apple-touch-icon.png", 180, 180],
  ["icon-192.png", 192, 192],
  ["icon-512.png", 512, 512],
  ["icon-maskable-512.png", 512, 384],
]) {
  const pixels = resize(source, size, contentSize)
  writeFileSync(new URL(name, outputDirectory), encodeRgbPng(size, size, pixels))
}
