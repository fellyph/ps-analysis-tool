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
 * Internal dependencies.
 */
import {
  findSelectedFrameElements,
  removeAllPopovers,
  toggleFrameHighlighting,
  addOverlay,
  setOverlayPosition,
  addTooltip,
  setTooltipPosition,
} from './popovers';
import type { ResponseType } from './types';
import { CookieStore } from '../localStore';
import { TOOLTIP_CLASS } from './constants';
import { WEBPAGE_PORT_NAME } from '../constants';
import {
  isElementVisibleInViewport,
  getFrameCount,
  isFrameHidden,
} from './utils';
import './style.css';

/**
 * Represents the webpage's content script functionalities.
 */
class WebpageContentScript {
  /**
   * @property {chrome.runtime.Port | null} port - The connection port.
   */
  port: chrome.runtime.Port | null = null;

  /**
   * @property {boolean} isInspecting - If true, the page is currently being inspected.
   */
  isInspecting = false;

  /**
   * @property {boolean} isHoveringOverPage - If true, the mouse is currently hovering over the page.
   */
  isHoveringOverPage = false;

  /**
   * @property {boolean} bodyHoverStateSent - Keeps track if the hover state message has been sent.
   */
  bodyHoverStateSent = false;

  /**
   * @property {Array<() => void>} scrollEventListeners - Array of scroll event listeners.
   */
  scrollEventListeners: Array<() => void> = [];

  /**
   * @property {HTMLElement} docElement - Document element.
   */
  docElement: HTMLElement;

  /**
   * @property {HTMLElement} hoveredFrame - Frame that is currently being hovered over.
   */
  hoveredFrame: HTMLElement | null = null;

  /**
   * Initialize.
   */
  constructor() {
    this.handleHoverEvent = this.handleHoverEvent.bind(this);
    this.abortInspection = this.abortInspection.bind(this);
    this.onMessage = this.onMessage.bind(this);
    this.onDisconnect = this.onDisconnect.bind(this);
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.docElement = document.documentElement;

    this.listenToConnection();
    this.setTopics();

    // Message once on initialize, to let the devtool know that content script has loaded.
    if (chrome.runtime?.id) {
      chrome.runtime.sendMessage({
        setInPage: true,
      });
    }
  }

  /**
   * Listens for connection requests from devtool.
   */
  listenToConnection() {
    chrome.runtime.onConnect.addListener((port) => {
      if (port.name.startsWith(WEBPAGE_PORT_NAME)) {
        this.port = port;
        port.onMessage.addListener(this.onMessage);
        port.onDisconnect.addListener(this.onDisconnect);
      }
    });
  }

  /**
   * Adds event listeners to the document.
   */
  addEventListeners(): void {
    document.addEventListener('mouseover', this.handleHoverEvent);
    document.addEventListener('mouseout', this.handleHoverEvent);
    document.addEventListener('visibilitychange', this.handleMouseMove);
    this.docElement.addEventListener('mouseleave', this.handleMouseMove);
    this.docElement.addEventListener('mouseenter', this.handleMouseMove);
  }

  /**
   * Removes event listeners from the document.
   */
  removeEventListeners(): void {
    document.removeEventListener('mouseover', this.handleHoverEvent);
    document.removeEventListener('mouseout', this.handleHoverEvent);
    document.removeEventListener('visibilitychange', this.handleMouseMove);
    this.docElement.removeEventListener('mouseleave', this.handleMouseMove);
    this.docElement.removeEventListener('mouseenter', this.handleMouseMove);
  }

  /**
   * Handles incoming messages from the connected port.
   * @param {ResponseType} response - The incoming message/response.
   */
  onMessage(response: ResponseType) {
    this.isInspecting = response.isInspecting;

    if (response.isInspecting) {
      this.removeEventListeners();
      this.addEventListeners();
      toggleFrameHighlighting(true);
      this.insertPopovers(response);
    } else {
      this.abortInspection();
    }
  }

  /**
   * Inserts overlay
   * @param frame Frame
   * @returns {HTMLElement |null} Overlay
   */
  insertOverlay(frame: HTMLElement): HTMLElement | null {
    const overlay = addOverlay(frame);

    const updatePosition = () => {
      if (isElementVisibleInViewport(frame, true)) {
        setOverlayPosition(overlay, frame);
      }
    };

    this.addEventListerOnScroll(updatePosition);

    return overlay;
  }

