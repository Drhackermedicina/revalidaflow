import { ref } from 'vue'
import { useRouter } from 'vue-router'

export function useSimulationNavigation() {
  const router = useRouter()

  /**
   * Busca rota aninhada por nome
   */
  function findRouteByName(routes: any[], name: string): any {
    for (const route of routes) {
      if (route.name === name) return route
      if (route.children) {
        const found = findRouteByName(route.children, name)
        if (found) return found
      }
    }
    return null
  }

  /**
   * Abre página de edição em nova aba
   */
  function openEditPage(stationId: string) {
    if (stationId) {
      const routeData = router.resolve({
        path: `/app/edit-station/${stationId}`,
      })
      window.open(routeData.href, '_blank')
    }
  }

  /**
   * Gera link de convite para simulação
   */
  function generateInviteLink({
    stationId,
    sessionId,
    role,
    duration,
    candidateUid,
    candidateName,
    meetLink
  }: {
    stationId: string
    sessionId: string
    role: string
    duration: number
    candidateUid?: string
    candidateName?: string
    meetLink?: string
  }): string {
    const inviteQuery: any = {
      sessionId,
      role,
      duration
    }

    if (candidateUid) {
      inviteQuery.candidateUid = candidateUid
    }
    if (candidateName) {
      inviteQuery.candidateName = candidateName
    }
    if (meetLink) {
      inviteQuery.meet = meetLink
    }

    const routeDef = findRouteByName(router.options.routes, 'station-simulation')
    if (!routeDef) {
      throw new Error("Rota 'station-simulation' não encontrada. Verifique a configuração do roteador.")
    }

    const inviteRoute = router.resolve({
      name: 'station-simulation',
      params: { id: stationId },
      query: inviteQuery
    })

    if (!inviteRoute || !inviteRoute.href) {
      throw new Error("Falha ao resolver a rota de convite. Verifique as configurações.")
    }

    return window.location.origin + inviteRoute.href
  }

  /**
   * Navega para lista de estações
   */
  function goToStationList() {
    router.push('/app/stations')
  }

  /**
   * Navega para dashboard
   */
  function goToDashboard() {
    router.push('/app/dashboard')
  }

  /**
   * Recarrega página atual
   */
  function reloadCurrentPage() {
    window.location.reload()
  }

  /**
   * Valida se uma rota existe
   */
  function validateRoute(routeName: string): boolean {
    const route = findRouteByName(router.options.routes, routeName)
    return !!route
  }

  /**
   * Obtém URL completa para uma rota
   */
  function getFullRouteUrl(routeName: string, params: any = {}, query: any = {}): string {
    const route = router.resolve({
      name: routeName,
      params,
      query
    })
    return window.location.origin + route.href
  }

  /**
   * Função para colapsar/expandir sidebar
   */
  function toggleSidebar() {
    const wrapper = document.querySelector('.layout-wrapper')
    if (wrapper) {
      wrapper.classList.toggle('layout-vertical-nav-collapsed')
    }
  }

  /**
   * Fecha sidebar
   */
  function closeSidebar() {
    const wrapper = document.querySelector('.layout-wrapper')
    if (wrapper && !wrapper.classList.contains('layout-vertical-nav-collapsed')) {
      wrapper.classList.add('layout-vertical-nav-collapsed')
    }
  }

  /**
   * Abre sidebar
   */
  function openSidebar() {
    const wrapper = document.querySelector('.layout-wrapper')
    if (wrapper && wrapper.classList.contains('layout-vertical-nav-collapsed')) {
      wrapper.classList.remove('layout-vertical-nav-collapsed')
    }
  }

  /**
   * Navegação para modo sequencial
   */
  function navigateToSequentialStation(sequenceId: string, stationIndex: number) {
    router.push({
      name: 'SimulationView',
      params: { id: sequenceId },
      query: {
        sequential: 'true',
        sequenceId,
        index: stationIndex.toString()
      }
    })
  }

  /**
   * Gera URL para compartilhamento
   */
  function generateShareUrl(routeData: any): string {
    const route = router.resolve(routeData)
    return window.location.origin + route.href
  }

  return {
    findRouteByName,
    openEditPage,
    generateInviteLink,
    goToStationList,
    goToDashboard,
    reloadCurrentPage,
    validateRoute,
    getFullRouteUrl,
    toggleSidebar,
    closeSidebar,
    openSidebar,
    navigateToSequentialStation,
    generateShareUrl
  }
}