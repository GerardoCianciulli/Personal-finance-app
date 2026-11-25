/**
 * jQuery-powered interactions for buttons, inputs, select menus, modals and the sidebar.
 *
 * React owns the data and renders the markup; these hooks attach jQuery event handlers
 * to that markup (namespaced, and removed again on unmount) to animate and drive it:
 *  - dropdowns: open/close with slide animations, outside click, keyboard navigation
 *  - modals: fade in/out, Escape and overlay click to close, focus trap, scroll lock
 *  - password fields: show/hide toggle
 *  - date fields: open the browser calendar when the field is clicked
 *  - sidebar: minimize/expand, remembered between visits
 */
import $ from 'jquery'
import { useCallback, useEffect, useLayoutEffect, useRef, type RefObject } from 'react'

let uid = 0
const nextNamespace = (name: string) => `.${name}${++uid}`

/** Keeps the latest callback in a ref so jQuery handlers never call a stale closure */
function useLatest<T>(value: T) {
  const ref = useRef(value)
  useLayoutEffect(() => {
    ref.current = value
  })
  return ref
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/* -------------------------------------------------------------------------- */
/* Dropdown (select menus, sort/filter menus and ellipsis menus)              */
/* -------------------------------------------------------------------------- */

/**
 * Expected markup inside the root element:
 *   [data-dropdown-trigger]   one or more buttons that toggle the menu
 *   [data-dropdown-menu]      the menu (hidden by CSS until opened)
 *   [data-dropdown-option]    buttons inside the menu, with data-value
 */
export function useDropdown(rootRef: RefObject<HTMLElement | null>, onSelect: (value: string) => void) {
  const onSelectRef = useLatest(onSelect)

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const ns = nextNamespace('dropdown')
    const $root = $(root)
    const $triggers = $root.find('[data-dropdown-trigger]')
    const $menu = $root.find('[data-dropdown-menu]').first()
    const options = () => $menu.find('[data-dropdown-option]:not(:disabled)')
    const isOpen = () => $root.hasClass('is-open')

    const open = () => {
      $(document).trigger('dropdown:open', [root])
      $root.addClass('is-open')
      $triggers.attr('aria-expanded', 'true')
      $menu.stop(true, true).slideDown(150)
      const $selected = options().filter('[aria-selected="true"]').first()
      ;($selected.length ? $selected : options().first()).trigger('focus')
    }

    const close = (returnFocus = false) => {
      if (!isOpen()) return
      $root.removeClass('is-open')
      $triggers.attr('aria-expanded', 'false')
      $menu.stop(true, true).slideUp(100)
      if (returnFocus) $triggers.filter(':visible').first().trigger('focus')
    }

    $triggers.on(`click${ns}`, (event) => {
      event.preventDefault()
      if (isOpen()) close()
      else open()
    })

    $menu.on(`click${ns}`, '[data-dropdown-option]', function (this: HTMLElement, event) {
      event.preventDefault()
      onSelectRef.current($(this).attr('data-value') ?? '')
      close(true)
    })

    $root.on(`keydown${ns}`, (event) => {
      const key = event.key
      if (!isOpen()) {
        if ((key === 'ArrowDown' || key === 'ArrowUp') && $(event.target).is('[data-dropdown-trigger]')) {
          event.preventDefault()
          open()
        }
        return
      }
      const $options = options()
      const index = $options.index(document.activeElement as HTMLElement)
      if (key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        close(true)
      } else if (key === 'ArrowDown') {
        event.preventDefault()
        $options.eq(Math.min(index + 1, $options.length - 1)).trigger('focus')
      } else if (key === 'ArrowUp') {
        event.preventDefault()
        $options.eq(Math.max(index - 1, 0)).trigger('focus')
      } else if (key === 'Home') {
        event.preventDefault()
        $options.first().trigger('focus')
      } else if (key === 'End') {
        event.preventDefault()
        $options.last().trigger('focus')
      } else if (key === 'Tab') {
        close()
      }
    })

    $(document).on(`mousedown${ns} touchstart${ns}`, (event) => {
      if (!root.contains(event.target as Node)) close()
    })
    $(document).on(`dropdown:open${ns}`, (_event, source: HTMLElement) => {
      if (source !== root) close()
    })

    return () => {
      $triggers.off(ns)
      $menu.off(ns)
      $root.off(ns)
      $(document).off(ns)
    }
  }, [rootRef, onSelectRef])
}

/* -------------------------------------------------------------------------- */
/* Modal                                                                       */
/* -------------------------------------------------------------------------- */

