/* eslint-disable regex/invalid */
import { Icon } from '@iconify/vue'
import { h } from 'vue'
import { isIconCached, cacheIcon } from '@/utils/iconCache'
import checkboxChecked from '@images/svg/checkbox-checked.svg'
import checkboxIndeterminate from '@images/svg/checkbox-indeterminate.svg'
import checkboxUnchecked from '@images/svg/checkbox-unchecked.svg'
import radioChecked from '@images/svg/radio-checked.svg'
import radioUnchecked from '@images/svg/radio-unchecked.svg'

const customIcons = {
  'mdi-checkbox-blank-outline': checkboxUnchecked,
  'mdi-checkbox-marked': checkboxChecked,
  'mdi-minus-box': checkboxIndeterminate,
  'mdi-radiobox-marked': radioChecked,
  'mdi-radiobox-blank': radioUnchecked,
}

const aliases = {
  info: 'ri-user-line',
  success: 'ri-checkbox-circle-line',
  warning: 'ri-alert-line',
  error: 'ri-error-warning-line',
  calendar: 'ri-calendar-2-line',
  collapse: 'ri-arrow-up-s-line',
  complete: 'ri-check-line',
  cancel: 'ri-close-line',
  close: 'ri-close-line',
  delete: 'ri-close-circle-fill',
  clear: 'ri-close-line',
  prev: 'ri-arrow-left-s-line',
  next: 'ri-arrow-right-s-line',
  delimiter: 'ri-circle-line',
  sort: 'ri-arrow-up-line',
  expand: 'ri-arrow-down-s-line',
  menu: 'ri-menu-line',
  subgroup: 'ri-arrow-down-s-fill',
  dropdown: 'ri-arrow-down-s-line',
  edit: 'ri-pencil-line',
  ratingEmpty: 'ri-star-line',
  ratingFull: 'ri-star-fill',
  ratingHalf: 'ri-star-half-line',
  loading: 'ri-refresh-line',
  first: 'ri-skip-back-mini-line',
  last: 'ri-skip-forward-mini-line',
  unfold: 'ri-split-cells-vertical',
  file: 'ri-attachment-2',
  plus: 'ri-add-line',
  minus: 'ri-subtract-line',
  sortAsc: 'ri-arrow-up-line',
  sortDesc: 'ri-arrow-down-line',
}

/* eslint-enable */
export const iconify = {
  component: props => {
    // Load custom SVG directly instead of going through icon component
    if (typeof props.icon === 'string') {
      const iconComponent = customIcons[props.icon]
      if (iconComponent)
        return h(iconComponent)
    }

    // Convert hyphen format to colon format for Iconify
    let iconName = props.icon
    if (typeof iconName === 'string' && iconName.includes('-') && !iconName.includes(':')) {
      // Convert ri-user-line to ri:user-line
      const parts = iconName.split('-')
      if (parts.length >= 2) {
        const prefix = parts[0]
        const name = parts.slice(1).join('-')
        iconName = `${prefix}:${name}`
      }
    }

    // Use Iconify for other icons with accessibility improvements
    // Cache icon for performance
    if (!isIconCached(iconName)) {
      cacheIcon(iconName);
    }

    return h(Icon, {
      icon: iconName,
      ...props,
      // Remove used props from DOM rendering
      tag: undefined,
      // Fix accessibility issues
      'aria-hidden': props['aria-label'] || props['aria-describedby'] ? false : true,
      // Ensure focus management for interactive icons
      tabindex: props.tabindex || (props['aria-label'] ? 0 : -1),
      // Add performance optimizations
      mode: 'svg', // Force SVG mode for better performance
      onLoad: () => cacheIcon(iconName), // Cache when loaded
    })
  },
}
export const icons = {
  defaultSet: 'iconify',
  aliases,
  sets: {
    iconify,
  },
}
