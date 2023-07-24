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
import type { Meta, StoryObj } from '@storybook/react';

/**
 * Internal dependencies.
 */
import CookieDetails from '.';
import type { CookieData } from '../../../../../../localStore';

const meta = {
  title: 'Extension/CookiesPanel/CookieDetails',
  component: CookieDetails,
  tags: ['autodocs'],
} as Meta<typeof CookieDetails>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: {
    cookieData: {
      parsedCookie: {
        name: 'test',
        value: 'test',
      },
      analytics: {
        description: 'A description of the cookie',
      },
    } as CookieData,
  },
};

export const Secondary: Story = {
  args: {
    cookieData: undefined,
  },
};