/** Returns a `requestClose` function that fades the modal out before calling onClose */
export function useModal(
  overlayRef: RefObject<HTMLElement | null>,
  dialogRef: RefObject<HTMLElement | null>,
  onClose: () => void,
) {
  const onCloseRef = useLatest(onClose)
  const closingRef = useRef(false)

  const requestClose = useCallback(() => {
    const overlay = overlayRef.current
    if (!overlay || closingRef.current) return
    closingRef.current = true
    $(overlay)
      .stop(true)
      .fadeOut(150, () => onCloseRef.current())
  }, [overlayRef, onCloseRef])

  useEffect(() => {
    const overlay = overlayRef.current
    const dialog = dialogRef.current
    if (!overlay || !dialog) return
    const ns = nextNamespace('modal')
    const previouslyFocused = document.activeElement as HTMLElement | null
    closingRef.current = false

    $('body').addClass('is-modal-open')
    $(overlay).stop(true).hide().fadeIn(200)
    const $first = $(dialog).find('input, [data-dropdown-trigger]').filter(':visible').first()
    ;($first.length ? $first : $(dialog)).trigger('focus')

    $(overlay).on(`mousedown${ns}`, (event) => {
      if (event.target === overlay) requestClose()
    })

    // Close (X) and "No, Go Back" buttons
    $(dialog).on(`click${ns}`, '[data-modal-close]', (event) => {
      event.preventDefault()
      requestClose()
    })

    $(document).on(`keydown${ns}`, (event) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        requestClose()
        return
      }
      if (event.key !== 'Tab') return
      // Keep keyboard focus inside the dialog
      const $focusable = $(dialog).find(FOCUSABLE).filter(':visible')
      if (!$focusable.length) return
      const first = $focusable.get(0)
      const last = $focusable.get($focusable.length - 1)
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last?.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first?.focus()
      }
    })

    return () => {
      $(overlay).off(ns).stop(true)
      $(dialog).off(ns)
      $(document).off(ns)
      if (!$('.modal-overlay').not(overlay).length) $('body').removeClass('is-modal-open')
      previouslyFocused?.focus?.()
    }
  }, [overlayRef, dialogRef, requestClose])

  return requestClose
}

/* -------------------------------------------------------------------------- */
/* Password visibility toggle                                                  */
/* -------------------------------------------------------------------------- */

/**
 * jQuery handles the toggle button (icon swap, aria state, focus). The input `type` is
 * reported back through `onToggle` because React re-applies an input's type on every
 * render, so React state has to own it.
 */
export function usePasswordToggle(rootRef: RefObject<HTMLElement | null>, onToggle: (visible: boolean) => void) {
  const onToggleRef = useLatest(onToggle)

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const ns = nextNamespace('password')
    const $root = $(root)
    $root.on(`click${ns}`, '[data-password-toggle]', function (this: HTMLElement) {
      const show = !$(this).hasClass('is-visible')
      $(this)
        .toggleClass('is-visible', show)
        .attr('aria-pressed', String(show))
        .attr('aria-label', show ? 'Hide password' : 'Show password')
      onToggleRef.current(show)
      $root.find('input').trigger('focus')
    })
    return () => {
      $root.off(ns)
    }
  }, [rootRef, onToggleRef])
}

/* -------------------------------------------------------------------------- */
/* Date field: open the calendar from anywhere in the field                    */
/* -------------------------------------------------------------------------- */

export function useDatePicker(rootRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const ns = nextNamespace('date')
    const $root = $(root)
    $root.on(`click${ns}`, (event) => {
      const input = $root.find('input[type="date"]').get(0) as HTMLInputElement | undefined
      if (!input) return
      if (event.target !== input) input.focus()
      try {
        input.showPicker?.()
      } catch {
        // showPicker is unavailable in some browsers or without a user gesture
      }
    })
    return () => {
      $root.off(ns)
    }
  }, [rootRef])
}

/* -------------------------------------------------------------------------- */
/* Sidebar minimize                                                            */
/* -------------------------------------------------------------------------- */

const SIDEBAR_KEY = 'personal-finance-app:sidebar-minimized'

export function useSidebarToggle(appRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const app = appRef.current
    if (!app) return
    const ns = nextNamespace('sidebar')
    const $app = $(app)
    const $button = $app.find('[data-sidebar-toggle]')

    const apply = (minimized: boolean) => {
      $app.toggleClass('is-sidebar-minimized', minimized)
      $button.attr('aria-expanded', String(!minimized))
      $button.attr('aria-label', minimized ? 'Expand menu' : 'Minimize menu')
    }

    apply(localStorage.getItem(SIDEBAR_KEY) === 'true')

    $button.on(`click${ns}`, () => {
      const minimized = !$app.hasClass('is-sidebar-minimized')
      apply(minimized)
      localStorage.setItem(SIDEBAR_KEY, String(minimized))
    })

    return () => {
      $button.off(ns)
    }
  }, [appRef])
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                     */
/* -------------------------------------------------------------------------- */

/** Smoothly scrolls an element back into view when its top is above the viewport */
export function scrollIntoViewIfNeeded(element: HTMLElement | null) {
  if (!element) return
  const offset = $(element).offset()
  if (!offset) return
  const top = offset.top - 16
  const current = $(window).scrollTop() ?? 0
  if (top < current) $('html, body').stop(true).animate({ scrollTop: top }, 250)
}
