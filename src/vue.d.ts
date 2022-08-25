// Temporary only when using compat

declare module 'vue' {
  import { CompatVue } from 'vue'
  const Vue: CompatVue
  export default Vue
  export * from '@vue/runtime-dom'
  const { configureCompat } = Vue
  export { configureCompat }
}

/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}
