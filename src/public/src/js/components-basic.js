import '../css/main.css'
import '../css/key-auth.css'
import '../css/map.css'
import '../css/footer.css'
import '../css/json-beauty.css'

import 'bootstrap'
import 'bootstrap/dist/css/bootstrap.min.css'

// import './key-auth.js' // right now this API is fully free, thus no need to request key
import './counters.js'

import { library, dom } from '@fortawesome/fontawesome-svg-core'
import { faKey } from '@fortawesome/free-solid-svg-icons'

library.add(faKey)
dom.watch()
