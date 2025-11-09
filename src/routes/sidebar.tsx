/**
 * Sidebar route configuration
 */

export interface IRoute {
  path?: string
  icon?: string
  name: string
  routes?: IRoute[]
  checkActive?(pathname: string, route: IRoute): boolean
  exact?: boolean
  roles?: string[] // Optional: restrict to specific roles
}

export function routeIsActive(pathname: string, route: IRoute): boolean {
  if (route.checkActive) {
    return route.checkActive(pathname, route)
  }

  return route?.exact
    ? pathname === route?.path
    : route?.path
    ? pathname.indexOf(route.path) === 0
    : false
}

const routes: IRoute[] = [
  {
    path: '/',
    icon: 'HomeIcon',
    name: 'Dashboard',
    exact: true,
  },
  {
    path: '/delegation',
    icon: 'FormsIcon',
    name: 'Delegation',
    routes: [
      {
        path: '/delegation/tasks',
        name: 'All Tasks',
      },
      {
        path: '/delegation/tasks/new',
        name: 'Create Task',
      },
    ],
  },
  {
    path: '/checklists',
    icon: 'CardsIcon',
    name: 'Checklists',
  },
  {
    path: '/scoreboard',
    icon: 'ChartsIcon',
    name: 'Scoreboard',
  },
  {
    path: '/fms',
    icon: 'TablesIcon',
    name: 'Flow Management',
  },
]

export type { IRoute }
export default routes

