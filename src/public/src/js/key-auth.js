/* global fetch */
import Cookies from 'js-cookie'

// waits until the key icon is loaded
document.fonts.ready.then(init)

function init () {
  const urlParams = new URLSearchParams(window.location.search)
  const keyQueryParam = urlParams.get('key')
  const key = keyQueryParam || Cookies.get('key')

  checkIfKeyIsValid(key, (err, res) => {
    if (err) {
      console.error(err)
      setKeyIconSwitch('hidden')
    } else {
      if (res === 'authenticated') {
        // set key icon green
        setKeyIconSwitch('on')
      } else {
        // set key icon original color
        setKeyIconSwitch('off')
      }
    }
  })
}

function checkIfKeyIsValid (key, callback) {
  fetch('/rate_limiter_test_path', {
    method: 'GET',
    cache: 'no-cache',
    mode: 'same-origin',
    headers: { 'X-API-Key': key }
  }).then(res => {
    if (res.ok) {
      const auth = res.headers.get('X-Api-Key-Staus')
      callback(null, auth)
    } else {
      callback(Error('Error checking if key is valid', res.status))
    }
  }).catch((err) => {
    callback(Error('Error checking if key is valid', err))
  })
}

document.addEventListener('DOMContentLoaded', (event) => {
  document.querySelector('#btn_submit_key').addEventListener('click', btnSubmitKeyOnClick)
  document.querySelector('#btn_remove_key').addEventListener('click', btnRemoveKeyOnClick)

  const keyTextInput = document.getElementById('key_text_input')
  keyTextInput.addEventListener('input', event => {
    const text = event.target.value
    const style = event.target.style
    if (isKeyValid(text)) {
      style.borderWidth = 'medium'
      style.borderColor = 'green'
    } else {
      style.borderWidth = 'thin'
      style.borderColor = 'red'
    }
  })
})

function btnSubmitKeyOnClick () {
  const key = document.getElementById('key_text_input').value
  if (isKeyValid(key)) {
    checkIfKeyIsValid(key, (err, res) => {
      if (err) {
        console.error(err)
        setKeyIconSwitch('hidden')
        setSubmitResultText('Ocorreu um erro', false)
      } else {
        if (res === 'authenticated') {
          const daysToStoreCookie = parseInt(document.getElementById('key_cookie_time_period').value)
          if (daysToStoreCookie) {
            Cookies.set('key', key, { expires: daysToStoreCookie })
          } else {
            // session cookie
            Cookies.set('key', key)
          }
          setSubmitResultText('Chave inserida com sucesso', true)
          setTimeout(() => {
            setKeyIconSwitch('on')
            // close popup
            document.querySelector('#insert-key-popup .close').click()
          }, 2000)
        } else {
          setSubmitResultText('Chave não reconhecida', false)
        }
      }
    })
  } else {
    setSubmitResultText('Chave não reconhecida', false)
  }
}

function btnRemoveKeyOnClick () {
  if (Cookies.get('key')) {
    Cookies.remove('key')
    setRemoveResultText('Chave removida com sucesso', true)
  } else {
    setRemoveResultText('Chave inexistente neste navegador', false)
  }
  setTimeout(() => {
    setKeyIconSwitch('off')
    // close popup
    document.querySelector('#remove-key-popup .close').click()
  }, 2000)
}

function isKeyValid (key) {
  const regex = /^[a-z\d]{8}-[a-z\d]{4}-[a-z\d]{4}-[a-z\d]{4}-[a-z\d]{12}$/
  return Boolean(regex.exec(key))
}

function setSubmitResultText (text, success) {
  const el = document.getElementById('submit_key_result_text')
  el.innerText = text
  if (success) {
    el.style.color = 'green'
  } else {
    el.style.color = 'red'
  }
}

function setRemoveResultText (text, success) {
  const el = document.getElementById('remove_key_result_text')
  el.innerText = text
  if (success) {
    el.style.color = 'green'
  } else {
    el.style.color = 'red'
  }
}

// set color to the key icon located on the top right of the page
function setKeyIconSwitch (state) {
  const el = document.querySelector('#header_wrap .fa-key')
  switch (state) {
    case 'on':
      el.style.display = 'block'
      el.style.color = 'green'
      break
    case 'off':
      el.style.display = 'block'
      el.style.color = 'inherit'
      break
    case 'hidden':
      el.style.display = 'none'
      break
    default:
      console.error('Wrong option: ', state)
  }
}

/*
function generateUUID() {
  var d = new Date().getTime();

  if( window.performance && typeof window.performance.now === "function" ){
  d += performance.now();
  }

  var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = (d + Math.random()*16)%16 | 0;
    d = Math.floor(d/16);
    return (c=='x' ? r : (r&0x3|0x8)).toString(16);
  });

  return uuid;
}
*/
