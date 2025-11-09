// Icon imports - these will be handled by vite-plugin-svgr
import HomeIcon from './home.svg?react'
import FormsIcon from './forms.svg?react'
import CardsIcon from './cards.svg?react'
import ChartsIcon from './charts.svg?react'
import TablesIcon from './tables.svg?react'
import ButtonsIcon from './buttons.svg?react'
import ModalsIcon from './modals.svg?react'
import PagesIcon from './pages.svg?react'
import GithubIcon from './github.svg?react'
import TwitterIcon from './twitter.svg?react'
import SearchIcon from './search.svg?react'
import MoonIcon from './moon.svg?react'
import SunIcon from './sun.svg?react'
import BellIcon from './bell.svg?react'
import MenuIcon from './menu.svg?react'
import DropdownIcon from './dropdown.svg?react'
import OutlinePersonIcon from './outlinePerson.svg?react'
import OutlineCogIcon from './outlineCog.svg?react'
import OutlineLogoutIcon from './outlineLogout.svg?react'

export {
  HomeIcon,
  FormsIcon,
  CardsIcon,
  ChartsIcon,
  TablesIcon,
  ButtonsIcon,
  ModalsIcon,
  PagesIcon,
  GithubIcon,
  TwitterIcon,
  SearchIcon,
  MoonIcon,
  SunIcon,
  BellIcon,
  MenuIcon,
  DropdownIcon,
  OutlinePersonIcon,
  OutlineCogIcon,
  OutlineLogoutIcon,
}

export interface IIcon {
  icon: string
  [key: string]: string | undefined
}

