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
  {
    path: '/fms/views',
    icon: 'CardsIcon',
    name: 'Flow Views',
    roles: ['admin', 'owner'],
  },
  {
    path: '/team',
    icon: 'TablesIcon',
    name: 'Team Management',
    roles: ['admin', 'owner'],
  },
  {
    path: '/organization/settings',
    icon: 'OutlineCogIcon',
    name: 'Organization',
    roles: ['admin', 'owner'],
  },
  {
    path: '/profile',
    icon: 'OutlinePersonIcon',
    name: 'Profile',
  },
  {
    path: '/settings',
    icon: 'OutlineCogIcon',
    name: 'Settings',
  },
]

export type { IRoute }
export default routes

