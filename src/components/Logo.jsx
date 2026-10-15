import { useState } from 'react';
import { avatarUrl } from '../lib/format.js';

/** Logo do serviço (icon.horse) com fallback para avatar com iniciais, sem loop de erro. */
export default function Logo({ domain, name, className }) {
  const [failedFor, setFailedFor] = useState(null);
  const failed = !domain || failedFor === domain;
  const src = failed ? avatarUrl(name) : `https://icon.horse/icon/${encodeURIComponent(domain)}`;
  return (
    <img
      src={src}
      alt=""
      className={className}
      loading="lazy"
      onError={() => {
        if (!failed) setFailedFor(domain);
      }}
    />
  );
}
