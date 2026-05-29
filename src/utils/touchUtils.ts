/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

let globalLastTouchTime = 0;

/**
 * Eliminates 300ms latency on older browsers / WebViews (like Android 5.0)
 * and bridges the touch experiences seamlessly on Windows tablets.
 * It prevents double execution by filtering out synthesized mouse click events.
 */
export function bindTouchTap(callback: (e: any) => void) {
  let touchMoved = false;

  return {
    onTouchStart: () => {
      touchMoved = false;
    },
    onTouchMove: () => {
      touchMoved = true;
    },
    onTouchEnd: (e: React.TouchEvent) => {
      if (!touchMoved) {
        globalLastTouchTime = Date.now();
        // Prevent default triggers to stifle the browser's 300ms virtual transition delay
        if (e.cancelable) {
          e.preventDefault();
        }
        e.stopPropagation();
        callback(e);
      }
    },
    onClick: (e: React.MouseEvent) => {
      // Ignore simulated mouse clicks that follow right after a real touch tap
      if (Date.now() - globalLastTouchTime < 800) {
        return;
      }
      if (e.button === 0) {
        e.stopPropagation();
        callback(e);
      }
    }
  };
}
