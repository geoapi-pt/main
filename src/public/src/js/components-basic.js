import '../css/main.css'
import '../css/key-popup.css'
import '../css/map.css'
import '../css/footer.css'

import 'bootstrap'
import 'bootstrap/dist/css/bootstrap.min.css'

import './key-auth.js'

import { library, dom } from '@fortawesome/fontawesome-svg-core'
import { faKey } from '@fortawesome/free-solid-svg-icons'

library.add(faKey)
dom.watch()
