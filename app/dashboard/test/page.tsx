'use client';

import { useEffect } from 'react';

export default function StrictModeCheck() {
  console.log('render');

  useEffect(() => {
    console.log('effect');
  }, []);

  return <div>Check console</div>;
}

