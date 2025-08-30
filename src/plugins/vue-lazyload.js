import VueLazyLoad from 'vue-lazyload'

export default function (app) {
  app.use(VueLazyLoad, {
    preLoad: 1.3,
    error: '/images/error.svg',
    loading: '/images/loading.svg',
    attempt: 1,
    observer: true,
    observerOptions: {
      rootMargin: '0px',
      threshold: 0.1
    }
  })
}
