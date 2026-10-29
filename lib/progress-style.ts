import type {CSSProperties} from 'react';

/** Keep the gradient anchored to the whole track, rather than stretching it into each fill. */
export function progressFillStyle(progress:number):CSSProperties {
  const fraction=Number.isFinite(progress)?Math.max(0,Math.min(1,progress)):0;
  return {
    width:`${fraction*100}%`,
    backgroundSize:`${fraction>0?100/fraction:100}% 100%`,
    backgroundPosition:'left center',
    backgroundRepeat:'no-repeat',
  };
}
