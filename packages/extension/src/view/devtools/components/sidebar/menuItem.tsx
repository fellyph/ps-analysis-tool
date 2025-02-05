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
 * External dependencies.
 */
import React from 'react';

/**
 * Internal dependencies.
 */
import TABS from '../../tabs';

interface MenuItemProps {
  handleClick: () => void;
  tabName: string;
  tabId: string;
  isActive: boolean;
}

const MenuItem = ({ handleClick, tabName, tabId, isActive }: MenuItemProps) => {
  const selectedTab = TABS.find((tab) => tab.id === tabId)?.icons;
  const Icon = isActive ? selectedTab?.selected : selectedTab?.default;

  return (
    <div className="flex w-full items-center pl-6 py-0.5" onClick={handleClick}>
      <div className="h-3">{Icon && <Icon />}</div>
      <div className="block">
        <span className="pl-2.5">{tabName}</span>
      </div>
    </div>
  );
};

export default MenuItem;
