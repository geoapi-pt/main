import '../css/main.css'
import '../css/key-auth.css'
import '../css/map.css'
import '../css/footer.css'
import 'bootstrap/dist/css/bootstrap.min.css'
import 'leaflet-contextmenu/dist/leaflet.contextmenu.min.css'
import 'leaflet/dist/leaflet.css'
import 'leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.webpack.css'

import 'bootstrap'
import 'leaflet/dist/leaflet'
import 'leaflet-defaulticon-compatibility'
import 'leaflet-contextmenu/dist/leaflet.contextmenu'

// import './key-auth.js' // right now this API is fully free, hence no need to request key
import './counters.js'

import { library, dom } from '@fortawesome/fontawesome-svg-core'
import { faKey } from '@fortawesome/free-solid-svg-icons'

import * as Shareon from 'shareon'
import 'shareon/css'
Shareon.init()

library.add(faKey)
dom.watch()
