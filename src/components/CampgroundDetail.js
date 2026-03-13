import { useState } from 'react';

const BOILERPLATE_CUTOFFS = [
  'Charges & Cancellations',
  'Reservation Policies',
  'Change and Cancellation',
  'Recreation.gov Billing',
  'Booking Window',
];

const SECTION_HEADERS = [
  'Overview',
  'Recreation',
  'Facilities',
  'Natural Features',
  'Nearby Attractions',
];

function stripHtml(html) {
  if (!html) return null;
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function cutBoilerplate(text) {
  if (!text) return text;
  let cutIndex = text.length;
  for (const cutoff of BOILERPLATE_CUTOFFS) {
    const index = text.indexOf(cutoff);
    if (index !== -1 && index < cutIndex) {
      cutIndex = index;
    }
  }
  return text.substring(0, cutIndex).trim();
}

function parseSections(html) {
  if (!html) return [];

  const sections = [];

  for (let i = 0; i < SECTION_HEADERS.length; i++) {
    const header = SECTION_HEADERS[i];
    const nextHeader = SECTION_HEADERS[i + 1];

    const startTag = `<h2>${header}</h2>`;
    const startIndex = html.indexOf(startTag);
    if (startIndex === -1) continue;

    const contentStart = startIndex + startTag.length;

    let contentEnd = html.length;
    if (nextHeader) {
      const nextIndex = html.indexOf(`<h2>${nextHeader}</h2>`);
      if (nextIndex !== -1) contentEnd = nextIndex;
    }

    const rawContent = html.substring(contentStart, contentEnd);
    const cleanContent = cutBoilerplate(stripHtml(rawContent));

    if (cleanContent && cleanContent.length > 0) {
      sections.push({ header, content: cleanContent });
    }
  }

  if (sections.length === 0) {
    const fallback = cutBoilerplate(stripHtml(html));
    if (fallback) sections.push({ header: 'About', content: fallback });
  }

  return sections;
}

export default function CampgroundDetail({ campground, npsAlerts }) {
  if (!campground) return null;

  const sections = parseSections(campground.FacilityDescription);
  const directions = stripHtml(campground.FacilityDirections);

  return (
    <div style={{ marginTop: '16px', marginBottom: '24px', borderTop: '2px solid #ccc', paddingTop: '16px' }}>
      <h2>{campground.FacilityName}</h2>

      {npsAlerts && npsAlerts.length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          <h4 style={{ color: '#cc0000', marginBottom: '8px' }}>⚠️ Active Alerts</h4>
          {npsAlerts.map((alert, index) => (
            <div
              key={index}
              style={{
                backgroundColor: '#fff3f3',
                border: '1px solid #ffaaaa',
                borderRadius: '4px',
                padding: '8px 12px',
                marginBottom: '8px',
                fontSize: '0.9em',
              }}
            >
              <strong>{alert.title}</strong>
              {alert.description && (
                <p style={{ margin: '4px 0 0 0', color: '#555' }}>{alert.description}</p>
              )}
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
        {campground.FacilityAdaAccess === 'Y' && (
          <div style={tagStyle}>♿ ADA Accessible</div>
        )}
        {campground.StayLimit && (
          <div style={tagStyle}>🗓️ Stay limit: {campground.StayLimit}</div>
        )}
        {campground.FacilityPhone && (
          <div style={tagStyle}>📞 {campground.FacilityPhone}</div>
        )}
        {campground.FacilityID && (
          <a
            href={`https://www.recreation.gov/camping/campgrounds/${campground.FacilityID}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              ...tagStyle,
              textDecoration: 'none',
              color: '#1a6b3a',
              backgroundColor: '#e8f4e8',
              border: '1px solid #a8d5a8',
            }}
          >
            🏕️ View on Recreation.gov
          </a>
        )}
      </div>

      {sections.map((section, index) => (
        <CollapsibleSection
          key={section.header}
          header={section.header}
          content={section.content}
          defaultOpen={index === 0}
        />
      ))}

      {directions && (
        <CollapsibleSection
          header="Directions"
          content={directions}
          defaultOpen={false}
        />
      )}
    </div>
  );
}

function CollapsibleSection({ header, content, defaultOpen }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div style={{ marginBottom: '12px', borderBottom: '1px solid #eee', paddingBottom: '12px' }}>
      <div
        onClick={() => setIsOpen(prev => !prev)}
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: 'pointer',
          userSelect: 'none',
        }}
      >
        <h4 style={{ margin: 0 }}>{header}</h4>
        <span style={{ fontSize: '0.9em', color: '#888' }}>{isOpen ? '▲' : '▼'}</span>
      </div>
      {isOpen && (
        <p style={{ fontSize: '0.9em', color: '#333', lineHeight: '1.6', marginTop: '8px' }}>
          {content}
        </p>
      )}
    </div>
  );
}

const tagStyle = {
  backgroundColor: '#f0f0f0',
  border: '1px solid #ddd',
  borderRadius: '20px',
  padding: '4px 12px',
  fontSize: '0.85em',
  whiteSpace: 'nowrap',
};