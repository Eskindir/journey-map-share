// Taxi marker icon used for the driver's current/last-known location.
// Encoded as a data URI so it can be consumed synchronously by
// @react-google-maps/api's Marker icon.url prop with no extra HTTP request.
const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="40" height="48" viewBox="0 0 40 48">
  <defs>
    <filter id="s" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="1" stdDeviation="1.2" flood-opacity="0.35"/>
    </filter>
  </defs>
  <!-- Pin body -->
  <path filter="url(#s)"
        d="M20 2C11.2 2 4 9.2 4 18c0 11.5 16 28 16 28s16-16.5 16-28c0-8.8-7.2-16-16-16z"
        fill="#F5B400" stroke="#1A1A1A" stroke-width="1.5"/>
  <!-- Inner white disc -->
  <circle cx="20" cy="18" r="11" fill="#FFFFFF"/>
  <!-- Taxi checker bar -->
  <rect x="9" y="12" width="22" height="2.2" fill="#1A1A1A"/>
  <rect x="11" y="12" width="2" height="2.2" fill="#F5B400"/>
  <rect x="15" y="12" width="2" height="2.2" fill="#F5B400"/>
  <rect x="19" y="12" width="2" height="2.2" fill="#F5B400"/>
  <rect x="23" y="12" width="2" height="2.2" fill="#F5B400"/>
  <rect x="27" y="12" width="2" height="2.2" fill="#F5B400"/>
  <!-- Car silhouette -->
  <path d="M10 22 L12 17 H28 L30 22 V25 H10 Z" fill="#1A1A1A"/>
  <circle cx="14" cy="25" r="1.8" fill="#1A1A1A" stroke="#FFFFFF" stroke-width="0.6"/>
  <circle cx="26" cy="25" r="1.8" fill="#1A1A1A" stroke="#FFFFFF" stroke-width="0.6"/>
  <!-- Windshield -->
  <path d="M13 17 L15 13 H25 L27 17 Z" fill="#7EC8E3" opacity="0.8"/>
</svg>
`.trim();

export const TAXI_MARKER_ICON = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;

// Rotatable top-down vehicle silhouette for use with google.maps.Marker.icon
// as a Symbol. The path is centered at (0,0) and drawn with the nose pointing
// north (rotation 0°), so passing a bearing in degrees to `rotation` aligns
// the car with its direction of travel.
//
// The path is intentionally a single closed shape because google.maps.Symbol
// only supports one path. A factory is exported (not a const Symbol) because
// the `anchor` field needs `new google.maps.Point(...)`, which requires the
// Maps JS API to be loaded first.
const TAXI_SYMBOL_PATH =
  'M 0 -14 L 8 -6 L 8 12 L -8 12 L -8 -6 Z';

export function buildTaxiMarkerSymbol(rotation: number): google.maps.Symbol {
  return {
    path: TAXI_SYMBOL_PATH,
    fillColor: '#F5B400',
    fillOpacity: 1,
    strokeColor: '#1A1A1A',
    strokeWeight: 1.5,
    scale: 1.2,
    rotation,
    anchor: new google.maps.Point(0, 0),
  };
}
