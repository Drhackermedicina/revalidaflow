declare module '@/plugins/auth' {
  import { Ref } from 'vue';
  export const currentUser: Ref<any>;
}

declare module '@/plugins/firebase' {
  import type { Firestore } from 'firebase/firestore';
  export const db: any;
}

// Allow imports of .vue files in TS
declare module '*.vue' {
  import { DefineComponent } from 'vue';
  const component: DefineComponent<{}, {}, any>;
  export default component;
}
