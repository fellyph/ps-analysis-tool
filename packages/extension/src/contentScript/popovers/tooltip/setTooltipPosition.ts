/*
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * Sets the position of a tooltip element based on various conditions.
 * @param {HTMLElement} tooltip - The tooltip element.
 * @param {HTMLElement} frame - The target f element.
 * @param {boolean} isHiddenFrame - Indicates if the frame is hidden.
 * @param {string | undefined} selectedFrame - The selected frame's origin.
 * @returns {void}
 */
const setTooltipPosition = (
  tooltip: HTMLElement | null,
  frame: HTMLElement | null,
  isHiddenFrame: boolean,
  selectedFrame: string | undefined
) => {
  if (!tooltip) {
    return;
  }

  const {
    x: frameX,
    y: frameY,
    width: frameWidth,
  } = frame ? frame.getBoundingClientRect() : { x: -1, y: -1, width: -1 };

  tooltip.style.maxWidth = frameWidth - 40 + 'px';
  tooltip.style.top = frameY + Number(window.scrollY) + 'px';
  tooltip.style.left = frameX + Number(window.scrollX) + 'px';

  if (!frame) {
    tooltip.classList.add('ps-fixed');
    tooltip.style.top = `0`;
    tooltip.style.left = 'auto';
    tooltip.style.right = '30px';
    tooltip.firstElementChild?.classList.add('ps-tooltip-top-left-notch');

    return;
  }
  // Overlay will not exist for hidden elements. show at bottom of screen.
  if (isHiddenFrame) {
    tooltip.classList.add('ps-fixed');
    tooltip.style.top = `0`;
    tooltip.style.left = 'auto';
    tooltip.style.right = '30px';
    tooltip.firstElementChild?.classList.add('ps-tooltip-top-left-notch');

    return;
  }

  if (document.location.origin === selectedFrame) {
    tooltip.style.top = '5px';
    tooltip.classList.add('ps-fixed');
    tooltip.firstElementChild?.classList.add('ps-tooltip-top-left-notch');

    return;
  }

  // If tooltop position is on top check space on top
  if (frameY > tooltip.offsetHeight && frameY - tooltip.offsetHeight >= 1) {
    /**
     * 2 conditions will be checked
     * 1) If space is available on left and space is not available on right, show on left.
     * 2) If space is available on right and not on left, show on right.
     * 3) If above 2 conditions dont work show on left and reduce the width.
     */
    // eslint-disable-next-line prettier/prettier
    if (frameX + tooltip.offsetWidth > window.innerWidth && frameX - tooltip.offsetWidth > 0) {
      tooltip.style.left = `${frameX - tooltip.offsetWidth}px`;
      tooltip.style.top = `${
        frameY - tooltip.offsetHeight + Number(window.scrollY)
      }px`;
      tooltip.firstElementChild?.classList.remove(
        'ps-tooltip-top-right-notch',
        'ps-tooltip-top-left-notch',
        'ps-tooltip-bottom-left-notch',
        'ps-tooltip-bottom-right-notch'
      );
      tooltip.firstElementChild?.classList.add('ps-tooltip-bottom-right-notch');
      return;
      // eslint-disable-next-line prettier/prettier
    } else if (frameX + tooltip.offsetWidth < window.innerWidth && frameX - tooltip.offsetWidth < 0) {

      tooltip.style.left = frameX + Number(window.scrollX) + 'px';
      tooltip.style.right = `unset`;
      tooltip.style.top = `${
        frameY - tooltip.offsetHeight + Number(window.scrollY)
      }px`;
      tooltip.firstElementChild?.classList.remove(
        'ps-tooltip-top-right-notch',
        'ps-tooltip-top-left-notch',
        'ps-tooltip-bottom-left-notch',
        'ps-tooltip-bottom-right-notch'
      );
      tooltip.firstElementChild?.classList.add('ps-tooltip-bottom-left-notch');
      return;
    } else {
      const leftOverWidth = tooltip.offsetWidth - (window.innerWidth - frameX);
      tooltip.style.left =
        frameX < 0 ? '0px' : frameX + Number(window.scrollX) + 'px';
      tooltip.style.maxWidth = frameWidth - leftOverWidth + 'px';
      tooltip.style.top = `${
        frameY - tooltip.offsetHeight + Number(window.scrollY)
      }px`;
      tooltip.firstElementChild?.classList.remove(
        'ps-tooltip-top-right-notch',
        'ps-tooltip-top-left-notch',
        'ps-tooltip-bottom-left-notch',
        'ps-tooltip-bottom-right-notch'
      );
      tooltip.firstElementChild?.classList.add('ps-tooltip-bottom-left-notch');
      return;
    }
  }

  //check for space at bottom of frame
  if (frameY + tooltip.offsetHeight < window.innerHeight) {
    /**
     * 2 conditions will be checked
     * 1) If space is available on left and space is not available on right, show on left.
     * 2) If space is available on right and not on left, show on right.
     * 3) If above 2 conditions dont work show on left and reduce the width.
     */
    // eslint-disable-next-line prettier/prettier
    if (frameX + frameWidth - window.innerWidth > 0 && frameX + tooltip.offsetWidth > window.innerWidth) {
      tooltip.style.left = `unset`;
      tooltip.style.right = `${frameX + frameWidth}px`;
      tooltip.style.top = `${
        frameY + frame.offsetHeight + Number(window.scrollY)
      }px`;
      tooltip.firstElementChild?.classList.remove(
        'ps-tooltip-top-right-notch',
        'ps-tooltip-top-left-notch',
        'ps-tooltip-bottom-left-notch',
        'ps-tooltip-bottom-right-notch'
      );
      tooltip.firstElementChild?.classList.add('ps-tooltip-top-right-notch');
      return;
      // eslint-disable-next-line prettier/prettier
    } else if (frameX + frameWidth - window.innerWidth < 0 && frameX + tooltip.offsetWidth < window.innerWidth) {
      tooltip.style.left = frameX + Number(window.scrollX) + 'px';
      tooltip.style.right = `unset`;
      tooltip.style.top = `${
        frameY + frame.offsetHeight + Number(window.scrollY)
      }px`;
      tooltip.firstElementChild?.classList.remove(
        'ps-tooltip-top-right-notch',
        'ps-tooltip-top-left-notch',
        'ps-tooltip-bottom-left-notch',
        'ps-tooltip-bottom-right-notch'
      );
      tooltip.firstElementChild?.classList.add('ps-tooltip-top-left-notch');
      return;
    } else {
      const leftOverWidth = tooltip.offsetWidth - (window.innerWidth - frameX);
      tooltip.style.left =
        frameX < 0 ? '0px' : frameX + Number(window.scrollX) + 'px';
      tooltip.style.maxWidth = frameWidth - leftOverWidth + 'px';
      tooltip.style.top = `${
        frameY + frame.offsetHeight + Number(window.scrollY)
      }px`;
      tooltip.firstElementChild?.classList.remove(
        'ps-tooltip-top-right-notch',
        'ps-tooltip-top-left-notch',
        'ps-tooltip-bottom-left-notch',
        'ps-tooltip-bottom-right-notch'
      );
      tooltip.firstElementChild?.classList.add('ps-tooltip-top-left-notch');
      return;
    }
  }

  tooltip.style.top = frameY + 'px';
};

export default setTooltipPosition;