  /**
   * Insert tooltip.
   * @param {HTMLElement} frame Frame
   * @param {number} numberOfVisibleFrames Number of visible frames.
   * @param {number} numberOfHiddenFrames Number of hidden frames.
   * @param {ResponseType} response Response.
   * @returns {HTMLElement} Tooltip.
   */
  insertTooltip(
    frame: HTMLElement | null,
    numberOfVisibleFrames: number,
    numberOfHiddenFrames: number,
    response: ResponseType
  ): HTMLElement | null {
    const tooltip = addTooltip(
      frame,
      response,
      numberOfVisibleFrames,
      numberOfHiddenFrames
    );

    const isHiddenForFirstTime = frame ? !frame.clientWidth : false;
    setTooltipPosition(
      tooltip,
      frame,
      isHiddenForFirstTime,
      response.selectedFrame
    );

    const updatePosition = () => {
      if (isElementVisibleInViewport(frame, true)) {
        const isHidden = frame ? !frame.clientWidth : false;
        setTooltipPosition(tooltip, frame, isHidden, response.selectedFrame);
      }
    };

    this.addEventListerOnScroll(updatePosition);

    return tooltip;
  }

  /**
   * Add event listener on scroll to update overlay and tooltip positions.
   * @param callback Callback function to update position.
   */
  addEventListerOnScroll(callback: () => void) {
    this.scrollEventListeners.push(callback);
    callback();
    window.addEventListener('scroll', callback);
  }

  /**
   * Remove all popovers.
   */
  removeAllPopovers() {
    if (this.scrollEventListeners.length) {
      this.scrollEventListeners.forEach((listener) => {
        window.removeEventListener('scroll', listener);
      });

      this.scrollEventListeners = [];
    }

    removeAllPopovers();
  }

  /**
   * Handles the port disconnection event.
   */
  onDisconnect() {
    this.port?.onMessage.removeListener(this.onMessage);
    this.port = null;
    this.abortInspection();
  }

  /**
   * Abort inspection and removes all frame popovers and hover event listeners.
   */
  abortInspection(): void {
    this.removeEventListeners();
    removeAllPopovers();
    toggleFrameHighlighting(false);
    this.isInspecting = false;
  }

  /**
   * Insert popovers for all visible frames.
   * @param {HTMLElement[]} frameElements An array of frame elements.
   * @param {number} visibleIFrameCount The number of visible frames.
   * @param {number} hiddenIFrameCount The number of hidden frames.
   * @param {number} response Response.
   * @returns {Record<string, HTMLElement | null>} Popover HTMLElement.
   */
  insertPopoversConditionHandler(
    frameElements: HTMLElement[],
    visibleIFrameCount: number,
    hiddenIFrameCount: number,
    response: ResponseType
  ): Record<string, HTMLElement | null> {
    const popoverElement: Record<string, HTMLElement | null> = {
      frameWithTooltip: null,
      firstToolTip: null,
    };

    // All frames are visible.
    if (0 === hiddenIFrameCount) {
      // Its important to insert overlays and tooltips seperately and in the same order, to avoid z-index issue.
      frameElements.forEach((frame) => {
        this.insertOverlay(frame);
      });

      let iframeForTooltip = this.hoveredFrame
        ? this.hoveredFrame
        : frameElements[0];

      if (!this.hoveredFrame) {
        frameElements.forEach((frame) => {
          if (isElementVisibleInViewport(frame, true)) {
            iframeForTooltip = frame;
            return;
          }
        });
      }
      popoverElement.firstToolTip = this.insertTooltip(
        iframeForTooltip,
        visibleIFrameCount,
        hiddenIFrameCount,
        response
      );

      popoverElement.frameWithTooltip = iframeForTooltip;

      return popoverElement;
    }

    // All frames are hidden.
    if (0 === visibleIFrameCount) {
      const frame = frameElements[0];

      this.insertOverlay(frame);
      this.insertTooltip(
        frame,
        visibleIFrameCount,
        hiddenIFrameCount,
        response
      );

      return popoverElement;
    }

    // Its important to insert overlays and tooltips seperately and in the same order, to avoid z-index issue.
    frameElements.forEach((frame) => {
      if (!isFrameHidden(frame)) {
        this.insertOverlay(frame);
      }
    });

    frameElements.forEach((frame, index) => {
      if (!isFrameHidden(frame)) {
        popoverElement.frameWithTooltip = frame;

        const tooltip = this.insertTooltip(
          frame,
          visibleIFrameCount,
          hiddenIFrameCount,
          response
        );

        if (0 === index) {
          popoverElement.firstToolTip = tooltip;
        }
      }
    });

    return popoverElement;
  }

