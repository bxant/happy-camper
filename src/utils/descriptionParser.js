/**
 * Parses trail mentions from a Recreation.gov FacilityDescription HTML string.
 * Looks for patterns like "Trail Name (X miles)" or "Trail Name (X mile)"
 */
export function parseTrailsFromDescription(htmlDescription) {
  if (!htmlDescription || typeof htmlDescription !== 'string') return [];

  const plainText = htmlDescription.replace(/<[^>]*>/g, ' ');
  const trails = [];

  const trailPattern = /([A-Z][A-Za-z\s\-']+?)\s*\((\d+(?:\.\d+)?)\s*miles?\)/g;

  const fillerPhrases = [
    /^.*\binclude\s+/i,
    /^.*\bincluding\s+/i,
    /^.*\baccess\s+to\s+/i,
    /^.*\bsuch\s+as\s+/i,
    /^.*\bare\s+/i,
  ];

  let match;
  while ((match = trailPattern.exec(plainText)) !== null) {
    let name = match[1].trim();
    const distance = parseFloat(match[2]);

    for (const filler of fillerPhrases) {
      name = name.replace(filler, '');
    }

    name = name.trim();
    if (name.length < 3 || name.length > 60) continue;
    if (trails.some(t => t.name === name)) continue;

    trails.push({
      name,
      distanceMiles: distance,
      source: 'facility_description'
    });
  }

  return trails;
}

export function hasOffroadWarning(facilityDescription, facilityDirections) {
  const combined = `${facilityDescription || ''} ${facilityDirections || ''}`.toLowerCase();

  const offroadKeywords = [
    '4wd', '4x4', 'four-wheel', 'four wheel', 'high clearance',
    'unpaved', 'dirt road', 'gravel road', 'offroad', 'off-road',
    'awd required', 'rugged road', 'rough road', 'primitive road',
    'not recommended for passenger', 'low clearance not'
  ];

  return offroadKeywords.some(keyword => combined.includes(keyword));
}