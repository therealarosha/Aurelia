import { EVENT_NAME, SCHOOL_NAME } from '../lib/config';

export default function Brand({ compact = false }) {
  return (
    <div className={`brand ${compact ? 'brand-compact' : ''}`}>
      <div className="brand-logos">
        <img
          src={`${import.meta.env.BASE_URL}assets/school-logo.png`}
          alt={`${SCHOOL_NAME} logo`}
          className="school-logo"
        />

        <span className="logo-divider" />

        <img
          src={`${import.meta.env.BASE_URL}assets/grad-logo.png`}
          alt={`${EVENT_NAME} logo`}
          className="grad-logo"
        />
      </div>

      {!compact && (
        <div className="brand-copy">
          <span className="eyebrow">Official Event Access</span>

          <img
            src={`${import.meta.env.BASE_URL}assets/TLogo.png`}
            alt={EVENT_NAME}
            className="title-logo"
          />

          <p>{SCHOOL_NAME}</p>
        </div>
      )}
    </div>
  );
}
