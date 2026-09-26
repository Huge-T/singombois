"use client";

import { useState } from "react";

export function StarRatingInput({ name, initial }: { name: string; initial?: number }) {
  const [rating, setRating] = useState(initial ?? 0);
  const [hover, setHover] = useState(0);
  const shown = hover || rating;

  return (
    <div>
      <div role="radiogroup" aria-label="Rating 1 sampai 5 bintang" style={{ display: "flex", gap: 4 }}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={rating === n}
            aria-label={`${n} bintang`}
            onClick={() => setRating(n)}
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 2,
              fontSize: 34,
              lineHeight: 1,
              color: shown >= n ? "var(--singo)" : "var(--garis)",
            }}
          >
            ★
          </button>
        ))}
      </div>
      <input type="hidden" name={name} value={rating} />
    </div>
  );
}