  /**
   * Insert popovers.
   * @param {ResponseType} response - The incoming message/response from the port.
   */
  insertPopovers(response: ResponseType) {
    // If the no frame was selected in devtool.
    if (response.removeAllFramePopovers && !response.selectedFrame) {
      removeAllPopovers();
      return;
    }

    if (!response.selectedFrame) {
      return;
    }

    const frameElements = findSelectedFrameElements(response.selectedFrame);
    const frameCount = getFrameCount(frameElements);
    const numberOfFrames = frameCount['numberOfFrames'];

    // Remove previous frames.
    this.removeAllPopovers();

    if (!numberOfFrames) {
      this.insertTooltip(null, 0, 0, response);
      return;
    }

    const frameToScrollTo = frameElements[0];
    const visibleIFrameCount = frameCount['numberOfVisibleFrames'];
    const hiddenIFrameCount = frameCount['numberOfHiddenFrames'];

    const popoverElement = this.insertPopoversConditionHandler(
      frameElements,
      visibleIFrameCount,
      hiddenIFrameCount,
      response
    );

    const firstToolTip = popoverElement['firstToolTip'];
    const frameWithTooltip = popoverElement['frameWithTooltip'];

    if (
      firstToolTip &&
      !this.isHoveringOverPage &&
      frameToScrollTo.clientWidth &&
      !isElementVisibleInViewport(frameWithTooltip)
    ) {
      (firstToolTip as HTMLElement).scrollIntoView({
        behavior: 'instant',
        block: 'start',
        inline: 'nearest',
      });
    }
  }

  /**
   * Handles hover events, focusing on IFRAME elements when inspecting is enabled.
   * @param {MouseEvent} event - The mouse event triggered by user action.
   */
  // eslint-disable-next-line complexity
  handleHoverEvent(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    const isNonIframeElement = target.tagName !== 'IFRAME';
    const isTooltipElement =
      target.classList.contains(TOOLTIP_CLASS) ||
      target.classList.contains('ps-tooltip-info-toggle-btn') ||
      target.classList.contains('ps-enable-pointer-event');
    const isHoverableElement =
      target.classList.contains(TOOLTIP_CLASS) ||
      target.classList.contains('ps-hover');

    this.hoveredFrame = null;

    if (isTooltipElement || isHoverableElement) {
      return;
    }

    this.isHoveringOverPage = true;

    if (
      !this.bodyHoverStateSent &&
      this.isInspecting &&
      isNonIframeElement &&
      this.port
    ) {
      removeAllPopovers();

      if (chrome.runtime?.id) {
        this.port.postMessage({
          attributes: {
            iframeOrigin: '',
          },
        });
      }

      this.bodyHoverStateSent = true;
    }

    if (!this.isInspecting || isNonIframeElement) {
      return;
    }

    this.bodyHoverStateSent = false;
    this.hoveredFrame = target;

    const frame = target as HTMLIFrameElement;
    let srcAttribute = frame.getAttribute('src');

    srcAttribute = srcAttribute === 'about:blank' ? '' : srcAttribute;

    if (!srcAttribute) {
      // User is able to hover over it so it is visible,
      // also it doesn't have src so it cannot be realted to other frames.
      const visibleIFrameCount = 1;
      const hiddenIFrameCount = 0;

      this.removeAllPopovers();

      this.insertOverlay(frame);

      this.insertTooltip(frame, visibleIFrameCount, hiddenIFrameCount, {
        isInspecting: true,
      });
    }

    let url: URL | '';

    try {
      url = srcAttribute ? new URL(srcAttribute) : '';
    } catch (error) {
      return;
    }

    if (!this.port) {
      return;
    }

    try {
      if (chrome.runtime?.id) {
        this.port.postMessage({
          attributes: {
            iframeOrigin: url ? url.origin : '',
            isNullSetFromHover: url ? false : true,
          },
        });
      }
    } catch (error) {
      this.abortInspection();
    }
  }

  /**
   * Toggle this.isHoveringOverPage state when mouse or visibility is changed.
   * @param {MouseEvent} event Mouse event.
   */
  handleMouseMove(event: Event) {
    if (event?.type === 'mouseenter') {
      this.isHoveringOverPage = true;
    } else if (event?.type === 'mouseleave') {
      this.isHoveringOverPage = false;
    }

    if (document.hidden) {
      this.isHoveringOverPage = false;
    }
  }

  /**
   * Set topics to be used in the Topics landing page.
   */
  async setTopics() {
    if (
      !document.prerendering &&
      'browsingTopics' in document &&
      document.featurePolicy &&
      document.featurePolicy.allowsFeature('browsing-topics')
    ) {
      const activeTabUrl = window.location.origin;
      const topicsObjArr = await document.browsingTopics();
      const topicsIdArr = topicsObjArr.map(
        (topic: { [key: string]: string | number }) => topic.topic
      );

      CookieStore.setTopics(activeTabUrl, topicsIdArr);
    }
  }
}

// eslint-disable-next-line no-new
new WebpageContentScript();
