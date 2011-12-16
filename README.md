This is a simple [polyfill][] that allows browsers without support for cross-origin XMLHttpRequests to do so via `postMessage`.

The code has no dependencies and does not require JSON. A simple jQuery plugin that allows jQuery-based ajax requests to transparently use the polyfill is also available.

## Similar Projects

[pmxdr][] provides similar functionality but doesn't provide an [XMLHttpRequest API][], so it can't necessarily be used as a drop-in replacement.

  [Polyfill]: http://remysharp.com/2010/10/08/what-is-a-polyfill/
  [pmxdr]: https://github.com/eligrey/pmxdr
  [XMLHttpRequest API]: http://www.w3.org/TR/XMLHttpRequest/
