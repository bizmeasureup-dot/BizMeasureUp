import { Link, useLocation } from 'react-router-dom'
import routes, { routeIsActive } from '@/routes/sidebar'
import * as Icons from '@/icons'
import { IIcon } from '@/icons'
import SidebarSubmenu from './SidebarSubmenu'
import { Button } from '@roketid/windmill-react-ui'
import { useAuth } from '@/context/AuthContext'
import { hasPermission } from '@/lib/rbac'

function Icon({ icon, ...props }: IIcon) {
  // @ts-ignore
  const Icon = Icons[icon]
  return <Icon {...props} />
}

interface ISidebarContent {
  linkClicked: () => void
}

function SidebarContent({ linkClicked }: ISidebarContent) {
  const location = useLocation()
  const { appUser } = useAuth()
  const appName = 'BizMeasureUp'

  // Filter routes based on user role
  const visibleRoutes = routes.filter((route) => {
    if (!route.roles || route.roles.length === 0) return true
    if (!appUser) return false
    return route.roles.includes(appUser.role)
  })

  return (
    <div className="text-gray-500 dark:text-gray-400">
      <Link to="/">
        <div className="ml-6 py-6">
          <span className="text-lg font-bold text-gray-800 dark:text-gray-200">
            {appName}
          </span>
        </div>
      </Link>
      <ul>
        {visibleRoutes.map((route) =>
          route.routes ? (
            <SidebarSubmenu route={route} key={route.name} linkClicked={linkClicked} />
          ) : (
            <li className="relative px-6 py-3" key={route.name}>
              <Link to={route.path || '#'}>
                <span
                  className={`inline-flex items-center w-full text-sm font-semibold transition-colors duration-150 hover:text-gray-800 dark:hover:text-gray-200 cursor-pointer ${
                    routeIsActive(location.pathname, route)
                      ? 'dark:text-gray-100 text-gray-800'
                      : ''
                  }`}
                  onClick={linkClicked}
                >
                  {routeIsActive(location.pathname, route) && (
                    <span
                      className="absolute inset-y-0 left-0 w-1 bg-purple-600 rounded-tr-lg rounded-br-lg"
                      aria-hidden="true"
                    ></span>
                  )}

                  <Icon
                    className="w-5 h-5"
                    aria-hidden="true"
                    icon={route.icon || ''}
                  />
                  <span className="ml-4">{route.name}</span>
                </span>
              </Link>
            </li>
          )
        )}
      </ul>
      {appUser && (
        <div className="px-6 my-6">
          <Button>
            Create account
            <span className="ml-2" aria-hidden="true">
              +
            </span>
          </Button>
        </div>
      )}
    </div>
  )
}

export default SidebarContent

