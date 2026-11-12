export type PointCoordinates = { latitude: number; longitude: number };

export function toPostgisPointWkt({ latitude, longitude }: PointCoordinates): string {
  return `SRID=4326;POINT(${longitude} ${latitude})`;
}

/** Decode PostGIS geography output formats observed through the Supabase API. */
export function readPostgisPoint(value: unknown): PointCoordinates | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") throw new Error("Location could not be read.");

  const wkt = /^(?:SRID=4326;)?POINT\(\s*(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s*\)$/i.exec(value);
  if (wkt) {
    const longitude = Number(wkt[1]);
    const latitude = Number(wkt[2]);
    if (isValidCoordinates(latitude, longitude)) return { latitude, longitude };
    throw new Error("Location coordinates are outside geographic bounds.");
  }

  const hex = value.startsWith("\\x") ? value.slice(2) : value;
  if (!/^[0-9a-f]+$/i.test(hex) || hex.length < 50) throw new Error("Location could not be read.");
  const bytes = Buffer.from(hex, "hex");
  const littleEndian = bytes[0] === 1;
  if (!littleEndian && bytes[0] !== 0) throw new Error("Location could not be read.");
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const type = view.getUint32(1, littleEndian);
  const hasSrid = (type & 0x20000000) !== 0;
  const baseType = type & 0x0fffffff;
  const coordinateOffset = hasSrid ? 9 : 5;
  if (baseType !== 1 || bytes.length < coordinateOffset + 16) throw new Error("Location could not be read.");
  if (hasSrid && view.getUint32(5, littleEndian) !== 4326) throw new Error("Location uses an unsupported coordinate system.");
  const longitude = view.getFloat64(coordinateOffset, littleEndian);
  const latitude = view.getFloat64(coordinateOffset + 8, littleEndian);
  if (!isValidCoordinates(latitude, longitude)) throw new Error("Location coordinates are outside geographic bounds.");
  return { latitude, longitude };
}

function isValidCoordinates(latitude: number, longitude: number): boolean {
  return Number.isFinite(latitude) && Number.isFinite(longitude)
    && latitude >= -90 && latitude <= 90
    && longitude >= -180 && longitude <= 180;
}
