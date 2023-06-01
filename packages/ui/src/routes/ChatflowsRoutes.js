import { lazy } from 'react'

// project imports
import Loadable from 'ui-component/loading/Loadable'

// canvas routing
const Preview = Loadable(lazy(() => import('views/chatflows/preview')))

// ==============================|| CANVAS ROUTING ||============================== //

const CanvasRoutes = {
    path: '/',
    children: [
        {
            path: '/p/:chatflowid',
            element: <Preview />
        }
    ]
}

export default CanvasRoutes
